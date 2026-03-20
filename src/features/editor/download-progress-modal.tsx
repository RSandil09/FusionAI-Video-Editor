import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useDownloadState } from "./store/use-download-state";
import { Button } from "@/components/ui/button";
import {
	CircleCheckIcon,
	AlertCircleIcon,
	Loader2,
	Download,
	Film,
} from "lucide-react";
import { ShareSection } from "./share-section";
import { DialogDescription, DialogTitle } from "@radix-ui/react-dialog";
import { download } from "@/utils/download";
import { useEffect, useRef } from "react";

/* ─── Animated progress bar ─── */
function ProgressBar({ progress }: { progress: number }) {
	return (
		<div className="w-full max-w-sm space-y-2">
			<div className="flex justify-between text-xs text-muted-foreground">
				<span>Rendering…</span>
				<span>{Math.floor(progress)}%</span>
			</div>
			<div className="h-2 w-full rounded-full bg-muted overflow-hidden">
				<div
					className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
					style={{ width: `${Math.floor(progress)}%` }}
				/>
			</div>
		</div>
	);
}

/* ─── Label for progress phase ─── */
function phaseLabel(progress: number): string {
	if (progress < 5) return "Starting up…";
	if (progress < 20) return "Bundling project…";
	if (progress < 30) return "Selecting composition…";
	if (progress < 90) return "Rendering frames…";
	if (progress < 100) return "Uploading video…";
	return "Complete";
}

const DownloadProgressModal = () => {
	const { progress, displayProgressModal, output, error, actions } =
		useDownloadState();

	const isCompleted = !!output?.url;
	const hasFailed = !!error;
	const isExporting = !isCompleted && !hasFailed;

	// Auto-download once complete
	const autoDownloaded = useRef(false);
	useEffect(() => {
		if (isCompleted && output?.url && !autoDownloaded.current) {
			autoDownloaded.current = true;
		}
	}, [isCompleted, output]);

	const handleDownload = async () => {
		if (output?.url) {
			await download(output.url, "export.mp4");
		}
	};

	const handleClose = () => {
		actions.setDisplayProgressModal(false);
		actions.clearError();
		autoDownloaded.current = false;
	};

	return (
		<Dialog open={displayProgressModal} onOpenChange={handleClose}>
			<DialogContent className="flex flex-col gap-0 bg-background p-0 sm:max-w-[520px] overflow-hidden rounded-xl border border-border/60 shadow-2xl">
				<DialogTitle className="hidden" />
				<DialogDescription className="hidden" />

				{/* Header */}
				<div className="flex items-center gap-2.5 border-b border-border/60 px-5 py-4">
					<Film className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm font-semibold tracking-tight">
						{hasFailed
							? "Export Failed"
							: isCompleted
								? "Export Complete"
								: "Exporting…"}
					</span>
				</div>

				{/* Body */}
				<div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-12 min-h-[320px]">
					{hasFailed && (
						<>
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 ring-4 ring-destructive/5">
								<AlertCircleIcon className="h-8 w-8 text-destructive" />
							</div>
							<div className="text-center space-y-1.5">
								<p className="font-semibold text-base">Something went wrong</p>
								<p className="text-sm text-muted-foreground max-w-[340px] leading-relaxed">
									{error}
								</p>
							</div>
							<Button variant="outline" onClick={handleClose} className="mt-1">
								Close
							</Button>
						</>
					)}

					{isCompleted && (
						<>
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 ring-4 ring-green-500/5">
								<CircleCheckIcon className="h-8 w-8 text-green-500" />
							</div>
							<div className="text-center space-y-1.5">
								<p className="font-semibold text-base">Ready to download!</p>
								<p className="text-sm text-muted-foreground">
									Your video has been rendered and is ready.
								</p>
							</div>
							<div className="flex flex-col items-center gap-4 w-full max-w-xs">
								<Button onClick={handleDownload} className="w-full gap-2">
									<Download className="h-4 w-4" />
									Download MP4
								</Button>
								{output.url && <ShareSection videoUrl={output.url} />}
								<Button
									variant="ghost"
									size="sm"
									onClick={handleClose}
									className="text-muted-foreground"
								>
									Close
								</Button>
							</div>
						</>
					)}

					{isExporting && (
						<>
							{progress < 1 ? (
								<div className="flex h-16 w-16 items-center justify-center">
									<Loader2 className="h-10 w-10 animate-spin text-primary" />
								</div>
							) : (
								<div className="relative flex h-16 w-16 items-center justify-center">
									{/* Circular progress ring */}
									<svg
										className="absolute inset-0 -rotate-90"
										viewBox="0 0 64 64"
									>
										<circle
											cx="32"
											cy="32"
											r="28"
											fill="none"
											stroke="currentColor"
											strokeWidth="4"
											className="text-muted"
										/>
										<circle
											cx="32"
											cy="32"
											r="28"
											fill="none"
											stroke="currentColor"
											strokeWidth="4"
											strokeLinecap="round"
											strokeDasharray={`${2 * Math.PI * 28}`}
											strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
											className="text-primary transition-all duration-500"
										/>
									</svg>
									<span className="text-sm font-bold tabular-nums">
										{Math.floor(progress)}%
									</span>
								</div>
							)}

							<div className="text-center space-y-1">
								<p className="font-semibold text-base">
									{phaseLabel(progress)}
								</p>
								<p className="text-sm text-muted-foreground">
									Closing this window won't stop the export.
								</p>
							</div>

							<ProgressBar progress={progress} />

							<Button
								variant="ghost"
								size="sm"
								onClick={handleClose}
								className="text-muted-foreground hover:text-foreground text-xs"
							>
								Minimise
							</Button>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default DownloadProgressModal;
