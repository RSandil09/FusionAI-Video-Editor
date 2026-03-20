import Draggable from "@/components/shared/draggable";
import { dispatch } from "@designcombo/events";
import { ADD_AUDIO } from "@designcombo/state";
import { IAudio } from "@designcombo/types";
import { Music, Mic, Sparkles, Search, Loader2, Plus } from "lucide-react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import React, { useState, useEffect } from "react";
import { generateId } from "@designcombo/timeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VoiceRecorder } from "./voice-recorder";
import { AiVoice } from "./ai-voice";
import { cn } from "@/lib/utils";
import { useYouTubeAudioLibrary } from "@/hooks/use-youtube-audio-library";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Audios = () => {
	const isDraggingOverTimeline = useIsDraggingOverTimeline();
	const [searchQuery, setSearchQuery] = useState("");

	const {
		audios,
		loading,
		error,
		currentPage,
		hasNextPage,
		searchAudios,
		loadAudios,
		searchAudiosAppend,
		loadAudiosAppend,
		clearAudios,
	} = useYouTubeAudioLibrary();

	useEffect(() => {
		loadAudios();
	}, [loadAudios]);

	const handleAddAudio = (payload: Partial<IAudio>) => {
		payload.id = generateId();
		dispatch(ADD_AUDIO, {
			payload,
			options: {},
		});
	};

	const handleSearch = async () => {
		if (!searchQuery.trim()) {
			await loadAudios();
			return;
		}
		await searchAudios(searchQuery);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleSearch();
	};

	const handleLoadMore = () => {
		if (hasNextPage) {
			if (searchQuery.trim()) {
				searchAudiosAppend(searchQuery, currentPage + 1);
			} else {
				loadAudiosAppend(currentPage + 1);
			}
		}
	};

	const handleClearSearch = () => {
		setSearchQuery("");
		clearAudios();
		loadAudios();
	};

	return (
		<div className="flex flex-1 flex-col h-full overflow-hidden bg-gradient-to-b from-background to-muted/30">
			{/* Header */}
			<div className="flex-none px-5 py-4 border-b border-border/30 bg-background/80 backdrop-blur-sm">
				<h2 className="text-[15px] font-semibold text-foreground tracking-tight">
					Audio
				</h2>
				<p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-[85%]">
					Add music, record voice, or generate AI narration
				</p>
			</div>

			<Tabs defaultValue="library" className="flex flex-col flex-1 min-h-0">
				<div className="flex-none px-4 py-3.5">
					<TabsList className="grid w-full grid-cols-3 h-10 bg-muted/40 p-1 rounded-2xl">
						<TabsTrigger
							value="library"
							className="flex items-center gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:rounded-xl text-xs font-medium transition-all duration-200 data-[state=active]:border data-[state=active]:border-border/40"
						>
							<Music className="h-3.5 w-3.5" />
							Library
						</TabsTrigger>
						<TabsTrigger
							value="record"
							className="flex items-center gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:rounded-xl text-xs font-medium transition-all duration-200 data-[state=active]:border data-[state=active]:border-border/40"
						>
							<Mic className="h-3.5 w-3.5" />
							Record
						</TabsTrigger>
						<TabsTrigger
							value="ai-voice"
							className="flex items-center gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:rounded-xl text-xs font-medium transition-all duration-200 data-[state=active]:border data-[state=active]:border-border/40"
						>
							<Sparkles className="h-3.5 w-3.5" />
							AI Voice
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent
					value="library"
					className="flex-1 mt-0 min-h-0 overflow-hidden flex flex-col"
				>
					<div className="flex-none flex items-center gap-2 px-4 py-2.5">
						<div className="relative flex-1">
							<Input
								placeholder="Search Fusion music..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								onKeyDown={handleKeyPress}
								className="pr-10 h-10 rounded-full bg-muted/30 border-0 focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70"
							/>
							<Button
								size="sm"
								variant="ghost"
								className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0 rounded-full hover:bg-muted/50"
								onClick={handleSearch}
								disabled={loading}
							>
								{loading ? (
									<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
								) : (
									<Search className="h-3.5 w-3.5 text-muted-foreground" />
								)}
							</Button>
						</div>
						{searchQuery && (
							<Button
								size="sm"
								variant="outline"
								onClick={handleClearSearch}
								disabled={loading}
								className="rounded-full px-4 h-9 shrink-0"
							>
								Clear
							</Button>
						)}
					</div>

					{error && (
						<div className="flex-none px-4 pb-2">
							<div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-2xl border border-red-200/50 dark:border-red-900/30">
								{error}
							</div>
						</div>
					)}

					<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4">
						{loading && audios.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-16 gap-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
									<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
								</div>
								<span className="text-sm text-muted-foreground font-medium">
									Loading from YouTube Audio Library...
								</span>
								<span className="text-xs text-muted-foreground/70">
									Royalty-free tracks for your projects
								</span>
							</div>
						) : (
							<>
								<div className="flex flex-col gap-2 px-1 pt-2 pb-6">
									{audios.length > 0 && (
										<p className="text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wider px-2 mb-1">
											YouTube Audio Library
										</p>
									)}
									{audios.map((audio, index) => (
										<AudioItem
											key={audio.id || index}
											shouldDisplayPreview={!isDraggingOverTimeline}
											handleAddAudio={handleAddAudio}
											audio={audio}
										/>
									))}
								</div>
								{loading && (
									<div className="flex justify-center py-6">
										<div className="flex items-center gap-2 text-muted-foreground">
											<Loader2 className="h-4 w-4 animate-spin" />
											<span className="text-xs">Loading more...</span>
										</div>
									</div>
								)}
							</>
						)}
						{hasNextPage && !loading && (
							<div className="flex justify-center px-4 pb-8 pt-4">
								<Button
									size="sm"
									variant="outline"
									onClick={handleLoadMore}
									className="rounded-full px-6 h-9 font-medium shadow-sm hover:shadow"
								>
									Load More
								</Button>
							</div>
						)}
					</div>
				</TabsContent>

				<TabsContent
					value="record"
					className="flex-1 mt-0 min-h-0 overflow-auto"
				>
					<div className="px-4 pb-6">
						<VoiceRecorder />
					</div>
				</TabsContent>

				<TabsContent
					value="ai-voice"
					className="flex-1 mt-0 min-h-0 overflow-auto"
				>
					<div className="px-4 pb-6">
						<AiVoice />
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
};

const AudioItem = ({
	handleAddAudio,
	audio,
	shouldDisplayPreview,
}: {
	handleAddAudio: (payload: Partial<IAudio>) => void;
	audio: Partial<IAudio>;
	shouldDisplayPreview: boolean;
}) => {
	const style = React.useMemo(
		() => ({
			backgroundImage:
				"url(https://cdn.designcombo.dev/thumbnails/music-preview.png)",
			backgroundSize: "cover",
			width: "56px",
			height: "56px",
		}),
		[],
	);

	return (
		<Draggable
			data={audio}
			renderCustomPreview={
				<div style={style} className="rounded-2xl shadow-lg" />
			}
			shouldDisplayPreview={shouldDisplayPreview}
		>
			<div
				draggable={false}
				onClick={() => handleAddAudio({ ...audio })}
				className={cn(
					"group flex items-center gap-3 p-3 rounded-2xl cursor-pointer",
					"bg-background/60 border border-border/20",
					"hover:bg-muted/50 hover:border-border/40 hover:shadow-md transition-all duration-200 ease-out",
					"active:bg-muted/70",
				)}
			>
				<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-muted/80 to-muted/50 shadow-inner">
					<Music className="h-4 w-4 text-muted-foreground" />
				</div>
				<div className="flex flex-col min-w-0 flex-1 py-0.5">
					<span className="text-sm font-medium text-foreground truncate leading-tight tracking-tight">
						{audio.name}
					</span>
					<span className="text-[11px] text-muted-foreground/90 truncate mt-0.5">
						{audio.metadata?.author}
					</span>
					{audio.metadata?.mood && (
						<span className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">
							{audio.metadata.mood}
						</span>
					)}
				</div>
				<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
					<Plus className="h-3.5 w-3.5 text-muted-foreground" />
				</div>
			</div>
		</Draggable>
	);
};
