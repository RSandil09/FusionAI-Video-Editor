import { AbsoluteFill, useCurrentFrame } from "remotion";
import React from "react";
import { SequenceItem } from "../features/editor/player/sequence-item";
import { groupTrackItems } from "../features/editor/utils/track-items";
import { TransitionSeries, Transitions } from "@designcombo/transitions";

interface VideoCompositionProps {
	trackItemsMap: any;
	trackItemIds: string[];
	transitionsMap: any;
	fps: number;
	size: { width: number; height: number };
}

/**
 * Extracts the real URL from a proxied image/video src.
 * In the browser editor, media src is wrapped as:
 *   /api/image-proxy?url=https://pub-xxx.r2.dev/...
 * During server-side Remotion rendering, Puppeteer cannot reach localhost.
 * This function unwraps the proxy URL back to the direct CDN URL.
 */
function resolveMediaSrc(src: string): string {
	if (!src) return src;

	// Match both absolute  (http://localhost:PORT/api/image-proxy?url=...)
	// and relative (/api/image-proxy?url=...) proxy patterns
	const proxyPattern =
		/(?:https?:\/\/[^/]+)?\/api\/(?:image-proxy|video-proxy)\?url=(.+)/;
	const match = src.match(proxyPattern);
	if (match) {
		try {
			return decodeURIComponent(match[1]);
		} catch {
			return match[1];
		}
	}
	return src;
}

/**
 * Collects unique (fontFamily, fontUrl) pairs from all text/caption items
 * and returns a <style> block with @font-face rules.
 * This is the only way to make custom fonts available to Puppeteer during render.
 */
function FontFaceInjector({
	trackItemsMap,
}: {
	trackItemsMap: Record<string, any>;
}): React.ReactElement | null {
	const seen = new Set<string>();
	const rules: string[] = [];

	for (const item of Object.values(trackItemsMap)) {
		const details = item?.details;
		if (!details) continue;
		const { fontFamily, fontUrl } = details;
		if (!fontFamily || !fontUrl) continue;
		const key = `${fontFamily}::${fontUrl}`;
		if (seen.has(key)) continue;
		seen.add(key);
		rules.push(
			`@font-face { font-family: '${fontFamily}'; src: url('${fontUrl}'); font-display: block; }`,
		);
	}

	if (rules.length === 0) return null;
	return <style>{rules.join("\n")}</style>;
}

/**
 * Returns a copy of trackItemsMap with all media src values resolved
 * from proxy URLs to direct CDN URLs.
 */
function resolveTrackItemSrcs(
	trackItemsMap: Record<string, any>,
): Record<string, any> {
	const resolved: Record<string, any> = {};
	for (const [id, item] of Object.entries(trackItemsMap)) {
		if (item?.details?.src) {
			resolved[id] = {
				...item,
				details: {
					...item.details,
					src: resolveMediaSrc(item.details.src),
				},
			};
		} else {
			resolved[id] = item;
		}
	}
	return resolved;
}

/**
 * Main Video Composition rendered by Remotion
 * Uses the same rendering logic as the editor preview
 * but adapted for server-side rendering.
 */
export const VideoComposition: React.FC<VideoCompositionProps> = (props) => {
	const frame = useCurrentFrame();
	const { trackItemIds, transitionsMap, fps, size } = props;

	// Resolve any localhost proxy URLs back to direct R2 CDN URLs
	// so Remotion's Puppeteer renderer can fetch them without needing localhost
	const trackItemsMap = resolveTrackItemSrcs(props.trackItemsMap);

	// Group items for transitions
	const groupedItems = groupTrackItems({
		trackItemIds,
		transitionsMap,
		trackItemsMap,
	});

	return (
		<AbsoluteFill
			style={{
				backgroundColor: "#000000",
				width: size.width,
				height: size.height,
			}}
		>
			<FontFaceInjector trackItemsMap={trackItemsMap} />
			{groupedItems.map((group, index) => {
				if (group.length === 1) {
					const item = trackItemsMap[group[0].id];
					return SequenceItem[item.type](item, {
						fps,
						handleTextChange: () => {},
						onTextBlur: () => {},
						editableTextId: null,
						frame,
						size,
						isTransition: false,
					});
				}

				// Render items with transition
				const firstItem = trackItemsMap[group[0].id];
				const from = (firstItem.display.from / 1000) * fps;

				return (
					<TransitionSeries from={from} key={index}>
						{group.map((item) => {
							if (item.type === "transition") {
								const durationInFrames = (item.duration / 1000) * fps;
								return Transitions[item.kind]({
									durationInFrames,
									...size,
									id: item.id,
									direction: item.direction,
								});
							}
							return SequenceItem[item.type](trackItemsMap[item.id], {
								fps,
								handleTextChange: () => {},
								onTextBlur: () => {},
								editableTextId: null,
								isTransition: true,
								size,
								frame,
							});
						})}
					</TransitionSeries>
				);
			})}
		</AbsoluteFill>
	);
};
