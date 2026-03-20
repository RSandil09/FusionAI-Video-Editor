/**
 * Clean Cloudflare R2 Storage Client
 * Direct server-side uploads, no presigned URLs (avoids CORS issues)
 */

import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
} from "@aws-sdk/client-s3";

let r2Client: S3Client | undefined;

/**
 * Get R2 S3 client (singleton)
 */
export function getR2Client(): S3Client {
	if (r2Client) {
		return r2Client;
	}

	const accessKeyId = process.env.R2_ACCESS_KEY_ID;
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
	const endpoint = process.env.R2_ENDPOINT;

	if (!accessKeyId || !secretAccessKey || !endpoint) {
		throw new Error(
			"R2 credentials missing. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT in .env.local",
		);
	}

	r2Client = new S3Client({
		region: "auto", // Cloudflare R2 uses 'auto'
		endpoint,
		credentials: {
			accessKeyId,
			secretAccessKey,
		},
	});

	console.log("✅ R2 client initialized");
	return r2Client;
}

/**
 * Upload file buffer to R2
 *
 * @param key - Object key (path) in R2 bucket
 * @param buffer - File buffer
 * @param contentType - MIME type
 * @returns Public URL of uploaded file
 */
export async function uploadToR2(
	key: string,
	buffer: Buffer,
	contentType: string,
): Promise<string> {
	const bucketName = process.env.R2_BUCKET_NAME;
	const publicUrl = process.env.R2_PUBLIC_URL;

	if (!bucketName || !publicUrl) {
		throw new Error("R2_BUCKET_NAME and R2_PUBLIC_URL must be set");
	}

	const client = getR2Client();

	const command = new PutObjectCommand({
		Bucket: bucketName,
		Key: key,
		Body: buffer,
		ContentType: contentType,
		ContentLength: buffer.length,
	});

	await client.send(command);

	const fullUrl = `${publicUrl}/${key}`;
	console.log(`✅ Uploaded to R2: ${key} (${buffer.length} bytes)`);

	return fullUrl;
}

/**
 * Delete file from R2
 *
 * @param key - Object key to delete
 */
export async function deleteFromR2(key: string): Promise<void> {
	const bucketName = process.env.R2_BUCKET_NAME;

	if (!bucketName) {
		throw new Error("R2_BUCKET_NAME must be set");
	}

	const client = getR2Client();

	const command = new DeleteObjectCommand({
		Bucket: bucketName,
		Key: key,
	});

	await client.send(command);
	console.log(`✅ Deleted from R2: ${key}`);
}

/**
 * Generate R2 object key for a user's upload
 * Format: users/{userId}/uploads/{timestamp}-{filename}
 *
 * @param userId - User ID
 * @param filename - Original filename
 * @returns Object key
 */
export function generateUploadKey(userId: string, filename: string): string {
	const timestamp = Date.now();
	const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
	return `users/${userId}/uploads/${timestamp}-${sanitized}`;
}
