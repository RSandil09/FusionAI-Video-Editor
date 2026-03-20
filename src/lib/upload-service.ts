/**
 * Clean Upload Service for Client
 * Simplified API client for uploads
 */

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
 * Upload a file to the server
 *
 * @param file - File to upload
 * @param onProgress - Progress callback
 * @returns Upload result
 */
export async function uploadFile(
	file: File,
	onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
	console.log(
		"📤 Starting file upload:",
		file.name,
		`(${(file.size / 1024 / 1024).toFixed(2)} MB)`,
	);

	// Get fresh token (force refresh to ensure it's valid)
	const token = await getIdToken();

	if (!token) {
		const msg = "Not authenticated. Please log in to upload files.";
		console.error("❌", msg);
		throw new Error(msg);
	}

	console.log("   ✅ Got auth token (length:", token.length, ")");

	const formData = new FormData();
	formData.append("file", file);

	try {
		console.log("   🚀 Sending upload request to /api/uploads");

		const response = await axios.post("/api/uploads", formData, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
			onUploadProgress: (progressEvent) => {
				if (onProgress && progressEvent.total) {
					const loaded = progressEvent.loaded;
					const total = progressEvent.total;
					const percentage = Math.round((loaded / total) * 100);
					onProgress({ loaded, total, percentage });
				}
			},
		});

		console.log("   ✅ Upload successful!");
		return response.data.upload;
	} catch (error) {
		console.error("   ❌ Upload failed:");

		if (axios.isAxiosError(error)) {
			console.error("      Status:", error.response?.status);
			console.error(
				"      Message:",
				error.response?.data?.message || error.message,
			);
			console.error("      Error:", error.response?.data?.error);

			if (error.response?.status === 401) {
				throw new Error(
					error.response?.data?.message ||
						"Authentication failed. Please refresh the page and try again.",
				);
			}

			throw new Error(
				error.response?.data?.message || error.message || "Upload failed",
			);
		}

		throw error;
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
