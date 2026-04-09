/**
 * Upload API Route - Single endpoint for all uploads
 * POST /api/uploads - Upload file or import from URL
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromAuthHeader } from "@/lib/auth/server";
import { uploadToR2, generateUploadKey } from "@/lib/storage/r2";
import { checkRateLimit } from "@/lib/rate-limit";
import { urlImportSchema, parseBody } from "@/lib/api-validation";
import axios from "axios";

const RATE_LIMIT = 50;
const RATE_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST /api/uploads
 *
 * Handles both:
 * 1. File uploads via FormData (multipart/form-data)
 * 2. URL imports via JSON ({ url: string })
 * Rate limit: 50 requests/hour per user.
 */
export async function POST(request: NextRequest) {
	try {
		// Step 1: Authenticate user
		const authHeader = request.headers.get("authorization");
		let userId: string;

		try {
			userId = await getUserFromAuthHeader(authHeader);
		} catch (authError) {
			return NextResponse.json(
				{
					error: "Unauthorized",
					message:
						authError instanceof Error ? authError.message : "Invalid token",
				},
				{ status: 401 },
			);
		}

		const rl = checkRateLimit(`uploads:${userId}`, RATE_LIMIT, RATE_WINDOW_MS);
		if (!rl.success) {
			return NextResponse.json(
				{ error: "Rate limit exceeded. Try again later." },
				{ status: 429, headers: { "Retry-After": String(rl.resetIn) } },
			);
		}

		// Step 2: Determine if file upload or URL import
		const contentType = request.headers.get("content-type") || "";

		if (contentType.includes("multipart/form-data")) {
			// File upload
			return await handleFileUpload(request, userId);
		} else if (contentType.includes("application/json")) {
			// URL import
			return await handleUrlImport(request, userId);
		} else {
			return NextResponse.json(
				{
					error: "Bad Request",
					message:
						"Content-Type must be multipart/form-data or application/json",
				},
				{ status: 400 },
			);
		}
	} catch (error) {
		console.error("Upload error:", error);

		return NextResponse.json(
			{
				error: "Internal Server Error",
				message: error instanceof Error ? error.message : "Unknown error",
				...(process.env.NODE_ENV === "development" && {
					stack: error instanceof Error ? error.stack : undefined,
				}),
			},
			{ status: 500 },
		);
	}
}

/**
 * Handle file upload from FormData
 */
async function handleFileUpload(
	request: NextRequest,
	userId: string,
): Promise<NextResponse> {
	const formData = await request.formData();
	const file = formData.get("file") as File;

	if (!file) {
		return NextResponse.json(
			{ error: "Bad Request", message: "File is required" },
			{ status: 400 },
		);
	}

	// Convert File to Buffer
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);

	// Enforce 500 MB upload size limit
	const MAX_FILE_SIZE = 500 * 1024 * 1024;
	if (buffer.length > MAX_FILE_SIZE) {
		return NextResponse.json(
			{ error: "File too large", message: "Maximum upload size is 500 MB" },
			{ status: 413 },
		);
	}

	// Validate MIME type against allowlist (file.type is client-controlled — use it only for the DB record,
	// but block obviously dangerous types here)
	const ALLOWED_MIME_PREFIXES = ["video/", "image/", "audio/"];
	const clientType = file.type.toLowerCase().split(";")[0].trim();
	if (!ALLOWED_MIME_PREFIXES.some((p) => clientType.startsWith(p))) {
		return NextResponse.json(
			{ error: "Unsupported file type", message: "Only video, image, and audio files are allowed" },
			{ status: 415 },
		);
	}

	// Generate R2 key and upload
	const key = generateUploadKey(userId, file.name);
	const url = await uploadToR2(key, buffer, file.type);

	// CRITICAL: Validate URL before saving to database
	console.log("📝 Upload URL:", url);
	if (!url.includes(".r2.dev")) {
		console.error("❌ Invalid R2 URL format:", url);
		throw new Error(`Invalid R2 URL: ${url}`);
	}
	if (url.includes("fcr2.dev")) {
		console.error("❌ Malformed R2 URL detected (missing dot):", url);
		throw new Error(
			`Malformed R2 URL - check R2_PUBLIC_URL environment variable`,
		);
	}

	// Save asset metadata to database
	const { createAsset, getFileType } = await import("@/lib/db/assets");

	const asset = await createAsset({
		user_id: userId,
		file_name: file.name,
		file_url: url,
		file_type: getFileType(file.type),
		content_type: file.type,
		file_size: buffer.length,
		storage_key: key,
	});

	return NextResponse.json({
		success: true,
		upload: {
			id: asset?.id || key,
			url,
			fileName: file.name,
			fileSize: buffer.length,
			contentType: file.type,
			uploadedAt: new Date().toISOString(),
		},
	});
}

/**
 * Handle URL import - download and upload to R2
 */
async function handleUrlImport(
	request: NextRequest,
	userId: string,
): Promise<NextResponse> {
	let rawBody: unknown;
	try {
		rawBody = await request.json();
	} catch {
		return NextResponse.json(
			{ error: "Bad Request", message: "Invalid JSON body" },
			{ status: 400 },
		);
	}
	const parsed = parseBody(rawBody, urlImportSchema);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Bad Request", message: parsed.error },
			{ status: 400 },
		);
	}
	const { url } = parsed.data;

	// SSRF protection — block private/internal IP ranges
	try {
		const parsed_url = new URL(url);
		const hostname = parsed_url.hostname.toLowerCase();
		const BLOCKED = [
			/^localhost$/,
			/^127\./,
			/^10\./,
			/^172\.(1[6-9]|2\d|3[01])\./,
			/^192\.168\./,
			/^169\.254\./,  // link-local / AWS metadata
			/^::1$/,
			/^fc00:/,
			/^fe80:/,
		];
		if (BLOCKED.some((r) => r.test(hostname))) {
			return NextResponse.json(
				{ error: "URL not allowed", message: "Requests to internal addresses are blocked" },
				{ status: 400 },
			);
		}
	} catch {
		return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
	}

	// Download file from URL with a 200 MB size cap
	const MAX_IMPORT_SIZE = 200 * 1024 * 1024;
	const response = await axios.get(url, {
		responseType: "arraybuffer",
		timeout: 60000,
		maxContentLength: MAX_IMPORT_SIZE,
		maxBodyLength: MAX_IMPORT_SIZE,
	});

	const buffer = Buffer.from(response.data);
	if (buffer.length > MAX_IMPORT_SIZE) {
		return NextResponse.json(
			{ error: "File too large", message: "Maximum import size is 200 MB" },
			{ status: 413 },
		);
	}
	const contentType =
		response.headers["content-type"] || "application/octet-stream";

	// Extract filename from URL
	const urlParts = new URL(url);
	const pathSegments = urlParts.pathname.split("/");
	const filename = pathSegments[pathSegments.length - 1] || "imported-file";

	// Generate R2 key and upload
	const key = generateUploadKey(userId, filename);
	const uploadUrl = await uploadToR2(key, buffer, contentType);

	// Save asset metadata to database
	const { createAsset, getFileType } = await import("@/lib/db/assets");

	const asset = await createAsset({
		user_id: userId,
		file_name: filename,
		file_url: uploadUrl,
		file_type: getFileType(contentType),
		content_type: contentType,
		file_size: buffer.length,
		storage_key: key,
	});

	return NextResponse.json({
		success: true,
		upload: {
			id: asset?.id || key,
			url: uploadUrl,
			fileName: filename,
			fileSize: buffer.length,
			contentType,
			sourceUrl: url,
			uploadedAt: new Date().toISOString(),
		},
	});
}
