import { useMemo } from "react";
import {
	Video,
	Image as ImageIcon,
	Music,
	Type,
	MessageSquare,
	Layers,
	Lock,
	LockOpen,
	VolumeX,
	Volume2,
} from "lucide-react";
import useStore from "../store/use-store";
import { cn } from "@/lib/utils";

// ── Layout constants — must match canvas-engine.ts exactly ────────────────────
const TRACK_HEIGHTS: Record<string, number> = {
	caption: 32,
	text: 32,
	audio: 36,
	video: 44,
	image: 44,
	default: 44,
};
const TRACK_GAP = 8;
const CANVAS_TOP_OFFSET = 24; // ruler height

// ── Track type colours ─────────────────────────────────────────────────────────
const TRACK_COLORS: Record<string, { bg: string; border: string }> = {
	video: { bg: "bg-blue-600", border: "border-blue-500" },
	image: { bg: "bg-emerald-600", border: "border-emerald-500" },
	audio: { bg: "bg-purple-600", border: "border-purple-500" },
	text: { bg: "bg-amber-600", border: "border-amber-500" },
	caption: { bg: "bg-orange-600", border: "border-orange-500" },
	default: { bg: "bg-zinc-600", border: "border-zinc-500" },
};

const TRACK_ICONS: Record<string, React.ReactNode> = {
	video: <Video className="w-3.5 h-3.5" />,
	image: <ImageIcon className="w-3.5 h-3.5" />,
	audio: <Music className="w-3.5 h-3.5" />,
	text: <Type className="w-3.5 h-3.5" />,
	caption: <MessageSquare className="w-3.5 h-3.5" />,
};

interface TrackInfo {
	id: string;
	type: string;
	name: string;
	height: number;
	firstItemName: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getDominantType(
	itemIds: string[],
	trackItemsMap: Record<string, any>,
): string {
	const counts: Record<string, number> = {};
	for (const id of itemIds) {
		const t = trackItemsMap[id]?.type;
		if (t) counts[t] = (counts[t] ?? 0) + 1;
	}
	let best = "default",
		max = 0;
	for (const [t, c] of Object.entries(counts)) {
		if (c > max) {
			max = c;
			best = t;
		}
	}
	return best;
}

function extractFileName(src?: string): string | null {
	if (!src) return null;
	try {
		const file = new URL(src).pathname.split("/").pop();
		if (file)
			return (
				file
					.replace(/^\d+-/, "")
					.replace(/\.[^.]+$/, "")
					.replace(/[_-]/g, " ")
					.slice(0, 18) || null
			);
	} catch {
		/* relative URL */
	}
	return null;
}

function formatLabel(type: string): string {
	const map: Record<string, string> = {
		video: "Video",
		image: "Image",
		audio: "Audio",
		text: "Text",
		caption: "Caption",
	};
	return map[type] ?? "Track";
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TrackLabels({
	scrollTop,
	onTrackMetaChange,
}: {
	scrollTop: number;
	onTrackMetaChange?: (
		trackId: string,
		patch: { locked?: boolean; muted?: boolean; solo?: boolean },
	) => void;
}) {
	const {
		tracks,
		trackItemsMap,
		mutedTrackIds,
		setMutedTrackIds,
		soloTrackIds,
		setSoloTrackIds,
		lockedTrackIds,
		setLockedTrackIds,
	} = useStore();

	const handleMeta = (
		trackId: string,
		patch: { locked?: boolean; muted?: boolean; solo?: boolean },
	) => {
		if (patch.muted !== undefined) {
			setMutedTrackIds(
				patch.muted
					? [...mutedTrackIds, trackId]
					: mutedTrackIds.filter((id) => id !== trackId),
			);
		}
		if (patch.solo !== undefined) {
			setSoloTrackIds(
				patch.solo
					? [...soloTrackIds, trackId]
					: soloTrackIds.filter((id) => id !== trackId),
			);
		}
		if (patch.locked !== undefined) {
			setLockedTrackIds(
				patch.locked
					? [...lockedTrackIds, trackId]
					: lockedTrackIds.filter((id) => id !== trackId),
			);
		}
		onTrackMetaChange?.(trackId, patch);
	};

	const trackInfos = useMemo((): TrackInfo[] => {
		if (!tracks?.length) return [];
		const typeCounters: Record<string, number> = {};

		return tracks.map((track: any) => {
			const itemIds: string[] = track.items ?? track.trackItemIds ?? [];
			const dominantType = getDominantType(itemIds, trackItemsMap);
			const height = TRACK_HEIGHTS[dominantType] ?? TRACK_HEIGHTS.default;
			typeCounters[dominantType] = (typeCounters[dominantType] ?? 0) + 1;

			const firstItemName = (() => {
				for (const id of itemIds) {
					const name = extractFileName(
						(trackItemsMap[id] as any)?.details?.src,
					);
					if (name) return name;
				}
				return null;
			})();

			const name =
				track.name ??
				`${formatLabel(dominantType)} ${typeCounters[dominantType]}`;
			return { id: track.id, type: dominantType, name, height, firstItemName };
		});
	}, [tracks, trackItemsMap]);

	if (!trackInfos.length) return null;

	return (
		<div style={{ height: "100%", overflow: "hidden", position: "relative" }}>
			<div
				style={{
					transform: `translateY(${CANVAS_TOP_OFFSET - scrollTop}px)`,
					willChange: "transform",
				}}
			>
				{trackInfos.map((track, i) => (
					<TrackLabel
						key={track.id}
						track={track}
						isFirst={i === 0}
						locked={lockedTrackIds.includes(track.id)}
						muted={mutedTrackIds.includes(track.id)}
						solo={soloTrackIds.includes(track.id)}
						onMeta={(patch) => handleMeta(track.id, patch)}
					/>
				))}
			</div>
		</div>
	);
}

// ── Single track row ───────────────────────────────────────────────────────────
function TrackLabel({
	track,
	isFirst,
	locked,
	muted,
	solo,
	onMeta,
}: {
	track: TrackInfo;
	isFirst: boolean;
	locked: boolean;
	muted: boolean;
	solo: boolean;
	onMeta: (patch: {
		locked?: boolean;
		muted?: boolean;
		solo?: boolean;
	}) => void;
}) {
	const colors = TRACK_COLORS[track.type] ?? TRACK_COLORS.default;
	const topGap = isFirst ? 0 : TRACK_GAP;

	return (
		<div
			style={{ height: track.height + topGap }}
			className="flex flex-col justify-end"
		>
			<div
				style={{ height: track.height }}
				className={cn(
					"flex items-center gap-1 px-1 border-l-2 select-none cursor-default",
					"hover:bg-muted/40 transition-colors",
					colors.border,
					locked && "opacity-50",
					muted && "opacity-60",
				)}
			>
				{/* Type icon */}
				<div className={cn("p-0.5 rounded flex-shrink-0", colors.bg)}>
					{TRACK_ICONS[track.type] ?? <Layers className="w-3.5 h-3.5" />}
				</div>

				{/* Name */}
				<div className="flex flex-col min-w-0 flex-1 overflow-hidden">
					<span className="text-[9px] font-semibold text-foreground truncate leading-tight">
						{track.name}
					</span>
					{track.firstItemName && (
						<span className="text-[7px] text-muted-foreground truncate leading-tight">
							{track.firstItemName}
						</span>
					)}
				</div>

				{/* Solo / Mute / Lock */}
				{track.height >= 32 && (
					<div className="flex items-center gap-0.5 flex-shrink-0">
						<button
							title="Solo"
							onClick={() => onMeta({ solo: !solo })}
							className={cn(
								"w-4 h-4 flex items-center justify-center rounded text-[8px] font-bold transition-colors",
								solo
									? "bg-yellow-500 text-black"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							S
						</button>

						<button
							title={muted ? "Unmute" : "Mute"}
							onClick={() => onMeta({ muted: !muted })}
							className={cn(
								"w-4 h-4 flex items-center justify-center rounded transition-colors",
								muted
									? "text-red-400"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{muted ? (
								<VolumeX className="w-2.5 h-2.5" />
							) : (
								<Volume2 className="w-2.5 h-2.5" />
							)}
						</button>

						<button
							title={locked ? "Unlock" : "Lock"}
							onClick={() => onMeta({ locked: !locked })}
							className={cn(
								"w-4 h-4 flex items-center justify-center rounded transition-colors",
								locked
									? "text-amber-400"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{locked ? (
								<Lock className="w-2.5 h-2.5" />
							) : (
								<LockOpen className="w-2.5 h-2.5" />
							)}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
