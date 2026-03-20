import { useMemo, useEffect, useRef } from "react";
import {
	Video,
	Image as ImageIcon,
	Music,
	Type,
	MessageSquare,
	Layers,
} from "lucide-react";
import useStore from "../store/use-store";
import { cn } from "@/lib/utils";

interface TrackInfo {
	id: string;
	type: string;
	name: string;
	icon: React.ReactNode;
	itemCount: number;
	height: number;
	firstItemName: string | null;
}

const getTrackIcon = (type: string) => {
	const iconClass = "w-4 h-4";
	const icons: Record<string, React.ReactNode> = {
		video: <Video className={iconClass} />,
		image: <ImageIcon className={iconClass} />,
		audio: <Music className={iconClass} />,
		text: <Type className={iconClass} />,
		caption: <MessageSquare className={iconClass} />,
	};
	return icons[type] || <Layers className={iconClass} />;
};

const TRACK_COLORS: Record<
	string,
	{ bg: string; text: string; border: string }
> = {
	video: {
		bg: "bg-blue-600",
		text: "text-blue-200",
		border: "border-blue-500",
	},
	image: {
		bg: "bg-emerald-600",
		text: "text-emerald-200",
		border: "border-emerald-500",
	},
	audio: {
		bg: "bg-purple-600",
		text: "text-purple-200",
		border: "border-purple-500",
	},
	text: {
		bg: "bg-amber-600",
		text: "text-amber-200",
		border: "border-amber-500",
	},
	caption: {
		bg: "bg-orange-600",
		text: "text-orange-200",
		border: "border-orange-500",
	},
	default: {
		bg: "bg-zinc-600",
		text: "text-zinc-200",
		border: "border-zinc-500",
	},
};

// Track heights matching sizesMap in timeline.tsx
const TRACK_HEIGHTS: Record<string, number> = {
	caption: 32,
	text: 32,
	audio: 36,
	video: 44,
	image: 44,
	default: 44,
};

const TRACK_GAP = 8;
// Top offset where tracks actually start in the canvas
const CANVAS_TOP_OFFSET = 24;

export default function TrackLabels() {
	const { tracks, trackItemsMap } = useStore();
	const containerRef = useRef<HTMLDivElement>(null);

	// Sync vertical scroll with timeline canvas
	useEffect(() => {
		const syncScroll = () => {
			const viewportV = document.querySelector(
				".ScrollAreaRootV .ScrollAreaViewport",
			) as HTMLDivElement;
			if (containerRef.current && viewportV) {
				containerRef.current.scrollTop = viewportV.scrollTop;
			}
		};

		const viewportV = document.querySelector(
			".ScrollAreaRootV .ScrollAreaViewport",
		) as HTMLDivElement;
		if (viewportV) {
			viewportV.addEventListener("scroll", syncScroll);
			syncScroll();
			return () => viewportV.removeEventListener("scroll", syncScroll);
		}
	}, [tracks]);

	const trackInfos = useMemo((): TrackInfo[] => {
		if (!tracks || tracks.length === 0) return [];

		const typeCounters: Record<string, number> = {};

		return tracks.map((track: any) => {
			const itemsInTrack: string[] = track.items || track.trackItemIds || [];

			const typeCounts: Record<string, number> = {};
			let firstItemName: string | null = null;

			for (const itemId of itemsInTrack) {
				const item = trackItemsMap[itemId];
				if (item) {
					if (item.type) {
						typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
					}
					if (!firstItemName) {
						firstItemName = extractFileName(item.details?.src) || null;
					}
				}
			}

			let dominantType = "default";
			let maxCount = 0;
			for (const [type, count] of Object.entries(typeCounts)) {
				if (count > maxCount) {
					maxCount = count;
					dominantType = type;
				}
			}

			const height = TRACK_HEIGHTS[dominantType] || TRACK_HEIGHTS.default;

			typeCounters[dominantType] = (typeCounters[dominantType] || 0) + 1;
			const typeLabel = formatTypeLabel(dominantType);
			const trackName =
				track.name || `${typeLabel} ${typeCounters[dominantType]}`;

			return {
				id: track.id,
				type: dominantType,
				name: trackName,
				icon: getTrackIcon(dominantType),
				itemCount: itemsInTrack.length,
				height,
				firstItemName,
			};
		});
	}, [tracks, trackItemsMap]);

	if (trackInfos.length === 0) {
		return null;
	}

	return (
		<div
			ref={containerRef}
			className="flex flex-col overflow-y-auto overflow-x-hidden"
			style={{ paddingTop: CANVAS_TOP_OFFSET }}
		>
			{trackInfos.map((track, index) => (
				<TrackLabel
					key={track.id}
					track={track}
					isFirst={index === 0}
					isLast={index === trackInfos.length - 1}
				/>
			))}
		</div>
	);
}

function TrackLabel({
	track,
	isLast,
	isFirst,
}: { track: TrackInfo; isLast: boolean; isFirst: boolean }) {
	const colors = TRACK_COLORS[track.type] || TRACK_COLORS.default;
	// Gap comes BEFORE each track (except the first one)
	const topGap = isFirst ? 0 : TRACK_GAP;
	const totalHeight = track.height + topGap;

	return (
		<div style={{ height: totalHeight }} className="flex flex-col justify-end">
			<div
				style={{ height: track.height }}
				className={cn(
					"flex items-center gap-1.5 px-1.5",
					"border-l-2 rounded-r-sm",
					colors.border,
					"hover:bg-muted/60 transition-colors cursor-default",
				)}
			>
				<div className={cn("p-1 rounded flex-shrink-0", colors.bg)}>
					{track.icon}
				</div>
				<div className="flex flex-col min-w-0 flex-1">
					<span className="text-[10px] font-semibold text-foreground truncate leading-tight">
						{track.name}
					</span>
					{track.firstItemName && (
						<span className="text-[8px] text-muted-foreground truncate leading-tight">
							{track.firstItemName}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

function extractFileName(src: string | undefined): string | null {
	if (!src) return null;
	try {
		const url = new URL(src);
		const fileName = url.pathname.split("/").pop();
		if (fileName) {
			const cleaned = fileName
				.replace(/^\d+-/, "")
				.replace(/\.[^.]+$/, "")
				.replace(/[_-]/g, " ")
				.slice(0, 20);
			return cleaned || null;
		}
	} catch {
		return null;
	}
	return null;
}

function formatTypeLabel(type: string): string {
	const labels: Record<string, string> = {
		video: "Video",
		image: "Image",
		audio: "Audio",
		text: "Text",
		caption: "Caption",
		default: "Track",
	};
	return labels[type] || "Track";
}
