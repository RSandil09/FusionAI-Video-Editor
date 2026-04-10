"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getIdToken } from "@/lib/auth/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Orientation = "portrait" | "landscape";

interface UploadedAsset {
	/** Local preview URL (object URL) */
	preview: string;
	/** R2 public URL returned by /api/uploads */
	url: string;
	type: "video" | "image" | "audio";
	name: string;
	durationMs?: number;
	width?: number;
	height?: number;
	/** upload state */
	status: "uploading" | "done" | "error";
	progress: number; // 0-100
	error?: string;
}

interface NewProjectModalProps {
	isOpen: boolean;
	onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mimeToAssetType(mime: string): "video" | "image" | "audio" | null {
	if (mime.startsWith("video/")) return "video";
	if (mime.startsWith("image/")) return "image";
	if (mime.startsWith("audio/")) return "audio";
	return null;
}

/** Read natural dimensions from a video or image file */
function readMediaMeta(
	file: File,
	type: "video" | "image" | "audio",
): Promise<{ width?: number; height?: number; durationMs?: number }> {
	return new Promise((resolve) => {
		if (type === "image") {
			const img = new Image();
			const url = URL.createObjectURL(file);
			img.onload = () => {
				URL.revokeObjectURL(url);
				resolve({ width: img.naturalWidth, height: img.naturalHeight });
			};
			img.onerror = () => {
				URL.revokeObjectURL(url);
				resolve({});
			};
			img.src = url;
		} else if (type === "video" || type === "audio") {
			const el = document.createElement(
				type === "video" ? "video" : "audio",
			) as HTMLVideoElement;
			const url = URL.createObjectURL(file);
			el.preload = "metadata";
			el.onloadedmetadata = () => {
				URL.revokeObjectURL(url);
				resolve({
					durationMs: Math.round(el.duration * 1000),
					width: (el as HTMLVideoElement).videoWidth || undefined,
					height: (el as HTMLVideoElement).videoHeight || undefined,
				});
			};
			el.onerror = () => {
				URL.revokeObjectURL(url);
				resolve({});
			};
			el.src = url;
		} else {
			resolve({});
		}
	});
}

// ─── Loading steps shown during generation ────────────────────────────────────

const LOADING_STEPS = [
	"Analysing your content with AI…",
	"Detecting scene cuts…",
	"Arranging clips on the timeline…",
	"Applying smart pacing…",
	"Finalising your project…",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewProjectModal({
	isOpen,
	onClose,
}: NewProjectModalProps) {
	const router = useRouter();

	// Step: 1 = upload, 2 = settings, 3 = generating
	const [step, setStep] = useState<1 | 2 | 3>(1);

	// Step 1
	const [projectName, setProjectName] = useState("");
	const [assets, setAssets] = useState<UploadedAsset[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Step 2
	const [orientation, setOrientation] = useState<Orientation>("portrait");

	// Step 3
	const [loadingStep, setLoadingStep] = useState(0);

	// AI name suggestions
	const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
	const [loadingSuggestions, setLoadingSuggestions] = useState(false);
	const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// ── Reset on close ──────────────────────────────────────────────────────────
	const handleClose = () => {
		if (step === 3) return; // don't allow close during generation
		setStep(1);
		setProjectName("");
		setAssets([]);
		setOrientation("portrait");
		setLoadingStep(0);
		setNameSuggestions([]);
		onClose();
	};

	// ── AI name suggestions ─────────────────────────────────────────────────────
	// Trigger whenever done assets change and user hasn't typed a name yet
	useEffect(() => {
		const doneNames = assets
			.filter((a) => a.status === "done" || a.status === "uploading")
			.map((a) => a.name);
		if (doneNames.length === 0) {
			setNameSuggestions([]);
			return;
		}

		if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
		suggestDebounceRef.current = setTimeout(async () => {
			setLoadingSuggestions(true);
			try {
				const token = await getIdToken();
				const res = await fetch("/api/projects/suggest-name", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: JSON.stringify({ filenames: doneNames }),
				});
				if (res.ok) {
					const { suggestions } = await res.json();
					setNameSuggestions(suggestions ?? []);
				}
			} catch {
				// silently ignore — suggestions are optional
			} finally {
				setLoadingSuggestions(false);
			}
		}, 800);
		return () => {
			if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
		};
	}, [assets]);

	// ── File upload ─────────────────────────────────────────────────────────────
	const uploadFile = useCallback(async (file: File) => {
		const assetType = mimeToAssetType(file.type);
		if (!assetType) {
			toast.error(`Unsupported file type: ${file.type}`);
			return;
		}

		const preview = URL.createObjectURL(file);
		const meta = await readMediaMeta(file, assetType);

		const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
		const placeholder: UploadedAsset = {
			preview,
			url: "",
			type: assetType,
			name: file.name,
			status: "uploading",
			progress: 0,
			...meta,
		};

		setAssets((prev) => [...prev, { ...placeholder, _id: id } as any]);

		try {
			const token = await getIdToken();
			const formData = new FormData();
			formData.append("file", file);

			// Use XMLHttpRequest for upload progress
			const result = await new Promise<{ url: string }>((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.open("POST", "/api/uploads");
				if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

				xhr.upload.onprogress = (e) => {
					if (e.lengthComputable) {
						const pct = Math.round((e.loaded / e.total) * 100);
						setAssets((prev) =>
							prev.map((a) =>
								(a as any)._id === id ? { ...a, progress: pct } : a,
							),
						);
					}
				};

				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						const data = JSON.parse(xhr.responseText);
						resolve({ url: data.upload?.url ?? data.url });
					} else {
						reject(new Error(`Upload failed: ${xhr.status}`));
					}
				};
				xhr.onerror = () => reject(new Error("Network error during upload"));
				xhr.send(formData);
			});

			setAssets((prev) =>
				prev.map((a) =>
					(a as any)._id === id
						? { ...a, url: result.url, status: "done", progress: 100 }
						: a,
				),
			);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Upload failed";
			setAssets((prev) =>
				prev.map((a) =>
					(a as any)._id === id ? { ...a, status: "error", error: msg } : a,
				),
			);
			toast.error(`Failed to upload ${file.name}: ${msg}`);
		}
	}, []);

	const handleFiles = useCallback(
		(files: FileList | File[]) => {
			Array.from(files).forEach((f) => uploadFile(f));
		},
		[uploadFile],
	);

	const onDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setIsDragging(false);
			handleFiles(e.dataTransfer.files);
		},
		[handleFiles],
	);

	const removeAsset = (idx: number) => {
		setAssets((prev) => {
			const next = [...prev];
			URL.revokeObjectURL(next[idx].preview);
			next.splice(idx, 1);
			return next;
		});
	};

	// ── Step navigation ─────────────────────────────────────────────────────────
	const canProceedToStep2 = projectName.trim().length > 0;

	const handleGenerate = async () => {
		setStep(3);
		setLoadingStep(0);

		// Cycle through loading messages while waiting
		const interval = setInterval(() => {
			setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
		}, 3500);

		try {
			const token = await getIdToken();
			const doneAssets = assets
				.filter((a) => a.status === "done" && a.url)
				.map((a) => ({
					url: a.url,
					type: a.type,
					durationMs: a.durationMs,
					width: a.width,
					height: a.height,
					name: a.name,
				}));

			const res = await fetch("/api/projects/generate", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({
					name: projectName.trim(),
					orientation,
					fps: 30,
					assets: doneAssets,
				}),
			});

			clearInterval(interval);

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error ?? `Server error ${res.status}`);
			}

			const { projectId } = await res.json();
			router.push(`/editor/${projectId}`);
		} catch (err) {
			clearInterval(interval);
			const msg = err instanceof Error ? err.message : "Something went wrong";
			toast.error(`Failed to create project: ${msg}`);
			setStep(2); // go back to settings so user can retry
		}
	};

	if (!isOpen) return null;

	// ── Render ──────────────────────────────────────────────────────────────────
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/70 backdrop-blur-sm"
				onClick={handleClose}
			/>

			{/* Modal */}
			<div className="relative z-10 w-full max-w-xl mx-4 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
					<div>
						<h2 className="text-white text-lg font-semibold">
							{step === 1 && "New Project"}
							{step === 2 && "Choose Orientation"}
							{step === 3 && "Building Your Timeline…"}
						</h2>
						{step !== 3 && (
							<p className="text-white/40 text-xs mt-0.5">Step {step} of 2</p>
						)}
					</div>
					{step !== 3 && (
						<button
							onClick={handleClose}
							className="text-white/40 hover:text-white transition-colors text-xl leading-none"
							aria-label="Close"
						>
							×
						</button>
					)}
				</div>

				{/* ── Step 1: Name + Upload ───────────────────────────────────────── */}
				{step === 1 && (
					<div className="px-6 py-5 space-y-5">
						{/* Project name */}
						<div>
							<label className="block text-white/70 text-xs font-medium mb-1.5">
								Project name
							</label>
							<input
								type="text"
								value={projectName}
								onChange={(e) => setProjectName(e.target.value)}
								placeholder="My awesome vlog"
								className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-colors"
								autoFocus
								onKeyDown={(e) => {
									if (e.key === "Enter" && canProceedToStep2) setStep(2);
								}}
							/>
							{/* AI name suggestions */}
							{(loadingSuggestions || nameSuggestions.length > 0) && (
								<div className="mt-2 flex flex-wrap gap-1.5">
									{loadingSuggestions && nameSuggestions.length === 0 && (
										<span className="text-white/30 text-xs animate-pulse">
											✨ Suggesting names…
										</span>
									)}
									{nameSuggestions.map((s) => (
										<button
											key={s}
											type="button"
											onClick={() => setProjectName(s)}
											className="px-2.5 py-1 rounded-full bg-white/8 border border-white/15 text-white/60 text-xs hover:border-white/40 hover:text-white transition-colors"
										>
											✨ {s}
										</button>
									))}
								</div>
							)}
						</div>

						{/* Drop zone */}
						<div>
							<label className="block text-white/70 text-xs font-medium mb-1.5">
								Upload assets{" "}
								<span className="text-white/30 font-normal">
									(optional — add later in editor)
								</span>
							</label>
							<div
								onDragOver={(e) => {
									e.preventDefault();
									setIsDragging(true);
								}}
								onDragLeave={() => setIsDragging(false)}
								onDrop={onDrop}
								onClick={() => fileInputRef.current?.click()}
								className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors min-h-[120px] ${
									isDragging
										? "border-blue-500 bg-blue-500/10"
										: "border-white/15 hover:border-white/30 bg-white/[0.02] hover:bg-white/[0.04]"
								}`}
							>
								<input
									ref={fileInputRef}
									type="file"
									multiple
									accept="video/*,image/*,audio/*"
									className="hidden"
									onChange={(e) =>
										e.target.files && handleFiles(e.target.files)
									}
								/>
								<span className="text-2xl">📁</span>
								<p className="text-white/50 text-sm text-center px-4">
									Drop videos, photos, or audio here
									<br />
									<span className="text-white/30 text-xs">
										or click to browse
									</span>
								</p>
							</div>
						</div>

						{/* Asset list */}
						{assets.length > 0 && (
							<div className="space-y-2 max-h-48 overflow-y-auto pr-1">
								{assets.map((asset, idx) => (
									<div
										key={idx}
										className="flex items-center gap-3 bg-white/5 rounded-lg px-3 py-2"
									>
										{/* Thumbnail / icon */}
										<div className="w-10 h-10 rounded-md overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
											{asset.type === "image" ? (
												<img
													src={asset.preview}
													alt=""
													className="w-full h-full object-cover"
												/>
											) : (
												<span className="text-lg">
													{asset.type === "video" ? "🎬" : "🎵"}
												</span>
											)}
										</div>

										{/* Info */}
										<div className="flex-1 min-w-0">
											<p className="text-white/80 text-xs truncate">
												{asset.name}
											</p>
											{asset.status === "uploading" && (
												<div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
													<div
														className="h-full bg-blue-500 transition-all"
														style={{ width: `${asset.progress}%` }}
													/>
												</div>
											)}
											{asset.status === "done" && (
												<p className="text-green-400 text-xs mt-0.5">
													Uploaded ✓
												</p>
											)}
											{asset.status === "error" && (
												<p className="text-red-400 text-xs mt-0.5 truncate">
													{asset.error}
												</p>
											)}
										</div>

										{/* Remove */}
										{asset.status !== "uploading" && (
											<button
												onClick={() => removeAsset(idx)}
												className="text-white/30 hover:text-white/70 text-lg leading-none flex-shrink-0"
												aria-label="Remove"
											>
												×
											</button>
										)}
									</div>
								))}
							</div>
						)}

						{/* Next */}
						<div className="flex justify-end pt-1">
							<button
								disabled={!canProceedToStep2}
								onClick={() => setStep(2)}
								className="px-5 py-2.5 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-colors"
							>
								Continue →
							</button>
						</div>
					</div>
				)}

				{/* ── Step 2: Orientation ─────────────────────────────────────────── */}
				{step === 2 && (
					<div className="px-6 py-5 space-y-5">
						<p className="text-white/50 text-sm">
							Choose the format for your project. You can't change this later.
						</p>

						<div className="grid grid-cols-2 gap-3">
							{(
								[
									{
										value: "portrait",
										label: "Portrait",
										sub: "9:16 · 1080×1920",
										icon: (
											<div className="w-8 h-12 rounded-md border-2 border-current" />
										),
									},
									{
										value: "landscape",
										label: "Landscape",
										sub: "16:9 · 1920×1080",
										icon: (
											<div className="w-12 h-8 rounded-md border-2 border-current" />
										),
									},
								] as const
							).map(({ value, label, sub, icon }) => (
								<button
									key={value}
									onClick={() => setOrientation(value)}
									className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
										orientation === value
											? "border-white bg-white/10 text-white"
											: "border-white/15 bg-white/[0.02] text-white/40 hover:border-white/30 hover:text-white/60"
									}`}
								>
									{icon}
									<div className="text-center">
										<p className="text-sm font-medium">{label}</p>
										<p className="text-xs opacity-60 mt-0.5">{sub}</p>
									</div>
								</button>
							))}
						</div>

						<div className="flex justify-between items-center pt-1">
							<button
								onClick={() => setStep(1)}
								className="px-4 py-2.5 rounded-lg text-white/50 text-sm hover:text-white transition-colors"
							>
								← Back
							</button>
							<button
								onClick={handleGenerate}
								className="px-5 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors flex items-center gap-2"
							>
								<span>✨</span>
								Create project
							</button>
						</div>
					</div>
				)}

				{/* ── Step 3: Generating ──────────────────────────────────────────── */}
				{step === 3 && (
					<div className="px-6 py-10 flex flex-col items-center gap-6">
						{/* Spinner */}
						<div className="relative w-16 h-16">
							<div className="absolute inset-0 rounded-full border-4 border-white/10" />
							<div className="absolute inset-0 rounded-full border-4 border-t-white animate-spin" />
						</div>

						{/* Current step text */}
						<div className="text-center space-y-1">
							<p className="text-white text-sm font-medium">
								{LOADING_STEPS[loadingStep]}
							</p>
							<p className="text-white/40 text-xs">
								This may take up to 30 seconds for longer videos
							</p>
						</div>

						{/* Step dots */}
						<div className="flex gap-1.5">
							{LOADING_STEPS.map((_, i) => (
								<div
									key={i}
									className={`w-1.5 h-1.5 rounded-full transition-all ${
										i <= loadingStep ? "bg-white" : "bg-white/20"
									}`}
								/>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
