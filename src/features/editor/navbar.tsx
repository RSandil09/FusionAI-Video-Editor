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
} from "lucide-react";
import { Label } from "@/components/ui/label";
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
					<PublishPopover />
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

const PublishPopover = () => {
	const [open, setOpen] = useState(false);
	const [connections, setConnections] = useState<SocialConnection[]>([]);
	const [loading, setLoading] = useState(false);

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

	return (
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
							const conn = connections.find((c) => c.provider === platform.id);
							return (
								<div
									key={platform.id}
									className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5"
								>
									<div className="flex items-center gap-2.5">
										<div className={`h-2 w-2 rounded-full ${platform.dot}`} />
										<div>
											<div className="text-sm font-medium">{platform.label}</div>
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
											onClick={() =>
												toast.info(`Publishing to ${platform.label} coming soon`)
											}
										>
											Publish
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
					to publish directly.
				</p>
			</PopoverContent>
		</Popover>
	);
};

// ─── Export ─────────────────────────────────────────────────────────────────

const EXPORT_FORMATS: {
	id: ExportFormat;
	label: string;
	description: string;
	badge?: string;
	badgeColor?: string;
}[] = [
	{
		id: "mp4",
		label: "MP4 — H.264",
		description: "Works everywhere, social media ready",
		badge: "Recommended",
		badgeColor: "bg-primary/15 text-primary",
	},
	{
		id: "mp4-hevc",
		label: "MP4 — H.265",
		description: "Same quality, ~50% smaller file",
		badge: "Best quality",
		badgeColor: "bg-green-500/15 text-green-500",
	},
	{
		id: "webm",
		label: "WebM — VP9",
		description: "Optimised for web embedding",
	},
	{
		id: "gif",
		label: "GIF",
		description: "Short clips only, no audio",
	},
	{
		id: "json",
		label: "JSON",
		description: "Export raw project data",
	},
];

const DownloadPopover = ({
	stateManager,
	projectId,
}: { stateManager: StateManager; projectId?: string }) => {
	const isMediumScreen = useIsMediumScreen();
	const { actions, exportType } = useDownloadState();
	const { duration, tracks } = useStore();
	const [isExportTypeOpen, setIsExportTypeOpen] = useState(false);
	const [open, setOpen] = useState(false);

	const selectedFormat = EXPORT_FORMATS.find((f) => f.id === exportType) ?? EXPORT_FORMATS[0];

	const handleExport = () => {
		// Recompute trackItemIds from the live Zustand tracks array so the
		// exported render order always matches the current timeline visual order.
		// This corrects stale trackItemIds in projects saved before the drag-fix
		// AND ensures the Lambda composition renders the same z-order as the preview.
		// tracks[0] = top track = renders last (highest z-index) → reverse then flatten.
		const trackItemIds = [...tracks]
			.reverse()
			.flatMap((t: any) => (t.items ?? t.trackItemIds ?? []) as string[]);

		const data: IDesign = {
			id: generateId(),
			...stateManager.toJSON(),
			// Explicitly include duration from Zustand store — toJSON() may omit it
			duration,
			// Override with freshly recomputed order — never trust persisted trackItemIds
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

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					className="flex h-7 gap-1 border border-border"
					size={isMediumScreen ? "sm" : "icon"}
				>
					<Download width={18} />
					<span className="hidden md:block">Export</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="bg-sidebar z-[250] flex w-72 flex-col gap-4 rounded-2xl border-border/60 p-4"
			>
				<Label className="text-sm font-semibold">Export settings</Label>

				{/* Format selector */}
				<Popover open={isExportTypeOpen} onOpenChange={setIsExportTypeOpen}>
					<PopoverTrigger asChild>
						<Button
							className="w-full justify-between rounded-xl h-auto py-2.5 px-3"
							variant="outline"
						>
							<div className="text-left">
								<div className="text-sm font-medium">{selectedFormat.label}</div>
								<div className="text-xs text-muted-foreground">{selectedFormat.description}</div>
							</div>
							<ChevronDown width={14} className="shrink-0 ml-2 text-muted-foreground" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="bg-background z-[251] w-[--radix-popover-trigger-width] px-2 py-2 rounded-xl">
						{EXPORT_FORMATS.map((fmt) => (
							<div
								key={fmt.id}
								className={`flex items-center justify-between rounded-lg px-3 py-2 hover:cursor-pointer hover:bg-muted/60 transition-colors ${
									exportType === fmt.id ? "bg-muted/40" : ""
								}`}
								onClick={() => {
									actions.setExportType(fmt.id);
									setIsExportTypeOpen(false);
								}}
							>
								<div>
									<div className="text-sm font-medium">{fmt.label}</div>
									<div className="text-xs text-muted-foreground">{fmt.description}</div>
								</div>
								{fmt.badge && (
									<span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ml-2 shrink-0 ${fmt.badgeColor}`}>
										{fmt.badge}
									</span>
								)}
							</div>
						))}
					</PopoverContent>
				</Popover>

				<Button onClick={handleExport} className="w-full rounded-xl">
					Export {selectedFormat.label.split("—")[0].trim()}
				</Button>
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
