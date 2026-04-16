import { ADD_AUDIO, ADD_IMAGE, ADD_VIDEO } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
	Music,
	Image as ImageIcon,
	Video as VideoIcon,
	Loader2,
	UploadIcon,
	CheckCircle2,
	XCircle,
} from "lucide-react";
import { generateId } from "@designcombo/timeline";
import { Button } from "@/components/ui/button";
import useUploadStore from "../store/use-upload-store";
import ModalUpload from "@/components/modal-upload";
import { useEffect } from "react";

// ─── Upload Button ────────────────────────────────────────────────────────────
const UploadPrompt = () => {
	const { setShowUploadModal } = useUploadStore();
	return (
		<div className="px-4 pb-3">
			<Button
				className="w-full cursor-pointer"
				onClick={() => setShowUploadModal(true)}
			>
				<UploadIcon className="w-4 h-4 mr-2" />
				Upload
			</Button>
		</div>
	);
};

// ─── In-Progress Upload Row ───────────────────────────────────────────────────
interface ProgressRowProps {
	fileName: string;
	progress: number;
	status: "pending" | "uploading" | "uploaded" | "failed";
	error?: string;
}
const ProgressRow = ({
	fileName,
	progress,
	status,
	error,
}: ProgressRowProps) => {
	const isPending = status === "pending";
	const isFailed = status === "failed";
	const pct = isPending ? 0 : progress;

	return (
		<div className="flex flex-col gap-1 px-3 py-2 overflow-hidden">
			{/* Name + badge */}
			<div className="flex items-center gap-2 min-w-0">
				{isFailed ? (
					<XCircle className="w-3.5 h-3.5 flex-none text-destructive" />
				) : status === "uploaded" ? (
					<CheckCircle2 className="w-3.5 h-3.5 flex-none text-green-500" />
				) : (
					<Loader2 className="w-3.5 h-3.5 flex-none animate-spin text-primary" />
				)}
				<span
					className="text-xs text-foreground truncate min-w-0 flex-1"
					title={fileName}
				>
					{fileName}
				</span>
				<span
					className={`flex-none text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
						isFailed
							? "bg-destructive/15 text-destructive"
							: isPending
								? "bg-muted text-muted-foreground"
								: status === "uploaded"
									? "bg-green-500/15 text-green-600"
									: "bg-primary/15 text-primary"
					}`}
				>
					{isFailed
						? "Failed"
						: isPending
							? "Queued"
							: status === "uploaded"
								? "Done"
								: `${pct}%`}
				</span>
			</div>
			{/* Progress bar */}
			<div className="w-full h-1 rounded-full bg-border overflow-hidden">
				<div
					className={`h-full rounded-full transition-all duration-300 ${
						isFailed
							? "bg-destructive"
							: status === "uploaded"
								? "bg-green-500"
								: "bg-primary"
					}`}
					style={{ width: isFailed ? "100%" : `${pct}%` }}
				/>
			</div>
			{isFailed && error && (
				<p className="text-[10px] text-destructive truncate">{error}</p>
			)}
		</div>
	);
};

export const Uploads = () => {
	const { uploads, loadUserAssets } = useUploadStore();

	useEffect(() => {
		loadUserAssets();
	}, [loadUserAssets]);

	// Partition uploads
	const activeUploads = uploads.filter(
		(u) => u.status === "pending" || u.status === "uploading",
	);
	const failedUploads = uploads.filter((u) => u.status === "failed");
	const completedUploads = uploads.filter(
		(u) => u.status === "uploaded" && u.result,
	);

	// Group completed by type
	const videos = completedUploads.filter((u) =>
		u.result?.contentType?.startsWith("video/"),
	);
	const images = completedUploads.filter((u) =>
		u.result?.contentType?.startsWith("image/"),
	);
	const audios = completedUploads.filter((u) =>
		u.result?.contentType?.startsWith("audio/"),
	);

	const hasActive = activeUploads.length > 0;
	const hasFailed = failedUploads.length > 0;
	const hasAssets = videos.length > 0 || images.length > 0 || audios.length > 0;

	// ── handlers ────────────────────────────────────────────────────────────────
	const handleAddVideo = (upload: any) => {
		let src = upload.result?.url || upload.url;
		if (!src) {
			console.warn("⚠️ No src found for video upload");
			return;
		}
		// @designcombo/state's ADD_VIDEO handler creates a <video crossOrigin="anonymous">
		// element to fetch metadata (duration/width/height). crossOrigin="anonymous" omits
		// credentials, so the video-proxy's auth check returns 401 in production.
		// Fix: pass the raw R2 URL so Dn() fetches from the public CDN directly (no auth).
		// ensureVideoUrl() in the player will proxy it back for playback.
		if (src.startsWith("/api/video-proxy?url=")) {
			src = decodeURIComponent(src.slice("/api/video-proxy?url=".length));
		} else if (src.startsWith("/api/image-proxy?url=")) {
			src = decodeURIComponent(src.slice("/api/image-proxy?url=".length));
		}
		const payload = {
			id: generateId(),
			details: { src },
			metadata: { previewUrl: src },
		};
		dispatch(ADD_VIDEO, {
			payload,
			options: { resourceId: "main", scaleMode: "fit" },
		});
	};

	const handleAddImage = (upload: any) => {
		const src = upload.result?.url || upload.url;
		if (!src) {
			console.warn("⚠️ No src found for image upload");
			return;
		}
		const payload = {
			id: generateId(),
			type: "image",
			display: { from: 0, to: 5000 },
			details: { src },
			metadata: {},
		};
		dispatch(ADD_IMAGE, {
			payload,
			options: {},
		});
	};

	const handleAddAudio = (upload: any) => {
		const src = upload.result?.url || upload.url;
		if (!src) {
			console.warn("⚠️ No src found for audio upload");
			return;
		}
		const payload = {
			id: generateId(),
			type: "audio",
			details: { src },
			metadata: {},
		};
		dispatch(ADD_AUDIO, {
			payload,
			options: {},
		});
	};

	// ── Thumbnail card ───────────────────────────────────────────────────────────
	const AssetCard = ({
		upload,
		onAdd,
		icon,
		renderPreview,
	}: {
		upload: any;
		onAdd: (u: any) => void;
		icon: React.ReactNode;
		renderPreview?: () => React.ReactNode;
	}) => (
		<div className="flex flex-col items-center gap-1.5 w-full min-w-0">
			<div className="relative group w-16 flex-none">
				<Card className="w-16 h-16 flex items-center justify-center overflow-hidden bg-muted">
					{renderPreview ? renderPreview() : icon}
				</Card>
				<button
					onClick={() => onAdd(upload)}
					className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md text-xs font-bold leading-none"
					title="Add to timeline"
				>
					+
				</button>
			</div>
			<span className="text-[10px] text-muted-foreground truncate w-full text-center px-1">
				{upload.result?.fileName || upload.fileName || "—"}
			</span>
		</div>
	);

	return (
		/* Outer container: fixed height, no overflow so it never pushes past the pane */
		<div className="flex flex-col h-full overflow-hidden">
			<ModalUpload />

			{/* Section label */}
			<div className="flex-none h-12 flex items-center px-4 text-sm font-medium text-foreground">
				Your uploads
			</div>

			{/* Upload button */}
			<div className="flex-none">
				<UploadPrompt />
			</div>

			{/* ── Sticky in-progress panel ─────────────────────────────────────── */}
			{(hasActive || hasFailed) && (
				<div className="flex-none mx-4 mb-3 rounded-lg border border-border bg-muted/50 overflow-hidden">
					{/* Header */}
					<div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
						{hasActive ? (
							<Loader2 className="w-3.5 h-3.5 flex-none animate-spin text-primary" />
						) : (
							<XCircle className="w-3.5 h-3.5 flex-none text-destructive" />
						)}
						<span className="text-xs font-semibold text-foreground flex-1">
							{hasActive ? "Uploading…" : "Upload Failed"}
						</span>
						<span className="text-[10px] text-muted-foreground">
							{activeUploads.length + failedUploads.length} file
							{activeUploads.length + failedUploads.length !== 1 ? "s" : ""}
						</span>
					</div>
					{/* Rows — scroll if many */}
					<div className="max-h-36 overflow-y-auto divide-y divide-border/30">
						{[...activeUploads, ...failedUploads].map((u) => (
							<ProgressRow
								key={u.id}
								fileName={u.file?.name || u.fileName || "Unknown file"}
								progress={u.progress ?? 0}
								status={u.status}
								error={u.error}
							/>
						))}
					</div>
				</div>
			)}

			{/* ── Scrollable asset library ──────────────────────────────────────── */}
			<ScrollArea className="flex-1 min-h-0">
				<div className="flex flex-col gap-6 px-4 pb-4">
					{/* Empty state */}
					{!hasAssets && !hasActive && (
						<div className="flex flex-col items-center justify-center py-12 text-center gap-3">
							<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
								<UploadIcon className="w-5 h-5 text-muted-foreground" />
							</div>
							<div>
								<p className="text-sm font-medium text-foreground">
									No uploads yet
								</p>
								<p className="text-xs text-muted-foreground mt-1">
									Upload images, videos or audio to use in your project
								</p>
							</div>
						</div>
					)}

					{/* Videos */}
					{videos.length > 0 && (
						<div>
							<div className="flex items-center gap-2 mb-3">
								<VideoIcon className="w-3.5 h-3.5 text-muted-foreground" />
								<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
									Videos · {videos.length}
								</span>
							</div>
							<div className="grid grid-cols-3 gap-3">
								{videos.map((u, i) => (
									<AssetCard
										key={u.id || i}
										upload={u}
										onAdd={handleAddVideo}
										icon={
											<VideoIcon className="w-7 h-7 text-muted-foreground" />
										}
										renderPreview={() =>
											u.result?.url ? (
												<video
													src={u.result.url}
													className="w-full h-full object-cover"
													muted
													playsInline
												/>
											) : (
												<VideoIcon className="w-7 h-7 text-muted-foreground" />
											)
										}
									/>
								))}
							</div>
						</div>
					)}

					{/* Images */}
					{images.length > 0 && (
						<div>
							<div className="flex items-center gap-2 mb-3">
								<ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
								<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
									Images · {images.length}
								</span>
							</div>
							<div className="grid grid-cols-3 gap-3">
								{images.map((u, i) => (
									<AssetCard
										key={u.id || i}
										upload={u}
										onAdd={handleAddImage}
										icon={
											<ImageIcon className="w-7 h-7 text-muted-foreground" />
										}
										renderPreview={() =>
											u.result?.url ? (
												<img
													src={u.result.url}
													alt={u.result.fileName}
													className="w-full h-full object-cover"
													onError={(e) =>
														(e.currentTarget.style.display = "none")
													}
												/>
											) : (
												<ImageIcon className="w-7 h-7 text-muted-foreground" />
											)
										}
									/>
								))}
							</div>
						</div>
					)}

					{/* Audios */}
					{audios.length > 0 && (
						<div>
							<div className="flex items-center gap-2 mb-3">
								<Music className="w-3.5 h-3.5 text-muted-foreground" />
								<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
									Audio · {audios.length}
								</span>
							</div>
							<div className="grid grid-cols-3 gap-3">
								{audios.map((u, i) => (
									<AssetCard
										key={u.id || i}
										upload={u}
										onAdd={handleAddAudio}
										icon={<Music className="w-7 h-7 text-muted-foreground" />}
									/>
								))}
							</div>
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
};
