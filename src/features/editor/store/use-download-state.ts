import { IDesign } from "@designcombo/types";
import { create } from "zustand";
import { getIdToken } from "@/lib/auth/client";

interface Output {
	url: string;
	type: string;
}

interface DownloadState {
	projectId: string;
	exporting: boolean;
	exportType: "json" | "mp4";
	progress: number;
	output?: Output;
	payload?: IDesign;
	displayProgressModal: boolean;
	error?: string;
	actions: {
		setProjectId: (projectId: string) => void;
		setExporting: (exporting: boolean) => void;
		setExportType: (exportType: "json" | "mp4") => void;
		setProgress: (progress: number) => void;
		setState: (state: Partial<DownloadState>) => void;
		setOutput: (output: Output) => void;
		startExport: () => void;
		setDisplayProgressModal: (displayProgressModal: boolean) => void;
		clearError: () => void;
	};
}

export const useDownloadState = create<DownloadState>((set, get) => ({
	projectId: "",
	exporting: false,
	exportType: "mp4",
	progress: 0,
	displayProgressModal: false,
	error: undefined,
	actions: {
		setProjectId: (projectId) => set({ projectId }),
		setExporting: (exporting) => set({ exporting }),
		setExportType: (exportType) => set({ exportType }),
		setProgress: (progress) => set({ progress }),
		setState: (state) => set({ ...state }),
		setOutput: (output) => set({ output }),
		setDisplayProgressModal: (displayProgressModal) =>
			set({ displayProgressModal }),
		clearError: () => set({ error: undefined }),
		startExport: async () => {
			try {
				set({
					exporting: true,
					displayProgressModal: true,
					error: undefined,
					progress: 0,
					output: undefined,
				});

				const { payload, projectId } = get();

				if (!payload) {
					console.error("❌ Payload is not defined in download state!");
					throw new Error("Payload is not defined");
				}

				if (!projectId) {
					console.warn("⚠️ ProjectId is not defined in download state!");
				}

				// Get auth token
				const token = await getIdToken();
				if (!token) {
					throw new Error("Not authenticated. Please log in to export.");
				}

				const requestBody = {
					projectId: projectId,
					design: payload,
					options: {
						fps: 30,
						size: payload.size,
						format: "mp4",
					},
				};

				// Step 1: POST to start rendering
				const response = await fetch(`/api/render`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(requestBody),
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					console.error(
						"❌ Export request failed:",
						response.status,
						errorData,
					);
					throw new Error(
						errorData.message ||
							`Failed to submit export request (${response.status})`,
					);
				}

				const jobInfo = await response.json();
				const jobId = jobInfo.renderId;

				if (!jobId) {
					console.error("❌ No renderId in response:", jobInfo);
					throw new Error("Render job created but no renderId returned");
				}

				// Step 2: Poll for status

				const checkStatus = async () => {
					try {
						// Refresh token for each poll (token could expire during long renders)
						const pollToken = await getIdToken();

						const statusResponse = await fetch(`/api/render/${jobId}`, {
							headers: {
								"Content-Type": "application/json",
								...(pollToken ? { Authorization: `Bearer ${pollToken}` } : {}),
							},
						});

						if (!statusResponse.ok) {
							throw new Error(
								`Failed to fetch export status (${statusResponse.status}).`,
							);
						}

						const statusInfo = await statusResponse.json();
						const {
							status,
							progress,
							videoUrl: url,
							error: renderError,
						} = statusInfo;

						set({ progress: progress ?? 0 });

						if (status === "COMPLETED") {
							set({
								exporting: false,
								output: { url, type: get().exportType },
							});
						} else if (status === "FAILED") {
							console.error("❌ Render failed:", renderError);
							set({
								exporting: false,
								error:
									renderError ||
									"Render failed on the server. Check server logs.",
							});
						} else if (status === "PROCESSING" || status === "PENDING") {
							// Still in progress — poll again in 2.5s
							setTimeout(checkStatus, 2500);
						} else {
							// Unknown status — stop polling to prevent infinite loop
							console.warn("⚠️ Unknown render status:", status);
							set({
								exporting: false,
								error: `Unexpected render status: ${status}`,
							});
						}
					} catch (pollError) {
						const msg =
							pollError instanceof Error
								? pollError.message
								: String(pollError);
						console.error("❌ Polling error:", msg);
						set({ exporting: false, error: msg });
					}
				};

				checkStatus();
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				console.error("❌ Export error:", msg);
				set({ exporting: false, error: msg });
			}
		},
	},
}));
