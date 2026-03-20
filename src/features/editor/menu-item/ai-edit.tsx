import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Loader2,
	Wand2,
	Scissors,
	VolumeX,
	Sparkles,
	Play,
	Check,
	Film,
	ChevronDown,
	ChevronUp,
	X,
	History,
	Trash2,
} from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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

const ANALYSIS_TYPES = [
	{
		value: "scenes",
		label: "Scene Detection",
		description: "Detect cuts and scene changes",
		icon: Scissors,
	},
	{
		value: "silences",
		label: "Silence Detection",
		description: "Find silent segments to remove",
		icon: VolumeX,
	},
	{
		value: "highlights",
		label: "Auto Highlights",
		description: "AI picks the best moments",
		icon: Sparkles,
	},
];

interface HistoryItem {
	id: string;
	analysis_type: string;
	video_url: string;
	video_name: string | null;
	segments: AnalysisSegment[];
	created_at: string;
}

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
	const [analysisType, setAnalysisType] = useState<string>("scenes");
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [videoItems, setVideoItems] = useState<ITrackItem[]>([]);
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [historyLoading, setHistoryLoading] = useState(false);

	useEffect(() => {
		const videos = Object.values(trackItemsMap).filter(
			(item) => item.type === "video",
		);
		setVideoItems(videos);
		if (videos.length > 0 && !selectedVideo) {
			setSelectedVideo(videos[0].details.src);
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

		setIsAnalyzing(true);
		setAnalysisResult(null);

		try {
			const videoUrl =
				selectedVideo.startsWith("/") && typeof window !== "undefined"
					? `${window.location.origin}${selectedVideo}`
					: selectedVideo;

			const token = await getIdToken();
			const response = await fetch("/api/analyze-video", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify({
					videoUrl,
					analysisType,
				}),
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
						(v) => v.details.src === selectedVideo,
					)?.name;
					try {
						const token = await getIdToken();
						const saveRes = await fetch("/api/analysis-history", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								...(token ? { Authorization: `Bearer ${token}` } : {}),
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

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		const ms = Math.floor((seconds % 1) * 100);
		return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
	};

	const getAnalysisIcon = () => {
		const type = ANALYSIS_TYPES.find((t) => t.value === analysisType);
		return type?.icon || Wand2;
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
			if (res.ok) {
				setHistory((prev) => prev.filter((h) => h.id !== id));
			}
		} catch (err) {
			toast.error("Failed to delete");
		}
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

	const AnalysisIcon = getAnalysisIcon();

	return (
		<div className="flex flex-1 flex-col max-w-full min-h-0">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium gap-2 shrink-0">
				<Wand2 className="w-4 h-4" />
				Smart Editing
			</div>

			<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
				{/* Setup Section - Compact to maximize room for results */}
				<div className="flex-none space-y-2.5 px-3 pt-3 pb-2 border-b border-border/40 shrink-0">
					{videoItems.length === 0 ? (
						<div className="text-center py-6 text-muted-foreground">
							<Wand2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
							<p className="text-sm font-medium">No videos in timeline</p>
							<p className="text-xs mt-1">Add a video to use smart editing</p>
						</div>
					) : (
						<>
							<div className="space-y-2">
								<Label className="font-sans text-xs font-semibold">
									Select Video
								</Label>
								<Select
									value={selectedVideo || undefined}
									onValueChange={setSelectedVideo}
									disabled={isAnalyzing}
								>
									<SelectTrigger className="rounded-xl">
										<SelectValue placeholder="Select a video" />
									</SelectTrigger>
									<SelectContent className="z-[200]">
										{videoItems.map((video, index) => (
											<SelectItem key={video.id} value={video.details.src}>
												{video.name || `Video ${index + 1}`}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label className="font-sans text-xs font-semibold">
									Analysis Type
								</Label>
								<div className="grid grid-cols-1 gap-1.5">
									{ANALYSIS_TYPES.map((type) => {
										const Icon = type.icon;
										const isSelected = analysisType === type.value;
										return (
											<Card
												key={type.value}
												className={`p-2 cursor-pointer transition-all rounded-xl ${
													isSelected
														? "ring-2 ring-primary bg-primary/5"
														: "hover:bg-muted/50"
												}`}
												onClick={() =>
													!isAnalyzing && setAnalysisType(type.value)
												}
											>
												<div className="flex items-center gap-2">
													<div
														className={`p-1 rounded-lg ${
															isSelected ? "bg-primary/20" : "bg-muted"
														}`}
													>
														<Icon
															className={`w-3 h-3 ${
																isSelected
																	? "text-primary"
																	: "text-muted-foreground"
															}`}
														/>
													</div>
													<div className="flex-1 min-w-0">
														<p className="text-xs font-medium">{type.label}</p>
														<p className="text-[11px] text-muted-foreground truncate">
															{type.description}
														</p>
													</div>
													{isSelected && (
														<Check className="w-3.5 h-3.5 text-primary shrink-0" />
													)}
												</div>
											</Card>
										);
									})}
								</div>
							</div>

							<Button
								onClick={handleAnalyze}
								disabled={!selectedVideo || isAnalyzing}
								className="w-full rounded-xl"
							>
								{isAnalyzing ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Analyzing...
									</>
								) : (
									<>
										<AnalysisIcon className="mr-2 h-4 w-4" />
										Analyze Video
									</>
								)}
							</Button>

							{/* Analysis History - when projectId exists */}
							{projectId && (
								<div className="space-y-2">
									<Label className="font-sans text-xs font-semibold flex items-center gap-1.5">
										<History className="w-3 h-3" />
										Analysis History
									</Label>
									{historyLoading ? (
										<div className="flex items-center justify-center py-4">
											<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
										</div>
									) : history.length === 0 ? (
										<p className="text-[11px] text-muted-foreground py-2">
											No past analyses. Run one to save it here.
										</p>
									) : (
										<div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto">
											{history.map((item) => {
												const TypeIcon =
													ANALYSIS_TYPES.find(
														(t) => t.value === item.analysis_type,
													)?.icon || Wand2;
												const isActive =
													analysisResult?.type === item.analysis_type &&
													analysisResult?.segments?.length ===
														item.segments?.length;
												return (
													<Card
														key={item.id}
														className={`p-2 cursor-pointer transition-all rounded-lg flex items-center gap-2 ${
															isActive
																? "ring-2 ring-primary bg-primary/5"
																: "hover:bg-muted/50"
														}`}
														onClick={() => handleSelectHistory(item)}
													>
														<TypeIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
														<div className="flex-1 min-w-0">
															<p className="text-[11px] font-medium truncate">
																{ANALYSIS_TYPES.find(
																	(t) => t.value === item.analysis_type,
																)?.label || item.analysis_type}
															</p>
															<p className="text-[10px] text-muted-foreground">
																{item.segments?.length || 0} segments ·{" "}
																{formatHistoryDate(item.created_at)}
															</p>
														</div>
														<Button
															variant="ghost"
															size="icon"
															className="h-6 w-6 shrink-0 rounded"
															onClick={(e) => handleDeleteHistory(e, item.id)}
															title="Delete from history"
														>
															<Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
														</Button>
													</Card>
												);
											})}
										</div>
									)}
								</div>
							)}
						</>
					)}
				</div>

				{/* Persistent Results - Inline, scrollable, no overlay */}
				{analysisResult && (
					<div className="flex-1 min-h-[300px] flex flex-col border-t border-border/40 overflow-hidden">
						<button
							type="button"
							onClick={() => setResultsExpanded(!resultsExpanded)}
							className="flex-none flex items-center justify-between gap-2 px-4 py-2 hover:bg-muted/30 transition-colors border-b border-border/30 shrink-0"
						>
							<div className="flex items-center gap-2">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
									{(() => {
										const TypeIcon =
											ANALYSIS_TYPES.find(
												(t) => t.value === analysisResult.type,
											)?.icon || Wand2;
										return <TypeIcon className="h-4 w-4 text-primary" />;
									})()}
								</div>
								<div className="text-left">
									<p className="text-sm font-semibold">
										{
											ANALYSIS_TYPES.find(
												(t) => t.value === analysisResult.type,
											)?.label
										}
									</p>
									<p className="text-xs text-muted-foreground">
										{analysisResult.segments.length} segment
										{analysisResult.segments.length !== 1 ? "s" : ""} · Click to
										seek
									</p>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<Badge variant="secondary" className="text-xs">
									{analysisResult.segments.length}
								</Badge>
								<Button
									variant="ghost"
									size="icon"
									className="h-7 w-7 rounded-lg"
									onClick={(e) => {
										e.stopPropagation();
										clearResults();
									}}
									title="Clear results"
								>
									<X className="h-3.5 w-3.5" />
								</Button>
								{resultsExpanded ? (
									<ChevronDown className="h-4 w-4 text-muted-foreground" />
								) : (
									<ChevronUp className="h-4 w-4 text-muted-foreground" />
								)}
							</div>
						</button>

						{resultsExpanded && (
							<>
								{analysisResult.segments.length > 0 ? (
									<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
										<div className="flex flex-col gap-3 p-4 pb-6">
											{analysisResult.segments.map((segment, index) => (
												<SegmentCard
													key={index}
													segment={segment}
													formatTime={formatTime}
													onSeek={handleSeekToSegment}
												/>
											))}
										</div>
									</div>
								) : (
									<div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 px-4">
										<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
											<Film className="h-6 w-6 text-muted-foreground" />
										</div>
										<p className="text-xs font-medium text-center">
											No {analysisResult.type} detected
										</p>
										<p className="text-[11px] text-muted-foreground text-center">
											Try a different analysis type
										</p>
									</div>
								)}
							</>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

const SegmentCard = ({
	segment,
	formatTime,
	onSeek,
}: {
	segment: AnalysisSegment;
	formatTime: (s: number) => string;
	onSeek: (s: number) => void;
}) => (
	<Card
		className="p-3.5 cursor-pointer hover:bg-muted/50 hover:border-primary/30 transition-all border-border/40 rounded-xl group shrink-0"
		onClick={() => onSeek(segment.start)}
	>
		<div className="flex items-start gap-3">
			<button
				type="button"
				className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80 group-hover:bg-primary/20 transition-colors"
				onClick={(e) => {
					e.stopPropagation();
					onSeek(segment.start);
				}}
			>
				<Play className="h-3 w-3 text-muted-foreground group-hover:text-primary ml-0.5" />
			</button>
			<div className="flex-1 min-w-0">
				<div className="flex flex-wrap items-center gap-2 mb-1">
					<span className="text-xs font-mono text-muted-foreground">
						{formatTime(segment.start)} → {formatTime(segment.end)}
					</span>
					{segment.confidence !== undefined && (
						<Badge variant="outline" className="text-[10px] px-1.5 py-0">
							{Math.round(segment.confidence * 100)}%
						</Badge>
					)}
					<span className="text-[11px] text-muted-foreground">
						{(segment.end - segment.start).toFixed(1)}s
					</span>
				</div>
				{segment.label && (
					<p className="text-xs text-foreground leading-relaxed line-clamp-2">
						{segment.label}
					</p>
				)}
			</div>
		</div>
	</Card>
);
