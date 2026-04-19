import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { generateCaptions } from "../utils/captions";
import { loadFonts } from "../utils/fonts";
import { dispatch } from "@designcombo/events";
import { ADD_CAPTIONS, ADD_ITEMS } from "@designcombo/state";
import { ITrackItem, ITrackItemsMap } from "@designcombo/types";
import { millisecondsToHHMMSS } from "../utils/format";
import useStore from "../store/use-store";
import { groupBy } from "lodash";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PLAYER_SEEK } from "../constants/events";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { generateId } from "@designcombo/timeline";
import { Loader2 } from "lucide-react";
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
	// selectedMedia holds the track item ID (unique per clip, not the src URL)
	const [selectedMedia, setSelectedMedia] = useState<string | undefined>();
	const [selectedLanguage, setSelectedLanguage] = useState("en");
	const [selectedFont, setSelectedFont] = useState(CAPTION_FONTS[0].family);
	const [captionTrackItemsMap, setCaptionTrackItemsMap] = useState<
		Record<string, ITrackItem[]>
	>({});
	const [mediaTrackItems, setMediaTrackItems] = useState<ITrackItem[]>([]);
	const [isGenerating, setIsGenerating] = useState(false);

	useEffect(() => {
		const items = fetchMediaTrackItems(trackItemsMap);
		setMediaTrackItems(items);
		setSelectMediaItems(createSelectMediaOptions(items));
		setCaptionTrackItemsMap(groupCaptionItems(trackItemsMap));
	}, [trackItemsMap]);

	const handleSelectChange = (value: string) => {
		setSelectedMedia(value);
	};

	const createCaptions = async (selectedId: string) => {
		setIsGenerating(true);
		try {
			// Look up by ID so each clip is treated independently
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
				linesPerCaption: 1,
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
		<div className="flex flex-1 flex-col gap-4">
			<Header />
			{mediaTrackItems.length === 0 ? (
				<EmptyMediaTrackItems />
			) : (
				<MediaSection
					selectMediaItems={selectMediaItems}
					selectedMedia={selectedMedia}
					selectedLanguage={selectedLanguage}
					selectedFont={selectedFont}
					onSelectChange={handleSelectChange}
					onLanguageChange={setSelectedLanguage}
					onFontChange={setSelectedFont}
					captionTrackItemsMap={captionTrackItemsMap}
					mediaTrackItems={mediaTrackItems}
					createCaptions={createCaptions}
					isGenerating={isGenerating}
				/>
			)}
		</div>
	);
};

const Header = () => (
	<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
		Captions
	</div>
);

const MediaSection = ({
	selectMediaItems,
	selectedMedia,
	selectedLanguage,
	selectedFont,
	onSelectChange,
	onLanguageChange,
	onFontChange,
	captionTrackItemsMap,
	mediaTrackItems,
	createCaptions,
	isGenerating,
}: {
	selectMediaItems: { label: string; value: string }[];
	selectedMedia: string | undefined;
	selectedLanguage: string;
	selectedFont: string;
	onSelectChange: (value: string) => void;
	onLanguageChange: (value: string) => void;
	onFontChange: (value: string) => void;
	captionTrackItemsMap: Record<string, ITrackItem[]>;
	mediaTrackItems: ITrackItem[];
	createCaptions: (selectedId: string) => void;
	isGenerating: boolean;
}) => {
	// Resolve the src of the currently selected item (selected by ID)
	const selectedItem = mediaTrackItems.find((m) => m.id === selectedMedia);
	const selectedSrc = selectedItem ? (selectedItem.details as any).src as string : undefined;
	const existingCaptions = selectedSrc ? captionTrackItemsMap[selectedSrc] : undefined;

	return (
		<div className="flex h-[calc(100%-4.5rem)] flex-col gap-3 px-4">
			{/* Media selector — value is item ID, label is the filename */}
			<Select value={selectedMedia} onValueChange={onSelectChange}>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Select media" />
				</SelectTrigger>
				<SelectContent className="z-[200]">
					{selectMediaItems.map((item) => (
						<SelectItem value={item.value} key={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Language + Font selectors */}
			<div className="flex gap-2">
				<Select value={selectedLanguage} onValueChange={onLanguageChange}>
					<SelectTrigger className="flex-1">
						<SelectValue placeholder="Language" />
					</SelectTrigger>
					<SelectContent className="z-[200]">
						{LANGUAGES.map((lang) => (
							<SelectItem value={lang.code} key={lang.code}>
								{lang.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={selectedFont} onValueChange={onFontChange}>
					<SelectTrigger className="flex-1">
						<SelectValue placeholder="Font" />
					</SelectTrigger>
					<SelectContent className="z-[200]">
						{CAPTION_FONTS.map((font) => (
							<SelectItem value={font.family} key={font.family}>
								{font.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{selectedMedia ? (
				existingCaptions ? (
					<div className="h-[calc(100vh-32rem)]">
						<ScrollArea className="h-full">
							<MediaWithCaptions captionTrackItems={existingCaptions} />
						</ScrollArea>
					</div>
				) : (
					<MediaWithNoCaptions
						createCaptions={() => createCaptions(selectedMedia)}
						isGenerating={isGenerating}
					/>
				)
			) : (
				<MediaNoSelected />
			)}
		</div>
	);
};

const MediaNoSelected = () => (
	<div className="text-center text-sm text-muted-foreground">
		Select video or audio and generate captions automatically.
	</div>
);

const EmptyMediaTrackItems = () => (
	<div className="text-center text-sm text-muted-foreground">
		Add video or audio and generate captions automatically.
	</div>
);

const MediaWithNoCaptions = ({
	createCaptions,
	isGenerating,
}: {
	createCaptions: () => void;
	isGenerating: boolean;
}) => (
	<div className="flex flex-col gap-2 px-4">
		<div className="text-center text-sm text-muted-foreground">
			Recognize speech in the selected video/audio and generate captions
			automatically.
		</div>
		<Button
			onClick={createCaptions}
			variant="default"
			className="w-full"
			disabled={isGenerating}
		>
			{isGenerating ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Generating...
				</>
			) : (
				"Generate"
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
		<div className="flex flex-col gap-2">
			{captionTrackItems.map((item) => (
				<CaptionItem
					isActive={
						currentFrame * (1000 / 30) >= item.display.from &&
						currentFrame * (1000 / 30) <= item.display.to
					}
					key={item.id}
					item={item}
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
	// const [timeline, setTimeline] = useState(0);
	// const { fps, playerRef } = useStore();
	// const currentFrame = useCurrentPlayerFrame(playerRef!);
	// const [inRange, setInRange] = useState(false);
	// useEffect(() => {
	//   setTimeline(currentFrame / fps);
	// }, [currentFrame, fps]);

	// const isInRange = useCallback(() => {
	//   return timeline >= display.from / 1000 && timeline <= display.to / 1000;
	// }, [timeline, display.from, display.to]);

	// useEffect(() => {
	//   setInRange(isInRange());
	// }, [timeline, isInRange]);

	const handleSeek = (time: number) => {
		dispatch(PLAYER_SEEK, { payload: { time: time } });
	};
	return (
		<div
			className={`flex flex-col gap-2 rounded-lg p-2 hover:cursor-pointer hover:bg-slate-900 ${
				isActive
					? "bg-captions-background text-captions-text"
					: "text-muted-foreground"
			}`}
			onClick={() => handleSeek(display.from)}
		>
			<div className="flex flex-col gap-1">
				<div className="text-xs">
					{millisecondsToHHMMSS(display.from)} -{" "}
					{millisecondsToHHMMSS(display.to)}
				</div>
				<div className="text-sm">{details.text}</div>
			</div>
		</div>
	);
};
// Helper functions
const fetchMediaTrackItems = (trackItemsMap: ITrackItemsMap) => {
	return Object.values(trackItemsMap).filter(
		({ type }: ITrackItem) => type === "audio" || type === "video",
	);
};

/** Extract a human-readable filename from a media src URL. */
const getMediaLabel = (item: ITrackItem, index: number): string => {
	const src = (item.details as any)?.src as string | undefined;
	if (src) {
		try {
			// Strip query string then grab the last path segment
			const pathname = new URL(src).pathname;
			const filename = decodeURIComponent(pathname.split("/").pop() ?? "");
			// Strip common UUID prefixes (e.g. "abc123_my-video.mp4" → "my-video.mp4")
			const cleaned = filename.replace(/^[a-f0-9-]{8,}_/i, "");
			if (cleaned && cleaned !== "undefined") return cleaned;
		} catch {
			// src is a relative or malformed URL — fall through
			const filename = src.split("/").pop()?.split("?")[0] ?? "";
			const decoded = decodeURIComponent(filename);
			if (decoded && decoded !== "undefined") return decoded;
		}
	}
	// Fall back to a numbered label so every item is unique
	return `${item.type === "video" ? "Video" : "Audio"} ${index + 1}`;
};

const createSelectMediaOptions = (mediaTrackItems: ITrackItem[]) => {
	return mediaTrackItems.map((item, index) => ({
		label: getMediaLabel(item, index),
		// Use the item's unique ID as the value so duplicate-src clips are distinct
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
		body: JSON.stringify({
			url: mediaUrl,
			targetLanguage,
		}),
	});

	const transcribeData = await transcribeResponse.json().catch(() => ({}));

	if (!transcribeResponse.ok) {
		const msg =
			transcribeData?.error ||
			`Failed to initiate transcription (${transcribeResponse.status})`;
		throw new Error(msg);
	}

	const { transcribe } = transcribeData;
	if (!transcribe?.url) {
		throw new Error("Invalid transcription response");
	}

	return { url: transcribe.url };
}

async function fetchJsonFromUrl(url: string) {
	try {
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`Error fetching JSON: ${response.statusText}`);
		}

		const data = await response.json();
		return data;
	} catch (error) {
		console.error("Failed to fetch JSON data:", error);
		throw error; // Optionally rethrow to handle it in the caller
	}
}
