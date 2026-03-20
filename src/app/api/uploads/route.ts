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

	// Download file from URL
	const response = await axios.get(url, {
		responseType: "arraybuffer",
		timeout: 60000, // 60 second timeout
	});

	const buffer = Buffer.from(response.data);
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
