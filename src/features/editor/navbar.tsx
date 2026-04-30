import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { dispatch } from "@designcombo/events";
import { HISTORY_UNDO, HISTORY_REDO, DESIGN_RESIZE } from "@designcombo/state";
import { Icons } from "@/components/shared/icons";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	ChevronDown,
	Download,
	ProportionsIcon,
	Save,
	ShareIcon,
	Loader2,
	ArrowLeft,
	CheckCircle2,
	AlertCircle,
	ExternalLink,
	Check,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { getIdToken } from "@/lib/auth/client";
import { toast } from "sonner";
import { UserMenu } from "@/components/auth/user-menu";
import { useRouter } from "next/navigation";

import type StateManager from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import type { IDesign } from "@designcombo/types";
import { useDownloadState, type ExportFormat } from "./store/use-download-state";
import useStore from "./store/use-store";
import DownloadProgressModal from "./download-progress-modal";
import AutosizeInput from "@/components/ui/autosize-input";

import { useIsMediumScreen } from "@/hooks/use-media-query";

import { LogoIcons } from "@/components/shared/logos";
import Link from "next/link";

import type { SaveStatus } from "./editor";

export default function Navbar({
	stateManager,
	setProjectName,
	projectName,
	projectId,
	saveStatus = "idle",
}: {
	user?: any | null;
	stateManager: StateManager;
	setProjectName: (name: string) => void;
	projectName: string;
	projectId?: string;
	saveStatus?: SaveStatus;
}) {
	const [title, setTitle] = useState(projectName);
	const [isRenamingSaving, setIsRenamingSaving] = useState(false);
	const router = useRouter();

	// Sync local title when prop changes (e.g. on first DB load)
	useEffect(() => {
		setTitle(projectName);
	}, [projectName]);

	const handleUndo = () => {
		dispatch(HISTORY_UNDO);
	};

	const handleRedo = () => {
		dispatch(HISTORY_REDO);
	};

	const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setTitle(e.target.value);
	};

	/** Called on blur or Enter — persists the name to DB */
	const handleRenameCommit = async () => {
		const newName = title.trim();
		if (!newName) {
			setTitle(projectName); // revert if empty
			return;
		}
		if (newName === projectName) return; // nothing changed
		if (!projectId) {
			setProjectName(newName);
			return;
		}

		setIsRenamingSaving(true);
		try {
			const token = await getIdToken();
			if (!token) {
				toast.error("Not authenticated");
				return;
			}
			const res = await fetch(`/api/projects/${projectId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ name: newName }),
			});
			if (res.ok) {
				setProjectName(newName);
				toast.success("Project renamed");
			} else {
				const err = await res.json().catch(() => ({}));
				toast.error(err.message || "Failed to rename project");
				setTitle(projectName); // revert
			}
		} catch (e: any) {
			toast.error(`Rename error: ${e.message}`);
			setTitle(projectName);
		} finally {
			setIsRenamingSaving(false);
		}
	};

	const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") (e.target as HTMLInputElement).blur();
		if (e.key === "Escape") {
			setTitle(projectName);
			(e.target as HTMLInputElement).blur();
		}
	};

	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "1fr auto 1fr",
			}}
			className="bg-background/90 backdrop-blur-xl border-b border-border/60 h-16 px-5 gap-4 sticky top-0 z-50 supports-[backdrop-filter]:bg-background/70"
		>
			<DownloadProgressModal />

			{/* Left Section: Back, Logo, Title */}
			<div className="flex items-center gap-3 justify-start">
				<Button
					onClick={() => router.push("/dashboard")}
					variant="ghost"
					size="icon"
					className="text-muted-foreground hover:text-foreground hover:bg-accent h-9 w-9"
					title="Back to Dashboard"
				>
					<ArrowLeft width={18} />
				</Button>

				<div className="h-6 w-px bg-border/50" />

				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<LogoIcons.scenify className="w-8 h-8 text-primary" />
					</div>

					<AutosizeInput
						name="title"
						value={title}
						onChange={handleTitleChange}
						onBlur={handleRenameCommit}
						onKeyDown={handleTitleKeyDown}
						width={200}
						inputClassName={`bg-transparent border-none outline-none text-sm font-medium text-foreground placeholder:text-muted-foreground focus:ring-0 px-0 ${
							isRenamingSaving ? "opacity-50" : ""
						}`}
					/>

					{/* Auto-save status indicator */}
					{saveStatus !== "idle" && (
						<span className="flex items-center gap-1 text-xs flex-none">
							{saveStatus === "saving" && (
								<>
									<Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
									<span className="text-muted-foreground">Saving…</span>
								</>
							)}
							{saveStatus === "saved" && (
								<>
									<CheckCircle2 className="h-3 w-3 text-green-500" />
									<span className="text-green-500">Saved</span>
								</>
							)}
							{saveStatus === "error" && (
								<>
									<AlertCircle className="h-3 w-3 text-destructive" />
									<span className="text-destructive">Save failed</span>
								</>
							)}
						</span>
					)}
				</div>

				{/* History Controls */}
				<div className="flex items-center gap-0.5 ml-2 bg-muted/40 rounded-xl p-1 border border-border/40">
					<Button
						onClick={handleUndo}
						className="text-muted-foreground hover:text-foreground hover:bg-muted/60 h-7 w-7 rounded-lg"
						variant="ghost"
						size="icon"
						title="Undo"
					>
						<Icons.undo width={14} />
					</Button>
					<Button
						onClick={handleRedo}
						className="text-muted-foreground hover:text-foreground hover:bg-muted/60 h-7 w-7 rounded-lg"
						variant="ghost"
						size="icon"
						title="Redo"
					>
						<Icons.redo width={14} />
					</Button>
				</div>
			</div>

			{/* Center Section: Placeholder */}
			<div className="flex h-16 items-center justify-center gap-2">
				{/* Potential spot for Play/Pause or Timecode */}
			</div>

			{/* Right Section: Actions + User */}
			<div className="flex h-16 items-center justify-end gap-3">
				<div className="flex items-center gap-2">
					<SaveButton projectId={projectId} stateManager={stateManager} />
					<PublishPopover projectId={projectId} />
					<DownloadPopover stateManager={stateManager} projectId={projectId} />
				</div>

				<div className="h-6 w-px bg-border/50 mx-1" />

				<UserMenu />
			</div>
		</div>
	);
}

// ─── Publish / Share ────────────────────────────────────────────────────────

type SocialConnection = {
	provider: string;
	provider_username: string | null;
	connected_at: string | null;
};

const PLATFORMS: { id: string; label: string; dot: string }[] = [
	{ id: "youtube", label: "YouTube", dot: "bg-red-500" },
	{ id: "tiktok", label: "TikTok", dot: "bg-zinc-800 dark:bg-zinc-200" },
	{ id: "instagram", label: "Instagram", dot: "bg-pink-500" },
];

type PublishPlatform = "youtube" | "instagram" | "tiktok";
type TikTokPrivacy =
	| "SELF_ONLY"
	| "FOLLOWER_OF_CREATOR"
	| "MUTUAL_FOLLOW_FRIENDS"
	| "PUBLIC_TO_EVERYONE";

type PublishStage = "form" | "uploading" | "success" | "error";

type PublishResult = {
	platform: PublishPlatform;
	url?: string;
	embedUrl?: string;
	videoId?: string;
	privacy?: string;
};

const PublishPopover = ({ projectId }: { projectId?: string }) => {
	const [open, setOpen] = useState(false);
	const [connections, setConnections] = useState<SocialConnection[]>([]);
	const [loading, setLoading] = useState(false);
	const [activePlatform, setActivePlatform] = useState<PublishPlatform | null>(
		null,
	);
	const [latestVideoUrl, setLatestVideoUrl] = useState<string | null>(null);
	const [resolvingVideo, setResolvingVideo] = useState(false);

	const [stage, setStage] = useState<PublishStage>("form");
	const [progressLabel, setProgressLabel] = useState("Preparing upload…");
	const [publishResult, setPublishResult] = useState<PublishResult | null>(
		null,
	);
	const [publishError, setPublishError] = useState<string | null>(null);

	const [youtubeTitle, setYoutubeTitle] = useState("My Video");
	const [youtubeDescription, setYoutubeDescription] = useState("");
	const [caption, setCaption] = useState("");
	const [tiktokPrivacy, setTiktokPrivacy] = useState<TikTokPrivacy>("SELF_ONLY");

	const fetchConnections = useCallback(async () => {
		setLoading(true);
		try {
			const token = await getIdToken();
			if (!token) return;
			const res = await fetch("/api/social-connections", {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				const data = await res.json();
				setConnections(data);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (open) fetchConnections();
	}, [open, fetchConnections]);

	function resetDialog() {
		setStage("form");
		setPublishResult(null);
		setPublishError(null);
		setProgressLabel("Preparing upload…");
	}

	function closeDialog() {
		setActivePlatform(null);
		// Defer resetting state until the dialog has unmounted to avoid flicker.
		setTimeout(resetDialog, 200);
	}

	async function openPublishDialog(platform: PublishPlatform) {
		if (!projectId) {
			toast.error("Open a saved project first");
			return;
		}
		setResolvingVideo(true);
		try {
			const token = await getIdToken();
			if (!token) {
				toast.error("Please log in");
				return;
			}
			const res = await fetch(
				`/api/projects/${projectId}/latest-render`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			if (!res.ok) {
				toast.error("Failed to look up your last export");
				return;
			}
			const data = await res.json();
			if (!data.render?.videoUrl) {
				toast.error("Export the video first, then publish from here");
				return;
			}
			setLatestVideoUrl(data.render.videoUrl);
			resetDialog();
			setActivePlatform(platform);
			setOpen(false);
		} finally {
			setResolvingVideo(false);
		}
	}

	async function doPublish() {
		if (!activePlatform || !latestVideoUrl) return;
		const token = await getIdToken();
		if (!token) {
			toast.error("Please log in");
			return;
		}

		const platform = activePlatform;
		setStage("uploading");
		setPublishError(null);
		setProgressLabel(
			platform === "youtube"
				? "Sending video to YouTube…"
				: platform === "instagram"
					? "Creating Instagram media container…"
					: "Sending video to TikTok…",
		);

		// Instagram polls server-side for ~2 min, so update the label after a delay.
		const labelTimer =
			platform === "instagram"
				? setTimeout(
						() => setProgressLabel("Instagram is processing the video…"),
						5000,
					)
				: null;

		try {
			const res = await fetch("/api/share", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					platform,
					videoUrl: latestVideoUrl,
					title: youtubeTitle || "My Video",
					description: youtubeDescription || "",
					caption: caption || "",
					privacyLevel: tiktokPrivacy,
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				setPublishError(data.error || `Failed to publish to ${platform}`);
				setStage("error");
				return;
			}
			setPublishResult({
				platform,
				url: data.url,
				embedUrl: data.embedUrl,
				videoId: data.videoId,
				privacy: data.privacy,
			});
			setStage("success");
			toast.success(`Published to ${platform}!`);
		} catch (e) {
			setPublishError(
				e instanceof Error ? e.message : `Failed to publish to ${platform}`,
			);
			setStage("error");
		} finally {
			if (labelTimer) clearTimeout(labelTimer);
		}
	}

	return (
		<>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						className="flex h-8 gap-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
						variant="ghost"
						size="sm"
					>
						<ShareIcon width={14} />
						<span className="hidden md:block text-xs font-medium">Publish</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent
					align="end"
					className="bg-sidebar z-[250] flex w-64 flex-col gap-3 rounded-2xl border-border/60 p-4"
				>
					<div className="flex items-center gap-2">
						<ShareIcon width={13} className="text-primary" />
						<Label className="text-sm font-semibold">Publish to</Label>
					</div>

					{loading ? (
						<div className="flex justify-center py-4">
							<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
						</div>
					) : (
						<div className="flex flex-col gap-2">
							{PLATFORMS.map((platform) => {
								const conn = connections.find(
									(c) => c.provider === platform.id,
								);
								const isResolving =
									resolvingVideo && activePlatform === platform.id;
								return (
									<div
										key={platform.id}
										className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5"
									>
										<div className="flex items-center gap-2.5">
											<div className={`h-2 w-2 rounded-full ${platform.dot}`} />
											<div>
												<div className="text-sm font-medium">
													{platform.label}
												</div>
												{conn?.provider_username && (
													<div className="text-xs text-muted-foreground">
														@{conn.provider_username}
													</div>
												)}
											</div>
										</div>
										{conn ? (
											<Button
												size="sm"
												className="h-7 rounded-lg px-3 text-xs"
												disabled={resolvingVideo}
												onClick={() =>
													openPublishDialog(platform.id as PublishPlatform)
												}
											>
												{isResolving ? (
													<Loader2 className="h-3 w-3 animate-spin" />
												) : (
													"Publish"
												)}
											</Button>
										) : (
											<Link
												href="/settings?tab=connections"
												onClick={() => setOpen(false)}
												className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
											>
												Connect <ExternalLink width={10} />
											</Link>
										)}
									</div>
								);
							})}
						</div>
					)}

					<p className="text-xs leading-relaxed text-muted-foreground">
						Connect accounts in{" "}
						<Link
							href="/settings?tab=connections"
							className="text-primary hover:underline"
							onClick={() => setOpen(false)}
						>
							Settings
						</Link>{" "}
						to publish directly. Export the video first to enable Publish.
					</p>
				</PopoverContent>
			</Popover>

			<Dialog
				open={activePlatform === "youtube"}
				onOpenChange={(o) => !o && stage !== "uploading" && closeDialog()}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							{stage === "success"
								? "Published to YouTube"
								: stage === "error"
									? "Upload failed"
									: "Publish to YouTube"}
						</DialogTitle>
					</DialogHeader>

					{stage === "form" && (
						<div className="space-y-4 py-2">
							<div className="space-y-2">
								<Label htmlFor="np-yt-title">Title</Label>
								<Input
									id="np-yt-title"
									value={youtubeTitle}
									onChange={(e) => setYoutubeTitle(e.target.value)}
									maxLength={100}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="np-yt-desc">Description (optional)</Label>
								<Textarea
									id="np-yt-desc"
									value={youtubeDescription}
									onChange={(e) => setYoutubeDescription(e.target.value)}
									maxLength={5000}
								/>
							</div>
							<p className="text-xs text-muted-foreground">
								Videos are uploaded as <strong>private</strong> by default. You
								can change visibility on YouTube Studio.
							</p>
							<div className="flex justify-end gap-2">
								<Button variant="outline" onClick={closeDialog}>
									Cancel
								</Button>
								<Button onClick={doPublish}>Upload to YouTube</Button>
							</div>
						</div>
					)}

					{stage === "uploading" && (
						<UploadingView label={progressLabel} />
					)}

					{stage === "success" && publishResult && (
						<SuccessView result={publishResult} onClose={closeDialog} />
					)}

					{stage === "error" && (
						<ErrorView
							message={publishError}
							onRetry={() => setStage("form")}
							onClose={closeDialog}
						/>
					)}
				</DialogContent>
			</Dialog>

			<Dialog
				open={activePlatform === "instagram"}
				onOpenChange={(o) => !o && stage !== "uploading" && closeDialog()}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							{stage === "success"
								? "Published to Instagram"
								: stage === "error"
									? "Upload failed"
									: "Publish to Instagram"}
						</DialogTitle>
					</DialogHeader>

					{stage === "form" && (
						<div className="space-y-4 py-2">
							<div className="space-y-2">
								<Label htmlFor="np-ig-cap">Caption (optional)</Label>
								<Textarea
									id="np-ig-cap"
									value={caption}
									onChange={(e) => setCaption(e.target.value)}
									placeholder="Write a caption..."
									maxLength={2200}
								/>
							</div>
							<div className="flex justify-end gap-2">
								<Button variant="outline" onClick={closeDialog}>
									Cancel
								</Button>
								<Button onClick={doPublish}>Share to Instagram</Button>
							</div>
						</div>
					)}

					{stage === "uploading" && (
						<UploadingView label={progressLabel} />
					)}

					{stage === "success" && publishResult && (
						<SuccessView result={publishResult} onClose={closeDialog} />
					)}

					{stage === "error" && (
						<ErrorView
							message={publishError}
							onRetry={() => setStage("form")}
							onClose={closeDialog}
						/>
					)}
				</DialogContent>
			</Dialog>

			<Dialog
				open={activePlatform === "tiktok"}
				onOpenChange={(o) => !o && stage !== "uploading" && closeDialog()}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							{stage === "success"
								? "Published to TikTok"
								: stage === "error"
									? "Upload failed"
									: "Publish to TikTok"}
						</DialogTitle>
					</DialogHeader>

					{stage === "form" && (
						<div className="space-y-4 py-2">
							<div className="space-y-2">
								<Label htmlFor="np-tt-cap">Caption (optional)</Label>
								<Textarea
									id="np-tt-cap"
									value={caption}
									onChange={(e) => setCaption(e.target.value)}
									placeholder="Write a caption..."
									maxLength={2200}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="np-tt-priv">Who can view</Label>
								<select
									id="np-tt-priv"
									value={tiktokPrivacy}
									onChange={(e) =>
										setTiktokPrivacy(e.target.value as TikTokPrivacy)
									}
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								>
									<option value="SELF_ONLY">Only me</option>
									<option value="MUTUAL_FOLLOW_FRIENDS">Friends</option>
									<option value="FOLLOWER_OF_CREATOR">Followers</option>
									<option value="PUBLIC_TO_EVERYONE">Everyone</option>
								</select>
							</div>
							<div className="flex justify-end gap-2">
								<Button variant="outline" onClick={closeDialog}>
									Cancel
								</Button>
								<Button onClick={doPublish}>Upload to TikTok</Button>
							</div>
						</div>
					)}

					{stage === "uploading" && (
						<UploadingView label={progressLabel} />
					)}

					{stage === "success" && publishResult && (
						<SuccessView result={publishResult} onClose={closeDialog} />
					)}

					{stage === "error" && (
						<ErrorView
							message={publishError}
							onRetry={() => setStage("form")}
							onClose={closeDialog}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
};

function UploadingView({ label }: { label: string }) {
	return (
		<div className="flex flex-col items-center gap-4 py-8">
			<div className="relative">
				<Loader2 className="h-10 w-10 animate-spin text-primary" />
			</div>
			<p className="text-sm text-foreground">{label}</p>
			<p className="text-xs text-muted-foreground text-center max-w-[280px]">
				Don't close this window — large videos can take a few minutes.
			</p>
		</div>
	);
}

function SuccessView({
	result,
	onClose,
}: {
	result: PublishResult;
	onClose: () => void;
}) {
	const [copied, setCopied] = useState(false);
	return (
		<div className="space-y-4 py-2">
			<div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2.5">
				<CheckCircle2 className="h-5 w-5 text-green-500 flex-none" />
				<div className="text-sm">
					<div className="font-medium">
						Successfully published to{" "}
						{result.platform === "youtube"
							? "YouTube"
							: result.platform === "instagram"
								? "Instagram"
								: "TikTok"}
					</div>
					{result.privacy && (
						<div className="text-xs text-muted-foreground">
							Visibility: {result.privacy}
						</div>
					)}
				</div>
			</div>

			{result.embedUrl && result.platform === "youtube" && (
				<div className="overflow-hidden rounded-lg border border-border/60 bg-black aspect-video">
					<iframe
						src={result.embedUrl}
						title="Published video"
						className="w-full h-full"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
					/>
				</div>
			)}

			{result.url && (
				<div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/40 px-3 py-2 text-xs">
					<span className="flex-1 truncate font-mono text-muted-foreground">
						{result.url}
					</span>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 px-2 text-xs"
						onClick={async () => {
							if (!result.url) return;
							await navigator.clipboard.writeText(result.url);
							setCopied(true);
							setTimeout(() => setCopied(false), 1500);
						}}
					>
						{copied ? (
							<Check className="h-3 w-3" />
						) : (
							"Copy"
						)}
					</Button>
				</div>
			)}

			<div className="flex justify-end gap-2">
				{result.url && (
					<Button
						variant="outline"
						onClick={() => window.open(result.url, "_blank")}
					>
						<ExternalLink className="h-4 w-4 mr-1.5" />
						Open
					</Button>
				)}
				<Button onClick={onClose}>Done</Button>
			</div>
		</div>
	);
}

function ErrorView({
	message,
	onRetry,
	onClose,
}: {
	message: string | null;
	onRetry: () => void;
	onClose: () => void;
}) {
	return (
		<div className="space-y-4 py-2">
			<div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5">
				<AlertCircle className="h-5 w-5 text-destructive flex-none mt-0.5" />
				<div className="text-sm">
					<div className="font-medium">Upload failed</div>
					<div className="text-xs text-muted-foreground mt-1">
						{message ?? "Something went wrong."}
					</div>
				</div>
			</div>
			<div className="flex justify-end gap-2">
				<Button variant="outline" onClick={onClose}>
					Close
				</Button>
				<Button onClick={onRetry}>Try Again</Button>
			</div>
		</div>
	);
}

// ─── Export ─────────────────────────────────────────────────────────────────

const EXPORT_FORMATS: {
	id: ExportFormat;
	codec: string;
	container: string;
	description: string;
	badge?: string;
	badgeColor?: string;
}[] = [
	{
		id: "mp4",
		codec: "H.264",
		container: "MP4",
		description: "Universal · social ready",
		badge: "Recommended",
		badgeColor: "bg-primary/15 text-primary",
	},
	{
		id: "mp4-hevc",
		codec: "H.265",
		container: "MP4",
		description: "~50% smaller file size",
		badge: "Best quality",
		badgeColor: "bg-green-500/15 text-green-600",
	},
	{
		id: "webm",
		codec: "VP9",
		container: "WebM",
		description: "Optimised for web",
	},
	{
		id: "gif",
		codec: "GIF",
		container: "",
		description: "No audio · short clips",
	},
];

function formatDuration(ms: number): string {
	const totalSecs = Math.floor(ms / 1000);
	const mins = Math.floor(totalSecs / 60);
	const secs = totalSecs % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const DownloadPopover = ({
	stateManager,
	projectId,
}: { stateManager: StateManager; projectId?: string }) => {
	const isMediumScreen = useIsMediumScreen();
	const { actions, exportType } = useDownloadState();
	const { duration, tracks, size, fps } = useStore();
	const [open, setOpen] = useState(false);

	const handleExport = () => {
		const trackItemIds = [...tracks]
			.reverse()
			.flatMap((t: any) => (t.items ?? t.trackItemIds ?? []) as string[]);

		const data: IDesign = {
			id: generateId(),
			...stateManager.toJSON(),
			duration,
			trackItemIds,
		};
		if (projectId) {
			actions.setProjectId(projectId);
		} else {
			console.warn("⚠️ No projectId available for export");
		}
		actions.setState({ payload: data });
		actions.startExport();
		setOpen(false);
	};

	const selectedFormat = EXPORT_FORMATS.find((f) => f.id === exportType) ?? EXPORT_FORMATS[0];
	const exportLabel = selectedFormat.container
		? `${selectedFormat.container} · ${selectedFormat.codec}`
		: selectedFormat.codec;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					className="flex h-7 gap-1.5 border border-border rounded-xl"
					size={isMediumScreen ? "sm" : "icon"}
				>
					<Download width={15} />
					<span className="hidden md:block text-xs">Export</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="bg-sidebar z-[250] w-80 p-0 rounded-2xl border-border/60 overflow-hidden shadow-xl"
			>
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50">
					<div className="flex items-center gap-2.5">
						<div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-none">
							<Download className="w-3.5 h-3.5 text-primary" />
						</div>
						<span className="text-sm font-semibold">Export Video</span>
					</div>
					<div className="flex items-center gap-1 text-[11px] text-muted-foreground">
						<span>{formatDuration(duration)}</span>
						<span className="opacity-40">·</span>
						<span>{size.width}×{size.height}</span>
						<span className="opacity-40">·</span>
						<span>{fps}fps</span>
					</div>
				</div>

				{/* Format grid */}
				<div className="p-3 grid grid-cols-2 gap-1.5">
					{EXPORT_FORMATS.map((fmt) => {
						const selected = exportType === fmt.id;
						return (
							<button
								key={fmt.id}
								onClick={() => actions.setExportType(fmt.id)}
								className={`relative flex flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 text-left transition-all border ${
									selected
										? "border-primary/60 bg-primary/5 text-foreground"
										: "border-border/50 bg-transparent hover:bg-muted/50 text-foreground"
								}`}
							>
								<div className="flex items-center justify-between w-full gap-1">
									<span className="text-xs font-semibold leading-tight">
										{fmt.container ? `${fmt.codec}` : fmt.codec}
									</span>
									{selected && (
										<Check className="w-3 h-3 text-primary flex-none" />
									)}
								</div>
								{fmt.container && (
									<span className="text-[10px] text-muted-foreground leading-tight">
										{fmt.container}
									</span>
								)}
								<span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
									{fmt.description}
								</span>
								{fmt.badge && (
									<span className={`mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${fmt.badgeColor}`}>
										{fmt.badge}
									</span>
								)}
							</button>
						);
					})}
				</div>

				{/* JSON export link */}
				<div className="flex justify-center pb-1">
					<button
						onClick={() => actions.setExportType("json")}
						className={`text-[11px] transition-colors px-2 py-1 rounded-lg ${
							exportType === "json"
								? "text-primary font-medium"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						{exportType === "json" && <Check className="w-3 h-3 inline mr-1" />}
						Export as JSON
					</button>
				</div>

				{/* Export button */}
				<div className="px-3 pb-3">
					<Button
						onClick={handleExport}
						className="w-full rounded-xl h-9 text-sm font-medium gap-2"
					>
						<Download className="w-3.5 h-3.5" />
						Export {exportLabel}
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
};

// ─── Resize (kept for future use) ───────────────────────────────────────────

interface ResizeOptionProps {
	label: string;
	icon: string;
	value: ResizeValue;
	description: string;
}

interface ResizeValue {
	width: number;
	height: number;
	name: string;
}

const RESIZE_OPTIONS: ResizeOptionProps[] = [
	{
		label: "16:9",
		icon: "landscape",
		description: "YouTube ads",
		value: { width: 1920, height: 1080, name: "16:9" },
	},
	{
		label: "9:16",
		icon: "portrait",
		description: "TikTok, YouTube Shorts",
		value: { width: 1080, height: 1920, name: "9:16" },
	},
	{
		label: "1:1",
		icon: "square",
		description: "Instagram, Facebook posts",
		value: { width: 1080, height: 1080, name: "1:1" },
	},
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ResizeVideo = () => {
	const handleResize = (options: ResizeValue) => {
		dispatch(DESIGN_RESIZE, { payload: { ...options } });
	};
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button className="z-10 h-8 gap-2 rounded-xl" variant="outline" size="sm">
					<ProportionsIcon className="h-4 w-4" />
					<div>Resize</div>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="z-[250] w-60 px-2.5 py-3 rounded-2xl border-border/60">
				<div className="text-sm">
					{RESIZE_OPTIONS.map((option, index) => (
						<ResizeOption
							key={index}
							label={option.label}
							icon={option.icon}
							value={option.value}
							handleResize={handleResize}
							description={option.description}
						/>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
};

const ResizeOption = ({
	label,
	icon,
	value,
	description,
	handleResize,
}: ResizeOptionProps & { handleResize: (payload: ResizeValue) => void }) => {
	const Icon = Icons[icon as "text"];
	return (
		<div
			onClick={() => handleResize(value)}
			className="flex cursor-pointer items-center rounded-xl p-2.5 hover:bg-muted/50 transition-colors"
		>
			<div className="w-8 text-muted-foreground">
				<Icon size={20} />
			</div>
			<div>
				<div>{label}</div>
				<div className="text-xs text-muted-foreground">{description}</div>
			</div>
		</div>
	);
};

// ─── Save ────────────────────────────────────────────────────────────────────

const SaveButton = ({
	projectId,
	stateManager,
}: {
	projectId?: string;
	stateManager: StateManager;
}) => {
	const isMediumScreen = useIsMediumScreen();
	const [saving, setSaving] = useState(false);

	const handleSave = async () => {
		if (!projectId) {
			console.error("❌ No projectId provided to SaveButton");
			toast.error("Project ID not found. Cannot save.");
			return;
		}

		setSaving(true);
		try {
			const state = stateManager.toJSON();

			if (!state.trackItemIds) {
				console.warn("⚠️ trackItemIds is missing in state to save");
			}

			const token = await getIdToken();
			if (!token) {
				toast.error("Not authenticated. Please log in.");
				return;
			}

			let response: Response;
			try {
				response = await fetch(`/api/projects/${projectId}`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ editor_state: state }),
				});
			} catch (fetchErr) {
				const msg =
					fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
				console.error("❌ Fetch failed (network error):", msg);
				toast.error(`Network error: ${msg}`);
				return;
			}

			const responseText = await response.text();
			let responseData: any = {};
			try {
				responseData = JSON.parse(responseText);
			} catch {
				/* raw text */
			}

			if (response.ok) {
				toast.success("Project saved successfully");
			} else {
				const errMsg =
					responseData.message ||
					responseData.error ||
					`HTTP ${response.status}: ${response.statusText}`;
				console.error("❌ Save failed:", response.status, responseData);
				toast.error(`Save failed: ${errMsg}`);
			}
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			console.error("💥 Unexpected save error:", msg, error);
			toast.error(`Save error: ${msg}`);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Button
			onClick={handleSave}
			disabled={saving}
			className="flex h-8 gap-1.5 border border-border/60 rounded-xl"
			variant="outline"
			size={isMediumScreen ? "sm" : "icon"}
		>
			{saving ? (
				<Loader2 className="animate-spin" width={16} />
			) : (
				<Save width={16} />
			)}
			<span className="hidden md:block">Save</span>
		</Button>
	);
};
