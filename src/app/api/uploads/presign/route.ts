/**
 * POST /api/uploads/presign
 *
 * Returns a presigned PUT URL so the browser can upload directly to R2,
 * bypassing Vercel's 4.5 MB serverless body limit entirely.
 *
 * Request body: { fileName: string, fileSize: number, contentType: string }
 * Response:     { presignedUrl, key, publicUrl }
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromAuthHeader } from "@/lib/auth/server";
import { getPresignedUploadUrl, generateUploadKey } from "@/lib/storage/r2";
import { checkRateLimit } from "@/lib/rate-limit";

const RATE_LIMIT = 50;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const ALLOWED_MIME_PREFIXES = ["video/", "image/", "audio/"];

export async function POST(request: NextRequest) {
	try {
		// Authenticate
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

		// Rate limit
		const rl = await checkRateLimit(
			`uploads:${userId}`,
			RATE_LIMIT,
			RATE_WINDOW_MS,
		);
		if (!rl.success) {
			return NextResponse.json(
				{ error: "Rate limit exceeded. Try again later." },
				{ status: 429, headers: { "Retry-After": String(rl.resetIn) } },
			);
		}

		// Parse and validate body
		let body: { fileName?: unknown; fileSize?: unknown; contentType?: unknown };
		try {
			body = await request.json();
		} catch {
			return NextResponse.json(
				{ error: "Bad Request", message: "Invalid JSON body" },
				{ status: 400 },
			);
		}

		const { fileName, fileSize, contentType } = body;

		if (
			typeof fileName !== "string" ||
			!fileName.trim() ||
			typeof fileSize !== "number" ||
			typeof contentType !== "string"
		) {
			return NextResponse.json(
				{
					error: "Bad Request",
					message: "fileName (string), fileSize (number), and contentType (string) are required",
				},
				{ status: 400 },
			);
		}

		// Validate size
		if (fileSize > MAX_FILE_SIZE) {
			return NextResponse.json(
				{ error: "File too large", message: "Maximum upload size is 500 MB" },
				{ status: 413 },
			);
		}

		// Validate MIME type
		const normalizedType = contentType.toLowerCase().split(";")[0].trim();
		if (!ALLOWED_MIME_PREFIXES.some((p) => normalizedType.startsWith(p))) {
			return NextResponse.json(
				{
					error: "Unsupported file type",
					message: "Only video, image, and audio files are allowed",
				},
				{ status: 415 },
			);
		}

		// Generate key and presigned URL
		const key = generateUploadKey(userId, fileName);
		const presignedUrl = await getPresignedUploadUrl(key, contentType);

		const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

		logger.log(`✅ Presign issued for user ${userId}: ${key}`);

		return NextResponse.json({ presignedUrl, key, publicUrl });
	} catch (error) {
		logger.error("Presign error:", error);
		return NextResponse.json(
			{
				error: "Internal Server Error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
