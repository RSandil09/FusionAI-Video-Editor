import { IDesign } from "@designcombo/types";
import { create } from "zustand";
import { getIdToken } from "@/lib/auth/client";

export type ExportFormat = "mp4" | "mp4-hevc" | "webm" | "gif" | "json";

interface Output {
	url: string;
	type: string;
}

interface DownloadState {
	projectId: string;
	exporting: boolean;
	exportType: ExportFormat;
	progress: number;
	output?: Output;
	payload?: IDesign;
	displayProgressModal: boolean;
	error?: string;
	currentRenderId?: string;
	actions: {
		setProjectId: (projectId: string) => void;
		setExporting: (exporting: boolean) => void;
		setExportType: (exportType: ExportFormat) => void;
		setProgress: (progress: number) => void;
		setState: (state: Partial<DownloadState>) => void;
		setOutput: (output: Output) => void;
		startExport: () => void;
		cancelExport: () => Promise<void>;
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
		cancelExport: async () => {
			const { currentRenderId } = get();
			if (!currentRenderId) {
				set({ exporting: false, displayProgressModal: false });
				return;
			}
			try {
				const token = await getIdToken();
				await fetch(`/api/render/${currentRenderId}`, {
					method: "DELETE",
					headers: token ? { Authorization: `Bearer ${token}` } : {},
				});
			} catch {
				// best-effort
			}
			set({
				exporting: false,
				displayProgressModal: false,
				currentRenderId: undefined,
				error: undefined,
				progress: 0,
			});
		},
		startExport: async () => {
			try {
				set({
					exporting: true,
					displayProgressModal: true,
					error: undefined,
					progress: 0,
					output: undefined,
				});

				const { payload, projectId, exportType } = get();

				if (!payload) {
					throw new Error("Payload is not defined");
				}

				// JSON export — no render needed, just download the state
				if (exportType === "json") {
					const blob = new Blob([JSON.stringify(payload, null, 2)], {
						type: "application/json",
					});
					const url = URL.createObjectURL(blob);
					set({
						exporting: false,
						output: { url, type: "json" },
					});
					return;
				}

				const token = await getIdToken();
				if (!token) {
					throw new Error("Not authenticated. Please log in to export.");
				}

				const requestBody = {
					projectId,
					design: payload,
					options: {
						fps: 30,
						size: payload.size,
						format: exportType,
					},
				};

				const response = await fetch("/api/render", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(requestBody),
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(
						errorData.message ||
							`Failed to submit export request (${response.status})`,
					);
				}

				const jobInfo = await response.json();
				const jobId = jobInfo.renderId;

				if (!jobId) {
					throw new Error("Render job created but no renderId returned");
				}

				set({ currentRenderId: jobId });

				const checkStatus = async () => {
					try {
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
						const { status, progress, videoUrl: url, error: renderError } = statusInfo;

						set({ progress: progress ?? 0 });

						if (status === "COMPLETED") {
							set({
								exporting: false,
								output: { url, type: exportType },
							});
						} else if (status === "FAILED") {
							set({
								exporting: false,
								error: renderError || "Render failed on the server.",
							});
						} else if (status === "PROCESSING" || status === "PENDING") {
							setTimeout(checkStatus, 5000);
						} else {
							set({
								exporting: false,
								error: `Unexpected render status: ${status}`,
							});
						}
					} catch (pollError) {
						const msg =
							pollError instanceof Error ? pollError.message : String(pollError);
						set({ exporting: false, error: msg });
					}
				};

				checkStatus();
			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				set({ exporting: false, error: msg });
			}
		},
	},
}));
