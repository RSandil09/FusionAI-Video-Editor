/**
 * Clean Upload Store
 * Manages upload state with proper typing and no export/import bugs
 */

import { create } from "zustand";
import { uploadFile, importFromUrl, UploadResult } from "@/lib/upload-service";

export interface UploadItem {
	id: string;
	file?: File;
	url?: string; // For URL imports
	fileName: string;
	fileSize?: number;
	status: "pending" | "uploading" | "uploaded" | "failed";
	progress: number;
	error?: string;
	result?: UploadResult;
}

interface UploadStore {
	// Upload queue
	uploads: UploadItem[];

	// Modal state
	showUploadModal: boolean;
	setShowUploadModal: (show: boolean) => void;

	// Add files to upload queue
	addUploads: (files: File[]) => void;

	// Add URL to import queue
	addUrlImport: (url: string) => void;

	// Start processing uploads
	processUploads: () => Promise<void>;

	// Load user assets from database
	loadUserAssets: () => Promise<void>;

	// Update upload progress
	updateProgress: (id: string, progress: number) => void;

	// Update upload status
	updateStatus: (
		id: string,
		status: UploadItem["status"],
		error?: string,
		result?: UploadResult,
	) => void;

	// Remove upload from queue
	removeUpload: (id: string) => void;

	// Clear all uploads
	clearUploads: () => void;

	// Get completed uploads
	getCompletedUploads: () => UploadResult[];
}

export const useUploadStore = create<UploadStore>()((set, get) => ({
	uploads: [],

	showUploadModal: false,
	setShowUploadModal: (show: boolean) => set({ showUploadModal: show }),

	addUploads: (files: File[]) => {
		const newUploads: UploadItem[] = files.map((file) => ({
			id: crypto.randomUUID(),
			file,
			fileName: file.name,
			fileSize: file.size,
			status: "pending",
			progress: 0,
		}));

		set((state) => ({
			uploads: [...state.uploads, ...newUploads],
		}));
	},

	addUrlImport: (url: string) => {
		const upload: UploadItem = {
			id: crypto.randomUUID(),
			url,
			fileName: url.split("/").pop() || "imported-file",
			status: "pending",
			progress: 0,
		};

		set((state) => ({
			uploads: [...state.uploads, upload],
		}));
	},

	processUploads: async () => {
		const { uploads } = get();
		const pending = uploads.filter((u) => u.status === "pending");

		for (const upload of pending) {
			// Mark as uploading
			get().updateStatus(upload.id, "uploading");

			try {
				let result: UploadResult;

				if (upload.file) {
					// File upload
					result = await uploadFile(upload.file, (progress) => {
						get().updateProgress(upload.id, progress.percentage);
					});
				} else if (upload.url) {
					// URL import
					result = await importFromUrl(upload.url);
					get().updateProgress(upload.id, 100);
				} else {
					throw new Error("Upload must have file or URL");
				}

				// Mark as uploaded
				get().updateStatus(upload.id, "uploaded", undefined, result);
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Upload failed";
				get().updateStatus(upload.id, "failed", errorMessage);
				console.error("Upload failed:", error);
			}
		}
	},

	loadUserAssets: async () => {
		try {
			// Import getAssets function
			const { getAssets } = await import("@/lib/db/assets");
			const { getCurrentUser } = await import("@/lib/auth/client");

			// Get current user
			const user = await getCurrentUser();
			if (!user) {
				return;
			}

			// Fetch assets from database
			const assets = await getAssets(user.uid);

			// Convert assets to UploadItem format
			const uploadItems: UploadItem[] = assets.map((asset) => {
				// CRITICAL FIX: Repair malformed URLs from database
				let repairedUrl = asset.file_url;

				// Fix 1: Repair malformed URLs with 'fcr2.dev' instead of 'fc.r2.dev'
				if (repairedUrl && repairedUrl.includes("fcr2.dev")) {
					console.warn(
						`⚠️ Repairing malformed URL (fcr2.dev) for ${asset.file_name}`,
					);
					repairedUrl = repairedUrl.replace("fcr2.dev", "fc.r2.dev");
				}

				// Fix 2: Replace old bucket domain with new bucket domain
				const OLD_BUCKET =
					"https://pub-2e8bcda7a87648b29243bae54dc6411c.r2.dev";
				const NEW_BUCKET =
					"https://pub-760dc7f0a82e481197568d0a306385c6.r2.dev";

				if (repairedUrl && repairedUrl.startsWith(OLD_BUCKET)) {
					console.warn(`⚠️ Updating old bucket URL for ${asset.file_name}`);
					repairedUrl = repairedUrl.replace(OLD_BUCKET, NEW_BUCKET);
				}

				// Fix 3: Proxy media through Next.js API to add CORS headers
				// Use image-proxy for images, video-proxy for videos
				if (repairedUrl && repairedUrl.includes(".r2.dev")) {
					const isVideo =
						asset.content_type?.startsWith("video/") ||
						/\.(mp4|webm|mov|avi|mkv)$/i.test(asset.file_name);
					if (isVideo) {
						const proxiedUrl = `/api/video-proxy?url=${encodeURIComponent(repairedUrl)}`;
						repairedUrl = proxiedUrl;
					} else {
						const proxiedUrl = `/api/image-proxy?url=${encodeURIComponent(repairedUrl)}`;
						repairedUrl = proxiedUrl;
					}
				}

				return {
					id: asset.id,
					fileName: asset.file_name,
					fileSize: asset.file_size,
					status: "uploaded" as const,
					progress: 100,
					result: {
						id: asset.id,
						url: repairedUrl, // Use repaired URL
						fileName: asset.file_name,
						fileSize: asset.file_size,
						contentType: asset.content_type,
						uploadedAt: asset.uploaded_at,
					},
				};
			});

			// Set uploads in store
			set({ uploads: uploadItems });
		} catch (error) {
			console.error("Failed to load user assets:", error);
		}
	},

	updateProgress: (id: string, progress: number) => {
		set((state) => ({
			uploads: state.uploads.map((u) => (u.id === id ? { ...u, progress } : u)),
		}));
	},

	updateStatus: (id, status, error, result) => {
		set((state) => ({
			uploads: state.uploads.map((u) =>
				u.id === id ? { ...u, status, error, result } : u,
			),
		}));
	},

	removeUpload: (id: string) => {
		set((state) => ({
			uploads: state.uploads.filter((u) => u.id !== id),
		}));
	},

	clearUploads: () => {
		set({ uploads: [] });
	},

	getCompletedUploads: () => {
		const { uploads } = get();
		return uploads
			.filter((u) => u.status === "uploaded" && u.result)
			.map((u) => u.result!);
	},
}));

export default useUploadStore;
