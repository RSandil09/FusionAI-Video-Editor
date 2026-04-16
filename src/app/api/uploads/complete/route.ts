/**
 * POST /api/uploads/complete
 *
 * Called by the client after a successful direct-to-R2 PUT.
 * Saves asset metadata to the database and returns the upload record.
 *
 * Request body: { key, fileName, fileSize, contentType }
 * Response:     { success, upload }
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromAuthHeader } from "@/lib/auth/server";

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

		// Parse body
		let body: {
			key?: unknown;
			fileName?: unknown;
			fileSize?: unknown;
			contentType?: unknown;
		};
		try {
			body = await request.json();
		} catch {
			return NextResponse.json(
				{ error: "Bad Request", message: "Invalid JSON body" },
				{ status: 400 },
			);
		}

		const { key, fileName, fileSize, contentType } = body;

		if (
			typeof key !== "string" ||
			!key.trim() ||
			typeof fileName !== "string" ||
			!fileName.trim() ||
			typeof fileSize !== "number" ||
			typeof contentType !== "string"
		) {
			return NextResponse.json(
				{
					error: "Bad Request",
					message: "key, fileName, fileSize, and contentType are required",
				},
				{ status: 400 },
			);
		}

		// Validate key belongs to this user (security: prevent users saving arbitrary keys)
		if (!key.startsWith(`users/${userId}/`)) {
			return NextResponse.json(
				{ error: "Forbidden", message: "Key does not belong to this user" },
				{ status: 403 },
			);
		}

		const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

		// Validate URL format
		if (!publicUrl.includes(".r2.dev")) {
			logger.error("❌ Invalid R2 URL format:", publicUrl);
			return NextResponse.json(
				{ error: "Server configuration error", message: "Invalid R2 URL" },
				{ status: 500 },
			);
		}

		// Save asset to database
		const { createAsset, getFileType } = await import("@/lib/db/assets");

		const asset = await createAsset({
			user_id: userId,
			file_name: fileName,
			file_url: publicUrl,
			file_type: getFileType(contentType),
			content_type: contentType,
			file_size: fileSize,
			storage_key: key,
		});

		logger.log(`✅ Upload complete recorded: ${key}`);

		return NextResponse.json({
			success: true,
			upload: {
				id: asset?.id || key,
				url: publicUrl,
				fileName,
				fileSize,
				contentType,
				uploadedAt: new Date().toISOString(),
			},
		});
	} catch (error) {
		logger.error("Upload complete error:", error);
		return NextResponse.json(
			{
				error: "Internal Server Error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
