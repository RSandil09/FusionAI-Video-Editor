import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";
import { generateCaptions } from "../utils/captions";
import { loadFonts } from "../utils/fonts";
import { dispatch } from "@designcombo/events";
import { ADD_ITEMS } from "@designcombo/state";
import { ITrackItem, ITrackItemsMap } from "@designcombo/types";
import { millisecondsToHHMMSS } from "../utils/format";
import useStore from "../store/use-store";
import { groupBy } from "lodash";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PLAYER_SEEK } from "../constants/events";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { generateId } from "@designcombo/timeline";
import { Loader2, Captions as CaptionsIcon, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { getIdToken } from "@/lib/auth/client";

const LANGUAGES = [
	{ code: "en", label: "English" },
	{ code: "es", label: "Spanish" },
	{ code: "fr", label: "French" },
	{ code: "de", label: "German" },
	{ code: "it", label: "Italian" },
	{ code: "pt", label: "Portuguese" },
	{ code: "ja", label: "Japanese" },
	{ code: "ko", label: "Korean" },
	{ code: "zh", label: "Chinese" },
	{ code: "ar", label: "Arabic" },
];

const CAPTION_FONTS = [
	{
		family: "theboldfont",
		url: "https://cdn.designcombo.dev/fonts/the-bold-font.ttf",
		label: "Bold",
	},
	{ family: "Arial", url: "", label: "Arial" },
	{ family: "Impact", url: "", label: "Impact" },
];

export const Captions = () => {
	const { trackItemsMap } = useStore();
	const [selectMediaItems, setSelectMediaItems] = useState<
		{ label: string; value: string }[]
	>([]);
	const [selectedMedia, setSelectedMedia] = useState<string | undefined>();
	const [selectedLanguage, setSelectedLanguage] = useState("en");
	const [selectedFont, setSelectedFont] = useState(CAPTION_FONTS[0].family);
	const [maxWordsPerCaption, setMaxWordsPerCaption] = useState(4);
	const [timingOffsetMs, setTimingOffsetMs] = useState(0);
	const [captionTrackItemsMap, setCaptionTrackItemsMap] = useState<
		Record<string, ITrackItem[]>
	>({});
	const [mediaTrackItems, setMediaTrackItems] = useState<ITrackItem[]>([]);
	const [isGenerating, setIsGenerating] = useState(false);
	const [showSettings, setShowSettings] = useState(false);

	useEffect(() => {
		const items = fetchMediaTrackItems(trackItemsMap);
		setMediaTrackItems(items);
		setSelectMediaItems(createSelectMediaOptions(items));
		setCaptionTrackItemsMap(groupCaptionItems(trackItemsMap));
	}, [trackItemsMap]);

	const createCaptions = async (selectedId: string) => {
		setIsGenerating(true);
		try {
			const trackItem = mediaTrackItems.find((m) => m.id === selectedId);
			if (!trackItem) throw new Error("Track item not found");

			const mediaSrc = (trackItem.details as any).src as string;
			const { url } = await transcribeMedia(mediaSrc, selectedLanguage);
			const jsonData = await fetchJsonFromUrl(url);

			const fontInfo =
				CAPTION_FONTS.find((f) => f.family === selectedFont) ||
				CAPTION_FONTS[0];
			const captionFontInfo = {
				fontFamily: fontInfo.family,
				fontUrl: fontInfo.url,
				fontSize: 64,
			};
			const options = {
				containerWidth: 800,
				maxWordsPerCaption,
				timingOffsetMs,
				parentId: trackItem.id,
				displayFrom: trackItem.display.from,
			};

			if (fontInfo.url) {
				await loadFonts([{ name: fontInfo.family, url: fontInfo.url }]);
			}

			const captions = generateCaptions(
				{ ...jsonData, sourceUrl: mediaSrc },
				captionFontInfo,
				options,
			);

			dispatch(ADD_ITEMS, {
				payload: {
					trackItems: captions,
					tracks: [
						{
							id: generateId(),
							items: captions.map((item) => item.id),
							type: "caption",
							name: "Captions",
						},
					],
				},
			});
			toast.success(`Generated ${captions.length} captions`);
		} catch (error: any) {
			console.error("Error generating captions:", error);
			toast.error(`Caption error: ${error.message}`);
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			{/* Header */}
			<div className="flex h-12 flex-none items-center justify-between px-4 border-b border-border/40">
				<span className="text-sm font-medium text-foreground">Captions</span>
				<button
					onClick={() => setShowSettings((v) => !v)}
					className={`flex items-center justify-center h-7 w-7 rounded-md transition-colors ${
						showSettings
							? "bg-primary/20 text-primary"
							: "text-muted-foreground hover:text-foreground hover:bg-muted/60"
					}`}
					title="Caption settings"
				>
					<Settings2 size={14} />
				</button>
			</div>

			<div className="flex-1 overflow-hidden">
				<ScrollArea className="h-full">
					<div className="flex flex-col gap-4 px-4 py-4">
						{mediaTrackItems.length === 0 ? (
							<EmptyState
								icon={<CaptionsIcon size={28} className="text-muted-foreground/50" />}
								message="Add a video or audio clip to generate captions automatically."
							/>
						) : (
							<>
								{/* Media selector */}
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs font-medium text-muted-foreground">
										Source
									</Label>
									<Select value={selectedMedia} onValueChange={setSelectedMedia}>
										<SelectTrigger className="w-full h-8 text-xs">
											<SelectValue placeholder="Select video or audio…" />
										</SelectTrigger>
										<SelectContent className="z-[200]">
											{selectMediaItems.map((item) => (
												<SelectItem
													value={item.value}
													key={item.value}
													className="text-xs"
												>
													{item.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* Language + Font row */}
								<div className="grid grid-cols-2 gap-2">
									<div className="flex flex-col gap-1.5">
										<Label className="text-xs font-medium text-muted-foreground">
											Language
										</Label>
										<Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
											<SelectTrigger className="h-8 text-xs">
												<SelectValue />
											</SelectTrigger>
											<SelectContent className="z-[200]">
												{LANGUAGES.map((lang) => (
													<SelectItem
														value={lang.code}
														key={lang.code}
														className="text-xs"
													>
														{lang.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="flex flex-col gap-1.5">
										<Label className="text-xs font-medium text-muted-foreground">
											Font
										</Label>
										<Select value={selectedFont} onValueChange={setSelectedFont}>
											<SelectTrigger className="h-8 text-xs">
												<SelectValue />
											</SelectTrigger>
											<SelectContent className="z-[200]">
												{CAPTION_FONTS.map((font) => (
													<SelectItem
														value={font.family}
														key={font.family}
														className="text-xs"
													>
														{font.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>

								{/* Settings panel */}
								{showSettings && (
									<div className="flex flex-col gap-4 rounded-lg border border-border/40 bg-muted/20 px-3 py-3">
										{/* Words per caption */}
										<div className="flex flex-col gap-2">
											<div className="flex items-center justify-between">
												<Label className="text-xs font-medium text-muted-foreground">
													Words per caption
												</Label>
												<span className="text-xs tabular-nums text-foreground">
													{maxWordsPerCaption}
												</span>
											</div>
											<Slider
												min={1}
												max={8}
												step={1}
												value={[maxWordsPerCaption]}
												onValueChange={([v]) => setMaxWordsPerCaption(v)}
											/>
											<div className="flex justify-between text-[10px] text-muted-foreground/50">
												<span>1</span>
												<span>8</span>
											</div>
										</div>

										{/* Timing offset */}
										<div className="flex flex-col gap-2">
											<div className="flex items-center justify-between">
												<Label className="text-xs font-medium text-muted-foreground">
													Timing offset
												</Label>
												<span className="text-xs tabular-nums text-foreground">
													{timingOffsetMs > 0 ? "+" : ""}{timingOffsetMs}ms
												</span>
											</div>
											<Slider
												min={-500}
												max={500}
												step={25}
												value={[timingOffsetMs]}
												onValueChange={([v]) => setTimingOffsetMs(v)}
											/>
											<div className="flex justify-between text-[10px] text-muted-foreground/50">
												<span>−500ms</span>
												<span>+500ms</span>
											</div>
										</div>
									</div>
								)}

								{/* Caption content area */}
								{selectedMedia ? (
									(() => {
										const selectedItem = mediaTrackItems.find(
											(m) => m.id === selectedMedia,
										);
										const selectedSrc = selectedItem
											? ((selectedItem.details as any).src as string)
											: undefined;
										const existingCaptions = selectedSrc
											? captionTrackItemsMap[selectedSrc]
											: undefined;

										return existingCaptions ? (
											<MediaWithCaptions captionTrackItems={existingCaptions} />
										) : (
											<GeneratePrompt
												onCreate={() => createCaptions(selectedMedia)}
												isGenerating={isGenerating}
											/>
										);
									})()
								) : (
									<EmptyState
										message="Select a clip above to get started."
									/>
								)}
							</>
						)}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
};

// ── Sub-components ────────────────────────────────────────────────────────────

const EmptyState = ({
	icon,
	message,
}: {
	icon?: React.ReactNode;
	message: string;
}) => (
	<div className="flex flex-col items-center gap-2 py-8 text-center">
		{icon}
		<p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
			{message}
		</p>
	</div>
);

const GeneratePrompt = ({
	onCreate,
	isGenerating,
}: {
	onCreate: () => void;
	isGenerating: boolean;
}) => (
	<div className="flex flex-col gap-3">
		<p className="text-xs text-muted-foreground text-center leading-relaxed">
			Recognize speech and generate word-level captions automatically.
		</p>
		<Button
			onClick={onCreate}
			variant="default"
			size="sm"
			className="w-full"
			disabled={isGenerating}
		>
			{isGenerating ? (
				<>
					<Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
					Generating…
				</>
			) : (
				"Generate Captions"
			)}
		</Button>
	</div>
);

const MediaWithCaptions = ({
	captionTrackItems,
}: {
	captionTrackItems: ITrackItem[];
}) => {
	const { playerRef } = useStore();
	const currentFrame = useCurrentPlayerFrame(playerRef || null);

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between mb-1">
				<Label className="text-xs font-medium text-muted-foreground">
					{captionTrackItems.length} caption{captionTrackItems.length !== 1 ? "s" : ""}
				</Label>
			</div>
			{captionTrackItems.map((item) => (
				<CaptionItem
					key={item.id}
					item={item}
					isActive={
						currentFrame * (1000 / 30) >= item.display.from &&
						currentFrame * (1000 / 30) <= item.display.to
					}
				/>
			))}
		</div>
	);
};

const CaptionItem = ({
	item,
	isActive,
}: {
	item: ITrackItem;
	isActive?: boolean;
}) => {
	const { display, details } = item;

	const handleSeek = () => {
		dispatch(PLAYER_SEEK, { payload: { time: display.from } });
	};

	return (
		<button
			onClick={handleSeek}
			className={`flex flex-col gap-0.5 w-full rounded-md px-2.5 py-2 text-left transition-colors ${
				isActive
					? "bg-primary/15 text-foreground ring-1 ring-primary/30"
					: "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
			}`}
		>
			<span className="text-[10px] font-mono tabular-nums opacity-60">
				{millisecondsToHHMMSS(display.from)} — {millisecondsToHHMMSS(display.to)}
			</span>
			<span className="text-xs leading-snug">{details.text}</span>
		</button>
	);
};

// ── Helper functions ──────────────────────────────────────────────────────────

const fetchMediaTrackItems = (trackItemsMap: ITrackItemsMap) => {
	return Object.values(trackItemsMap).filter(
		({ type }: ITrackItem) => type === "audio" || type === "video",
	);
};

const getMediaLabel = (item: ITrackItem, index: number): string => {
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
	return `${item.type === "video" ? "Video" : "Audio"} ${index + 1}`;
};

const createSelectMediaOptions = (mediaTrackItems: ITrackItem[]) => {
	return mediaTrackItems.map((item, index) => ({
		label: getMediaLabel(item, index),
		value: item.id,
	}));
};

const groupCaptionItems = (trackItemsMap: ITrackItemsMap) => {
	const captionTrackItems = Object.values(trackItemsMap).filter(
		({ type }: ITrackItem) => type === "caption",
	);
	return groupBy(captionTrackItems, "metadata.sourceUrl");
};

async function transcribeMedia(
	mediaUrl: string,
	targetLanguage: string,
): Promise<{ url: string }> {
	const token = await getIdToken();
	const transcribeResponse = await fetch("/api/transcribe", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify({ url: mediaUrl, targetLanguage }),
	});

	const transcribeData = await transcribeResponse.json().catch(() => ({}));

	if (!transcribeResponse.ok) {
		const msg =
			transcribeData?.error ||
			`Failed to initiate transcription (${transcribeResponse.status})`;
		throw new Error(msg);
	}

	const { transcribe } = transcribeData;
	if (!transcribe?.url) throw new Error("Invalid transcription response");

	return { url: transcribe.url };
}

async function fetchJsonFromUrl(url: string) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Error fetching JSON: ${response.statusText}`);
	return response.json();
}
