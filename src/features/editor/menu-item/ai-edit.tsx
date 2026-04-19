import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getIdToken } from "@/lib/auth/client";
import { dispatch } from "@designcombo/events";
import { PLAYER_SEEK } from "../constants/events";
import useStore from "../store/use-store";
import { ITrackItem } from "@designcombo/types";
import {
	useSmartEditStore,
	type AnalysisResult,
	type AnalysisSegment,
} from "../store/use-smart-edit-store";
import {
	Loader2,
	Wand2,
	Scissors,
	VolumeX,
	Sparkles,
	Play,
	Film,
	X,
	History,
	Trash2,
	ChevronDown,
	ChevronRight,
	Clock,
	Zap,
} from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// ── Analysis type definitions ────────────────────────────────────────────────

const ANALYSIS_TYPES = [
	{
		value: "scenes",
		label: "Scene Detection",
		description: "Detect cuts & scene transitions",
		icon: Scissors,
		gradient: "from-blue-500/20 to-indigo-600/10",
		border: "border-blue-500/25",
		activeBorder: "border-blue-400/60",
		activeGlow: "shadow-blue-500/20",
		iconColor: "text-blue-400",
		iconBg: "bg-blue-500/15",
		badgeColor: "bg-blue-500/15 text-blue-300 border-blue-500/20",
		segmentColor: "bg-blue-500",
		segmentBg: "bg-blue-500/10",
		segmentBorder: "border-blue-500/20",
	},
	{
		value: "silences",
		label: "Silence Detection",
		description: "Find silent segments to remove",
		icon: VolumeX,
		gradient: "from-amber-500/20 to-orange-600/10",
		border: "border-amber-500/25",
		activeBorder: "border-amber-400/60",
		activeGlow: "shadow-amber-500/20",
		iconColor: "text-amber-400",
		iconBg: "bg-amber-500/15",
		badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/20",
		segmentColor: "bg-amber-500",
		segmentBg: "bg-amber-500/10",
		segmentBorder: "border-amber-500/20",
	},
	{
		value: "highlights",
		label: "Auto Highlights",
		description: "AI picks the best moments",
		icon: Sparkles,
		gradient: "from-violet-500/20 to-purple-600/10",
		border: "border-violet-500/25",
		activeBorder: "border-violet-400/60",
		activeGlow: "shadow-violet-500/20",
		iconColor: "text-violet-400",
		iconBg: "bg-violet-500/15",
		badgeColor: "bg-violet-500/15 text-violet-300 border-violet-500/20",
		segmentColor: "bg-violet-500",
		segmentBg: "bg-violet-500/10",
		segmentBorder: "border-violet-500/20",
	},
] as const;

type AnalysisTypeValue = (typeof ANALYSIS_TYPES)[number]["value"];

interface HistoryItem {
	id: string;
	analysis_type: string;
	video_url: string;
	video_name: string | null;
	segments: AnalysisSegment[];
	created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const getVideoLabel = (item: ITrackItem, index: number): string => {
	const src = (item.details as any)?.src as string | undefined;
	if (src) {
		try {
			const pathname = new URL(src).pathname;
			const filename = decodeURIComponent(pathname.split("/").pop() ?? "");
			const cleaned = filename.replace(/^[a-f0-9-]{8,}_/i, "");
			if (cleaned && cleaned !== "undefined") return cleaned;
		} catch {
			const filename = src.split("/").pop()?.split("?")[0] ?? "";
			const decoded = decodeURIComponent(filename);
			if (decoded && decoded !== "undefined") return decoded;
		}
	}
	return `Video ${index + 1}`;
};

const formatTime = (seconds: number): string => {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	const ms = Math.floor((seconds % 1) * 100);
	return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
};

const formatHistoryDate = (iso: string) => {
	const d = new Date(iso);
	const now = new Date();
	const diff = now.getTime() - d.getTime();
	if (diff < 60000) return "Just now";
	if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
	if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
	return d.toLocaleDateString();
};

const getTypeConfig = (value: string) =>
	ANALYSIS_TYPES.find((t) => t.value === value) ?? ANALYSIS_TYPES[0];

// ── Main Component ────────────────────────────────────────────────────────────

export const AiEdit = ({ projectId }: { projectId?: string }) => {
	const { trackItemsMap } = useStore();
	const {
		analysisResult,
		resultsExpanded,
		setAnalysisResult,
		setResultsExpanded,
		clearResults,
	} = useSmartEditStore();

	const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
	const [analysisType, setAnalysisType] = useState<AnalysisTypeValue>("scenes");
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [videoItems, setVideoItems] = useState<ITrackItem[]>([]);
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [historyOpen, setHistoryOpen] = useState(false);

	useEffect(() => {
		const videos = Object.values(trackItemsMap).filter(
			(item) => item.type === "video",
		);
		setVideoItems(videos);
		if (videos.length > 0 && !selectedVideo) {
			setSelectedVideo(videos[0].id);
		}
	}, [trackItemsMap, selectedVideo]);

	useEffect(() => {
		if (!projectId) return;
		const fetchHistory = async () => {
			setHistoryLoading(true);
			try {
				const token = await getIdToken();
				const res = await fetch(
					`/api/analysis-history?projectId=${encodeURIComponent(projectId)}&limit=20`,
					{ headers: token ? { Authorization: `Bearer ${token}` } : {} },
				);
				if (res.ok) {
					const { history: h } = await res.json();
					setHistory(h || []);
				}
			} catch (err) {
				console.error("Failed to fetch analysis history:", err);
			} finally {
				setHistoryLoading(false);
			}
		};
		fetchHistory();
	}, [projectId]);

	const handleAnalyze = async () => {
		if (!selectedVideo) {
			toast.error("Please select a video to analyze");
			return;
		}
		const selectedItem = videoItems.find((v) => v.id === selectedVideo);
		if (!selectedItem) {
			toast.error("Selected video not found");
			return;
		}
		const selectedSrc = (selectedItem.details as any).src as string;

		setIsAnalyzing(true);
		setAnalysisResult(null);

		try {
			const videoUrl =
				selectedSrc.startsWith("/") && typeof window !== "undefined"
					? `${window.location.origin}${selectedSrc}`
					: selectedSrc;

			const token = await getIdToken();
			const response = await fetch("/api/analyze-video", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({ videoUrl, analysisType }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `HTTP ${response.status}`);
			}

			const data = await response.json();

			if (data.analysis) {
				setAnalysisResult(data.analysis);
				if (projectId && data.analysis.segments?.length > 0) {
					const videoName = videoItems.find(
						(v) => v.id === selectedVideo,
					)?.name;
					try {
						const token2 = await getIdToken();
						const saveRes = await fetch("/api/analysis-history", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								...(token2 ? { Authorization: `Bearer ${token2}` } : {}),
							},
							body: JSON.stringify({
								projectId,
								analysis: {
									type: data.analysis.type,
									segments: data.analysis.segments,
									videoUrl: data.analysis.videoUrl,
									videoName: videoName || undefined,
								},
							}),
						});
						if (saveRes.ok) {
							const { saved } = await saveRes.json();
							setHistory((prev) => [saved, ...prev].slice(0, 20));
						}
					} catch (e) {
						console.warn("Failed to save analysis to history:", e);
					}
				}
				toast.success(
					data.analysis.segments.length > 0
						? `Found ${data.analysis.segments.length} ${analysisType}`
						: `Analysis complete. No ${analysisType} detected.`,
				);
			}
		} catch (error) {
			console.error("Error analyzing video:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to analyze video. Please try again.",
			);
		} finally {
			setIsAnalyzing(false);
		}
	};

	const handleSeekToSegment = (startTime: number) => {
		dispatch(PLAYER_SEEK, { payload: { time: startTime * 1000 } });
	};

	const handleSelectHistory = (item: HistoryItem) => {
		setAnalysisResult({
			type: item.analysis_type,
			segments: item.segments,
			videoUrl: item.video_url,
		});
	};

	const handleDeleteHistory = async (e: React.MouseEvent, id: string) => {
		e.stopPropagation();
		try {
			const token = await getIdToken();
			const res = await fetch(`/api/analysis-history/${id}`, {
				method: "DELETE",
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			});
			if (res.ok) setHistory((prev) => prev.filter((h) => h.id !== id));
		} catch {
			toast.error("Failed to delete");
		}
	};

	const activeType = getTypeConfig(analysisType);
	const ActiveIcon = activeType.icon;

	// ── Render ─────────────────────────────────────────────────────────────────
	return (
		<div className="flex flex-col h-full overflow-hidden bg-gradient-to-b from-background to-muted/20">
			{/* ── Header ──────────────────────────────────────────────────────── */}
			<div className="flex-none px-5 py-4 border-b border-border/30 bg-background/80 backdrop-blur-sm">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/25 to-purple-600/15 border border-violet-500/25 shadow-sm">
						<Wand2 className="w-4 h-4 text-violet-400" />
					</div>
					<div>
						<h2 className="text-[15px] font-semibold text-foreground tracking-tight">
							Smart Edit
						</h2>
						<p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
							AI-powered video analysis
						</p>
					</div>
				</div>
			</div>

			<ScrollArea className="flex-1 min-h-0">
				<div className="flex flex-col gap-5 px-4 py-4 pb-8">
					{/* ── Empty state ─────────────────────────────────────────── */}
					{videoItems.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
							<div className="relative">
								<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/10 border border-violet-500/20 flex items-center justify-center shadow-lg shadow-violet-500/10">
									<Film className="w-7 h-7 text-violet-400/70" />
								</div>
								<div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-muted border border-border flex items-center justify-center">
									<Wand2 className="w-3 h-3 text-muted-foreground" />
								</div>
							</div>
							<div>
								<p className="text-sm font-semibold text-foreground">
									No videos in timeline
								</p>
								<p className="text-xs text-muted-foreground mt-1.5 max-w-[200px] leading-relaxed">
									Add a video clip to the timeline to start AI analysis
								</p>
							</div>
						</div>
					) : (
						<>
							{/* ── Video selector ──────────────────────────────── */}
							<div className="space-y-2">
								<label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
									<Film className="w-3 h-3 text-muted-foreground" />
									Video clip
								</label>
								<Select
									value={selectedVideo || undefined}
									onValueChange={setSelectedVideo}
									disabled={isAnalyzing}
								>
									<SelectTrigger className="rounded-xl h-10 bg-muted/30 border-border/40 text-sm focus:ring-1 focus:ring-ring/30">
										<SelectValue placeholder="Select a video clip…" />
									</SelectTrigger>
									<SelectContent className="z-[200] rounded-xl">
										{videoItems.map((video, index) => (
											<SelectItem
												key={video.id}
												value={video.id}
												className="rounded-lg"
											>
												{getVideoLabel(video, index)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* ── Analysis type cards ──────────────────────────── */}
							<div className="space-y-2">
								<label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
									<Zap className="w-3 h-3 text-muted-foreground" />
									Analysis mode
								</label>
								<div className="grid grid-cols-1 gap-2">
									{ANALYSIS_TYPES.map((type) => {
										const Icon = type.icon;
										const isSelected = analysisType === type.value;
										return (
											<button
												key={type.value}
												type="button"
												disabled={isAnalyzing}
												onClick={() => setAnalysisType(type.value)}
												className={[
													"relative w-full text-left rounded-xl border p-3.5 transition-all duration-200 group overflow-hidden",
													isSelected
														? `bg-gradient-to-r ${type.gradient} ${type.activeBorder} shadow-lg ${type.activeGlow}`
														: `bg-muted/20 ${type.border} hover:bg-muted/40 hover:border-border/60`,
													isAnalyzing ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
												].join(" ")}
											>
												{/* Subtle background glow on selected */}
												{isSelected && (
													<div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
												)}
												<div className="flex items-center gap-3">
													<div
														className={[
															"flex h-9 w-9 items-center justify-center rounded-lg flex-none transition-all duration-200",
															isSelected ? type.iconBg : "bg-muted/60 group-hover:bg-muted",
														].join(" ")}
													>
														<Icon
															className={[
																"w-4 h-4 transition-colors duration-200",
																isSelected ? type.iconColor : "text-muted-foreground group-hover:text-foreground/70",
															].join(" ")}
														/>
													</div>
													<div className="flex-1 min-w-0">
														<p
															className={[
																"text-sm font-semibold leading-tight transition-colors",
																isSelected ? "text-foreground" : "text-foreground/80",
															].join(" ")}
														>
															{type.label}
														</p>
														<p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
															{type.description}
														</p>
													</div>
													{/* Selection indicator */}
													<div
														className={[
															"w-2 h-2 rounded-full flex-none transition-all duration-200",
															isSelected ? `${type.segmentColor} shadow-sm` : "bg-border",
														].join(" ")}
													/>
												</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* ── Analyze button ───────────────────────────────── */}
							<Button
								onClick={handleAnalyze}
								disabled={!selectedVideo || isAnalyzing}
								className={[
									"w-full h-11 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm",
									!isAnalyzing
										? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-violet-500/25 hover:shadow-violet-500/40 hover:shadow-md"
										: "",
								].join(" ")}
							>
								{isAnalyzing ? (
									<span className="flex items-center gap-2">
										<Loader2 className="h-4 w-4 animate-spin" />
										Analyzing video…
									</span>
								) : (
									<span className="flex items-center gap-2">
										<ActiveIcon className="h-4 w-4" />
										Analyze with {activeType.label}
									</span>
								)}
							</Button>

							{/* ── Results panel ────────────────────────────────── */}
							{analysisResult && (
								<ResultsPanel
									analysisResult={analysisResult}
									resultsExpanded={resultsExpanded}
									setResultsExpanded={setResultsExpanded}
									clearResults={clearResults}
									onSeek={handleSeekToSegment}
									formatTime={formatTime}
								/>
							)}

							{/* ── History section ──────────────────────────────── */}
							{projectId && (
								<HistorySection
									history={history}
									historyLoading={historyLoading}
									historyOpen={historyOpen}
									setHistoryOpen={setHistoryOpen}
									analysisResult={analysisResult}
									onSelectHistory={handleSelectHistory}
									onDeleteHistory={handleDeleteHistory}
									formatHistoryDate={formatHistoryDate}
								/>
							)}
						</>
					)}
				</div>
			</ScrollArea>
		</div>
	);
};

// ── Results Panel ─────────────────────────────────────────────────────────────

const ResultsPanel = ({
	analysisResult,
	resultsExpanded,
	setResultsExpanded,
	clearResults,
	onSeek,
	formatTime,
}: {
	analysisResult: AnalysisResult;
	resultsExpanded: boolean;
	setResultsExpanded: (v: boolean) => void;
	clearResults: () => void;
	onSeek: (s: number) => void;
	formatTime: (s: number) => string;
}) => {
	const config = getTypeConfig(analysisResult.type);
	const Icon = config.icon;
	const count = analysisResult.segments.length;

	return (
		<div
			className={[
				"rounded-2xl border overflow-hidden transition-all duration-200",
				config.segmentBorder,
				config.segmentBg,
			].join(" ")}
		>
			{/* Results header */}
			<button
				type="button"
				onClick={() => setResultsExpanded(!resultsExpanded)}
				className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
			>
				<div
					className={[
						"flex h-8 w-8 items-center justify-center rounded-lg flex-none",
						config.iconBg,
					].join(" ")}
				>
					<Icon className={["w-3.5 h-3.5", config.iconColor].join(" ")} />
				</div>
				<div className="flex-1 text-left min-w-0">
					<p className="text-sm font-semibold text-foreground leading-tight">
						{config.label}
					</p>
					<p className="text-[11px] text-muted-foreground mt-0.5">
						{count > 0
							? `${count} segment${count !== 1 ? "s" : ""} found · click to seek`
							: "No segments detected"}
					</p>
				</div>
				<div className="flex items-center gap-2 flex-none">
					<span
						className={[
							"text-xs font-semibold px-2 py-0.5 rounded-full border",
							config.badgeColor,
						].join(" ")}
					>
						{count}
					</span>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							clearResults();
						}}
						className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
						title="Clear results"
					>
						<X className="w-3.5 h-3.5" />
					</button>
					{resultsExpanded ? (
						<ChevronDown className="w-4 h-4 text-muted-foreground" />
					) : (
						<ChevronRight className="w-4 h-4 text-muted-foreground" />
					)}
				</div>
			</button>

			{/* Segment list */}
			{resultsExpanded && (
				<div className="border-t border-border/30">
					{count === 0 ? (
						<div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
							<Film className="w-8 h-8 text-muted-foreground/40" />
							<p className="text-xs text-muted-foreground">
								No {analysisResult.type} detected in this video
							</p>
							<p className="text-[11px] text-muted-foreground/60">
								Try a different analysis mode
							</p>
						</div>
					) : (
						<div className="flex flex-col divide-y divide-border/20">
							{analysisResult.segments.map((segment, index) => (
								<SegmentRow
									key={index}
									index={index}
									segment={segment}
									config={config}
									formatTime={formatTime}
									onSeek={onSeek}
								/>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

// ── Segment Row ───────────────────────────────────────────────────────────────

const SegmentRow = ({
	index,
	segment,
	config,
	formatTime,
	onSeek,
}: {
	index: number;
	segment: AnalysisSegment;
	config: (typeof ANALYSIS_TYPES)[number];
	formatTime: (s: number) => string;
	onSeek: (s: number) => void;
}) => {
	const duration = segment.end - segment.start;

	return (
		<button
			type="button"
			onClick={() => onSeek(segment.start)}
			className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors group"
		>
			{/* Index + play indicator */}
			<div
				className={[
					"flex h-7 w-7 items-center justify-center rounded-lg flex-none text-[11px] font-bold transition-all duration-150",
					"bg-muted/60 text-muted-foreground",
					"group-hover:bg-primary/20 group-hover:text-primary",
				].join(" ")}
			>
				<span className="group-hover:hidden">{index + 1}</span>
				<Play className="w-3 h-3 hidden group-hover:block ml-0.5" />
			</div>

			{/* Segment info */}
			<div className="flex-1 min-w-0 space-y-1">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-[11px] font-mono text-muted-foreground">
						{formatTime(segment.start)}
					</span>
					<span className="text-[10px] text-muted-foreground/50">→</span>
					<span className="text-[11px] font-mono text-muted-foreground">
						{formatTime(segment.end)}
					</span>
					<span
						className={[
							"text-[10px] font-medium px-1.5 py-0.5 rounded-md border",
							config.badgeColor,
						].join(" ")}
					>
						{duration.toFixed(1)}s
					</span>
					{segment.confidence !== undefined && (
						<span className="text-[10px] text-muted-foreground/70">
							{Math.round(segment.confidence * 100)}%
						</span>
					)}
				</div>

				{/* Duration bar */}
				<div className="h-1 w-full rounded-full bg-muted/50 overflow-hidden">
					<div
						className={["h-full rounded-full opacity-60", config.segmentColor].join(" ")}
						style={{
							width: `${Math.min(100, Math.max(4, (duration / 30) * 100))}%`,
						}}
					/>
				</div>

				{segment.label && (
					<p className="text-[11px] text-foreground/70 leading-snug line-clamp-1">
						{segment.label}
					</p>
				)}
			</div>
		</button>
	);
};

// ── History Section ───────────────────────────────────────────────────────────

const HistorySection = ({
	history,
	historyLoading,
	historyOpen,
	setHistoryOpen,
	analysisResult,
	onSelectHistory,
	onDeleteHistory,
	formatHistoryDate,
}: {
	history: HistoryItem[];
	historyLoading: boolean;
	historyOpen: boolean;
	setHistoryOpen: (v: boolean) => void;
	analysisResult: AnalysisResult | null;
	onSelectHistory: (item: HistoryItem) => void;
	onDeleteHistory: (e: React.MouseEvent, id: string) => void;
	formatHistoryDate: (iso: string) => string;
}) => (
	<div className="rounded-xl border border-border/30 bg-muted/10 overflow-hidden">
		<button
			type="button"
			onClick={() => setHistoryOpen(!historyOpen)}
			className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-muted/30 transition-colors"
		>
			<History className="w-3.5 h-3.5 text-muted-foreground flex-none" />
			<span className="flex-1 text-left text-xs font-semibold text-foreground/80">
				Analysis History
			</span>
			{history.length > 0 && (
				<span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md font-medium">
					{history.length}
				</span>
			)}
			{historyOpen ? (
				<ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
			) : (
				<ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
			)}
		</button>

		{historyOpen && (
			<div className="border-t border-border/20">
				{historyLoading ? (
					<div className="flex items-center justify-center py-6">
						<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
					</div>
				) : history.length === 0 ? (
					<div className="flex flex-col items-center gap-2 py-6 text-center">
						<Clock className="w-6 h-6 text-muted-foreground/40" />
						<p className="text-xs text-muted-foreground">No past analyses yet</p>
					</div>
				) : (
					<div className="flex flex-col divide-y divide-border/20 max-h-52 overflow-y-auto overscroll-contain">
						{history.map((item) => {
							const typeConfig = getTypeConfig(item.analysis_type);
							const TypeIcon = typeConfig.icon;
							const isActive =
								analysisResult?.type === item.analysis_type &&
								analysisResult?.segments?.length === item.segments?.length;

							return (
								<button
									key={item.id}
									type="button"
									onClick={() => onSelectHistory(item)}
									className={[
										"w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors group",
										isActive
											? "bg-primary/10"
											: "hover:bg-muted/30",
									].join(" ")}
								>
									<div
										className={[
											"flex h-6 w-6 items-center justify-center rounded-md flex-none",
											typeConfig.iconBg,
										].join(" ")}
									>
										<TypeIcon
											className={["w-3 h-3", typeConfig.iconColor].join(" ")}
										/>
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-[11px] font-medium text-foreground/90 truncate">
											{typeConfig.label}
										</p>
										<p className="text-[10px] text-muted-foreground">
											{item.segments?.length ?? 0} segments ·{" "}
											{formatHistoryDate(item.created_at)}
										</p>
									</div>
									{isActive && (
										<div className="w-1.5 h-1.5 rounded-full bg-primary flex-none" />
									)}
									<button
										type="button"
										onClick={(e) => onDeleteHistory(e, item.id)}
										className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
										title="Delete"
									>
										<Trash2 className="w-3 h-3" />
									</button>
								</button>
							);
						})}
					</div>
				)}
			</div>
		)}
	</div>
);
