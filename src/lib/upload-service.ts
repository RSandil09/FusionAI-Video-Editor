/**
 * Clean Upload Service for Client
 * Simplified API client for uploads
 */

import { logger } from "@/lib/logger";
import axios from "axios";
import { getIdToken } from "@/lib/auth/client";

export interface UploadResult {
	id: string;
	url: string;
	fileName: string;
	fileSize: number;
	contentType: string;
	uploadedAt: string;
}

export interface UploadProgress {
	loaded: number;
	total: number;
	percentage: number;
}

/**
 * Upload a file to R2 via presigned URL (bypasses Vercel 4.5 MB body limit).
 *
 * Flow:
 *  1. POST /api/uploads/presign  → get presignedUrl + key + publicUrl
 *  2. PUT directly to R2         → browser uploads straight to R2
 *  3. POST /api/uploads/complete → save metadata to DB
 *
 * @param file - File to upload
 * @param onProgress - Progress callback
 * @returns Upload result
 */
export async function uploadFile(
	file: File,
	onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
	logger.log(
		"📤 Starting file upload:",
		file.name,
		`(${(file.size / 1024 / 1024).toFixed(2)} MB)`,
	);

	const token = await getIdToken();
	if (!token) {
		const msg = "Not authenticated. Please log in to upload files.";
		logger.error("❌", msg);
		throw new Error(msg);
	}

	logger.log("   ✅ Got auth token (length:", token.length, ")");

	// Step 1: Get presigned URL
	logger.log("   🔑 Requesting presigned URL...");
	let presignedUrl: string;
	let key: string;
	let publicUrl: string;

	try {
		const presignRes = await axios.post(
			"/api/uploads/presign",
			{
				fileName: file.name,
				fileSize: file.size,
				contentType: file.type,
			},
			{ headers: { Authorization: `Bearer ${token}` } },
		);
		presignedUrl = presignRes.data.presignedUrl;
		key = presignRes.data.key;
		publicUrl = presignRes.data.publicUrl;
	} catch (error) {
		if (axios.isAxiosError(error)) {
			const status = error.response?.status;
			const message = error.response?.data?.message || error.message;
			if (status === 401) throw new Error("Authentication failed. Please refresh the page and try again.");
			if (status === 413) throw new Error("File too large. Maximum upload size is 500 MB.");
			if (status === 415) throw new Error("Unsupported file type. Only video, image, and audio files are allowed.");
			throw new Error(message || "Failed to get upload URL");
		}
		throw error;
	}

	// Step 2: PUT directly to R2 (no Vercel in the path)
	logger.log("   🚀 Uploading directly to R2...");
	await new Promise<void>((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open("PUT", presignedUrl);
		xhr.setRequestHeader("Content-Type", file.type);
		// Must match the CacheControl in the presigned PutObjectCommand — R2 stores
		// this as object metadata so Cloudflare CDN caches it at the edge after first access.
		xhr.setRequestHeader("Cache-Control", "public, max-age=31536000, immutable");

		xhr.upload.onprogress = (e) => {
			if (onProgress && e.lengthComputable) {
				const loaded = e.loaded;
				const total = e.total;
				const percentage = Math.round((loaded / total) * 100);
				onProgress({ loaded, total, percentage });
			}
		};

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				resolve();
			} else {
				reject(new Error(`R2 upload failed with status ${xhr.status}`));
			}
		};

		xhr.onerror = () => reject(new Error("Network error during upload"));
		xhr.onabort = () => reject(new Error("Upload aborted"));

		xhr.send(file);
	});

	logger.log("   ✅ File uploaded to R2!");

	// Step 3: Save metadata to DB
	logger.log("   💾 Recording upload metadata...");
	try {
		const completeRes = await axios.post(
			"/api/uploads/complete",
			{
				key,
				fileName: file.name,
				fileSize: file.size,
				contentType: file.type,
			},
			{ headers: { Authorization: `Bearer ${token}` } },
		);

		logger.log("   ✅ Upload complete!");
		return completeRes.data.upload;
	} catch (error) {
		// Metadata save failed but the file is already in R2.
		// Return a best-effort result so the user's session isn't broken.
		logger.error("   ⚠️ Metadata save failed (file is in R2):", error);
		return {
			id: key,
			url: publicUrl,
			fileName: file.name,
			fileSize: file.size,
			contentType: file.type,
			uploadedAt: new Date().toISOString(),
		};
	}
}

/**
 * Import file from URL
 *
 * @param url - URL to import from
 * @returns Upload result
 */
export async function importFromUrl(url: string): Promise<UploadResult> {
	const token = await getIdToken();

	if (!token) {
		throw new Error("Not authenticated. Please log in to import files.");
	}

	try {
		const response = await axios.post(
			"/api/uploads",
			{ url },
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			},
		);

		return response.data.upload;
	} catch (error) {
		if (axios.isAxiosError(error) && error.response?.status === 401) {
			throw new Error("Authentication failed. Please log in again.");
		}
		throw error;
	}
}

/**
 * Upload multiple files
 *
 * @param files - Files to upload
 * @param onProgress - Progress callback for each file
 * @returns Array of upload results
 */
export async function uploadFiles(
	files: File[],
	onProgress?: (fileIndex: number, progress: UploadProgress) => void,
): Promise<UploadResult[]> {
	const results: UploadResult[] = [];

	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const result = await uploadFile(file, (progress) => {
			onProgress?.(i, progress);
		});
		results.push(result);
	}

	return results;
}
