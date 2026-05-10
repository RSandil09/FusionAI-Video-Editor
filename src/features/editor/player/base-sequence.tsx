import { ISize, ITrackItem } from "@designcombo/types";
import { AbsoluteFill, Sequence } from "remotion";
import { calculateFrames } from "../utils/frames";
import { buildFilter, calculateContainerStyles } from "./styles";
import { TransitionSeries } from "@designcombo/transitions";

export interface SequenceItemOptions {
	handleTextChange?: (id: string, text: string) => void;
	fps: number;
	editableTextId?: string | null;
	currentTime?: number;
	zIndex?: number;
	onTextBlur?: (id: string, text: string) => void;
	size?: ISize;
	frame?: number;
	isTransition?: boolean;
	/** When true, audio volume is forced to 0 (track is muted or not soloed) */
	muteAudio?: boolean;
}

export const BaseSequence = ({
	item,
	options,
	children,
}: {
	item: ITrackItem;
	options: SequenceItemOptions;
	children: React.ReactNode;
}) => {
	const { details } = item as ITrackItem;
	const { fps, isTransition } = options;
	const { from, durationInFrames } = calculateFrames(
		{
			from: item.display.from,
			to: item.display.to,
		},
		fps,
	);
	const crop = details.crop || {
		x: 0,
		y: 0,
		width: item.details.width,
		height: item.details.height,
	};

	const background =
		details?.background?.type === "color"
			? details?.background?.value
			: typeof details?.background === "string"
				? details?.background
				: "transparent";

	// video/image: filter is applied directly on the media element (CSS filter on a
	// parent div does not cascade to <video> in Chrome due to GPU compositing).
	// All other types get the filter here at the container level.
	const MEDIA_TYPES = new Set(["video", "image"]);
	const containerFilter = MEDIA_TYPES.has(item.type) ? "none" : buildFilter(details);

	if (isTransition) {
		return (
			<TransitionSeries.Sequence
				key={item.id}
				durationInFrames={durationInFrames}
				style={{ pointerEvents: "none" }}
			>
				<AbsoluteFill
					id={item.id}
					data-track-item="transition-element"
					className={`fusion-scene-item id-${item.id} fusion-scene-item-type-${item.type}`}
					style={calculateContainerStyles(details, crop, { background, filter: containerFilter })}
				>
					{children}
				</AbsoluteFill>
			</TransitionSeries.Sequence>
		);
	}

	return (
		<Sequence
			key={item.id}
			from={Math.max(0, from)}
			durationInFrames={Math.max(1, durationInFrames)}
			style={{
				pointerEvents: "none",
			}}
		>
			<AbsoluteFill
				id={item.id}
				data-track-item="transition-element"
				className={`fusion-scene-item id-${item.id} fusion-scene-item-type-${item.type}`}
				style={calculateContainerStyles(
					details,
					crop,
					{
						background,
						filter: containerFilter,
						pointerEvents: item.type === "audio" ? "none" : "auto",
						overflow:
							item.type !== "caption" && item.type !== "text"
								? "hidden"
								: "visible",
					},
					item.type,
				)}
			>
				{children}
			</AbsoluteFill>
		</Sequence>
	);
};
