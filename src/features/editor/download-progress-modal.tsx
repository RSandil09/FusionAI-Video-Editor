"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useDownloadState } from "./store/use-download-state";
import { Button } from "@/components/ui/button";
import {
	CircleCheckIcon,
	AlertCircleIcon,
	Loader2,
	Download,
	Sparkles,
	X,
	Film,
} from "lucide-react";
import { ShareSection } from "./share-section";
import { DialogDescription, DialogTitle } from "@radix-ui/react-dialog";
import { download } from "@/utils/download";
import { useEffect, useRef, useState } from "react";
import { getIdToken } from "@/lib/auth/client";
import useStore from "./store/use-store";

/* ─── Helpers ─── */
function formatDuration(ms: number): string {
	const totalSecs = Math.floor(ms / 1000);
	const mins = Math.floor(totalSecs / 60);
	const secs = totalSecs % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatElapsed(secs: number): string {
	const m = Math.floor(secs / 60);
	const s = secs % 60;
	return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function phaseLabel(progress: number): string {
	if (progress < 5) return "Starting up…";
	if (progress < 20) return "Bundling project…";
	if (progress < 30) return "Preparing composition…";
	if (progress < 90) return "Rendering frames…";
	if (progress < 99) return "Encoding & uploading…";
	return "Finishing up…";
}

const FORMAT_LABELS: Record<string, string> = {
	mp4: "MP4 · H.264",
	"mp4-hevc": "MP4 · H.265",
	webm: "WebM · VP9",
	gif: "GIF",
	json: "JSON",
};

/* ─── Circular progress ring ─── */
function RingProgress({ progress }: { progress: number }) {
	const r = 34;
	const circ = 2 * Math.PI * r;
	const offset = circ * (1 - progress / 100);

	return (
		<div className="relative w-24 h-24 flex items-center justify-center">
			<svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
				<circle
					cx="40"
					cy="40"
					r={r}
					fill="none"
					stroke="currentColor"
					strokeWidth="5"
					className="text-muted"
				/>
				<circle
					cx="40"
					cy="40"
					r={r}
					fill="none"
					stroke="currentColor"
					strokeWidth="5"
					strokeLinecap="round"
					strokeDasharray={circ}
					strokeDashoffset={offset}
					className="text-primary transition-all duration-700 ease-out"
				/>
			</svg>
			<span className="text-lg font-bold tabular-nums z-10">
				{Math.floor(progress)}%
			</span>
		</div>
	);
}

/* ─── Main modal ─── */
const DownloadProgressModal = () => {
	const { progress, displayProgressModal, output, error, actions, projectId, exportType } =
		useDownloadState();
	const { duration, size } = useStore();

	const isCompleted = !!output?.url;
	const hasFailed = !!error;
	const isExporting = !isCompleted && !hasFailed;

	// Elapsed timer
	const [elapsed, setElapsed] = useState(0);
	const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (displayProgressModal && isExporting) {
			setElapsed(0);
			elapsedRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
		} else {
			if (elapsedRef.current) clearInterval(elapsedRef.current);
		}
		return () => {
			if (elapsedRef.current) clearInterval(elapsedRef.current);
		};
	}, [displayProgressModal, isExporting]);

	// AI thumbnail state
	const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
	const [generatingThumb, setGeneratingThumb] = useState(false);
	const [thumbError, setThumbError] = useState<string | null>(null);

	useEffect(() => {
		if (!displayProgressModal) {
			setThumbnailUrl(null);
			setThumbError(null);
		}
	}, [displayProgressModal]);

	const handleGenerateThumbnail = async () => {
		if (!projectId) return;
		setGeneratingThumb(true);
		setThumbError(null);
		try {
			const token = await getIdToken();
			const res = await fetch("/api/projects/thumbnail", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({ projectId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Thumbnail generation failed");
			setThumbnailUrl(data.thumbnailUrl);
		} catch (err) {
			setThumbError(err instanceof Error ? err.message : "Failed to generate thumbnail");
		} finally {
			setGeneratingThumb(false);
		}
	};

	const autoDownloaded = useRef(false);
	useEffect(() => {
		if (isCompleted && output?.url && !autoDownloaded.current) {
			autoDownloaded.current = true;
		}
	}, [isCompleted, output]);

	const [isDownloading, setIsDownloading] = useState(false);

	const handleDownload = () => {
		if (!output?.url || isDownloading) return;
		setIsDownloading(true);
		const ext = output.type === "webm" ? "webm" : output.type === "gif" ? "gif" : "mp4";
		download(output.url, `export.${ext}`);
		// Give the browser ~1.5 s to show its download bar, then reset the button.
		setTimeout(() => setIsDownloading(false), 1500);
	};

	const handleClose = () => {
		actions.setDisplayProgressModal(false);
		actions.clearError();
		autoDownloaded.current = false;
	};

	const formatLabel = FORMAT_LABELS[exportType ?? "mp4"] ?? "MP4";

	return (
		<Dialog open={displayProgressModal} onOpenChange={handleClose}>
			<DialogContent className="flex flex-col gap-0 bg-background p-0 sm:max-w-[480px] overflow-hidden rounded-2xl border border-border/60 shadow-2xl">
				<DialogTitle className="hidden" />
				<DialogDescription className="hidden" />

				{/* ── Header ── */}
				<div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
					<div className="flex items-center gap-2.5">
						<div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-none ${
							hasFailed ? "bg-destructive/10" : isCompleted ? "bg-green-500/10" : "bg-primary/10"
						}`}>
							<Film className={`h-3.5 w-3.5 ${
								hasFailed ? "text-destructive" : isCompleted ? "text-green-500" : "text-primary"
							}`} />
						</div>
						<span className="text-sm font-semibold tracking-tight">
							{hasFailed ? "Export Failed" : isCompleted ? "Export Complete" : "Exporting…"}
						</span>
					</div>
					{(isCompleted || hasFailed) && (
						<button
							onClick={handleClose}
							className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>

				{/* ── Body ── */}
				<div className="flex flex-1 flex-col items-center gap-6 px-8 py-10 min-h-[340px]">

					{/* ── Rendering state ── */}
					{isExporting && (
						<>
							{progress < 1 ? (
								<div className="w-24 h-24 flex items-center justify-center">
									<Loader2 className="w-10 h-10 animate-spin text-primary" />
								</div>
							) : (
								<RingProgress progress={progress} />
							)}

							<div className="text-center space-y-1.5">
								<p className="text-base font-semibold">{phaseLabel(progress)}</p>
								<p className="text-xs text-muted-foreground">
									Closing this window won&apos;t stop the export.
								</p>
							</div>

							{/* Linear bar */}
							<div className="w-full space-y-1.5">
								<div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
									<div
										className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
										style={{ width: `${Math.max(2, Math.floor(progress))}%` }}
									/>
								</div>
							</div>

							{/* Stats row */}
							<div className="flex items-center gap-4 text-xs text-muted-foreground">
								<span>{formatLabel}</span>
								<span className="opacity-40">·</span>
								<span>{size.width}×{size.height}</span>
								<span className="opacity-40">·</span>
								<span>Elapsed {formatElapsed(elapsed)}</span>
							</div>

							{/* Actions */}
							<div className="flex items-center gap-2 mt-auto">
								<Button
									variant="ghost"
									size="sm"
									onClick={handleClose}
									className="text-muted-foreground hover:text-foreground text-xs h-8 px-4 rounded-xl"
								>
									Minimise
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => actions.cancelExport()}
									className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-8 px-4 rounded-xl"
								>
									Cancel
								</Button>
							</div>
						</>
					)}

					{/* ── Complete state ── */}
					{isCompleted && (
						<>
							<div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 ring-4 ring-green-500/5">
								<CircleCheckIcon className="h-10 w-10 text-green-500" />
							</div>

							<div className="text-center space-y-1.5">
								<p className="text-base font-semibold">Your video is ready</p>
								<div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
									<span className="px-2 py-0.5 rounded-full bg-muted border border-border/40">
										{formatLabel}
									</span>
									<span className="px-2 py-0.5 rounded-full bg-muted border border-border/40">
										{formatDuration(duration)}
									</span>
									<span className="px-2 py-0.5 rounded-full bg-muted border border-border/40">
										{size.width}×{size.height}
									</span>
								</div>
							</div>

							<div className="flex flex-col gap-2.5 w-full max-w-xs">
								<Button
									onClick={handleDownload}
									disabled={isDownloading}
									className="w-full gap-2 h-10 rounded-xl font-medium"
								>
									{isDownloading ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Preparing download…
										</>
									) : (
										<>
											<Download className="h-4 w-4" />
											Download {formatLabel.split(" · ")[0]}
										</>
									)}
								</Button>

								{output?.url && (
									<div className="py-1">
										<ShareSection videoUrl={output.url} />
									</div>
								)}

								{!thumbnailUrl && (
									<Button
										variant="outline"
										size="sm"
										onClick={handleGenerateThumbnail}
										disabled={generatingThumb || !projectId}
										className="w-full gap-2 h-9 rounded-xl text-xs"
									>
										{generatingThumb ? (
											<Loader2 className="h-3.5 w-3.5 animate-spin" />
										) : (
											<Sparkles className="h-3.5 w-3.5 text-primary" />
										)}
										{generatingThumb ? "Generating thumbnail…" : "Generate AI Thumbnail"}
									</Button>
								)}

								{thumbError && (
									<p className="text-[11px] text-destructive text-center">{thumbError}</p>
								)}

								{thumbnailUrl && (
									<div className="space-y-2">
										<p className="text-[11px] text-muted-foreground text-center font-medium">
											AI Thumbnail
										</p>
										<a href={thumbnailUrl} target="_blank" rel="noopener noreferrer">
											<img
												src={thumbnailUrl}
												alt="AI generated thumbnail"
												className="w-full rounded-xl border border-border/50 hover:opacity-90 transition-opacity"
											/>
										</a>
										<Button
											variant="outline"
											size="sm"
											className="w-full gap-2 text-xs rounded-xl h-9"
											onClick={() => download(thumbnailUrl, "thumbnail.jpg")}
										>
											<Download className="h-3.5 w-3.5" />
											Download Thumbnail
										</Button>
									</div>
								)}

								<button
									onClick={handleClose}
									className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
								>
									Close
								</button>
							</div>
						</>
					)}

					{/* ── Failed state ── */}
					{hasFailed && (
						<>
							<div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 ring-4 ring-destructive/5">
								<AlertCircleIcon className="h-10 w-10 text-destructive" />
							</div>

							<div className="text-center space-y-2">
								<p className="text-base font-semibold">Something went wrong</p>
								<p className="text-xs text-muted-foreground max-w-[320px] leading-relaxed line-clamp-4">
									{error}
								</p>
							</div>

							<Button
								variant="outline"
								onClick={handleClose}
								className="mt-auto rounded-xl px-6"
							>
								Close
							</Button>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default DownloadProgressModal;
