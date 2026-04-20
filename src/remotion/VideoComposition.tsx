import { AbsoluteFill, useCurrentFrame } from "remotion";
import React from "react";
import { SequenceItem } from "../features/editor/player/sequence-item";
import { groupTrackItems } from "../features/editor/utils/track-items";
import { TransitionSeries } from "@designcombo/transitions";
// IMPORTANT: import from our local map, NOT from @designcombo/transitions.
// @designcombo/transitions only has its own built-in kinds; our custom
// presentations (push, glitch, colorSplit, dreamFade, squeeze, crossZoom, …)
// live here and would be undefined in the package's Transitions export → crash.
import { Transitions } from "../features/editor/player/transition-presentations";

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
	// and relative (/api/image-proxy?url=...) proxy patterns.
	// Also handles /api/video-stream which is used by the thumbnail generator
	// but should never reach trackItemsMap — included as a safety net.
	const proxyPattern =
		/(?:https?:\/\/[^/]+)?\/api\/(?:image-proxy|video-proxy|video-stream)\?url=(.+)/;
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
 * Main Video Composition rendered by Remotion (Lambda + local renderer).
 *
 * Defensive rules applied throughout:
 *  - Every trackItemsMap lookup is null-checked before use
 *  - Unknown item.type → skip (no crash)
 *  - Unknown transition kind → fall back to "fade" (no crash)
 *  - Orphaned IDs in transition groups → skip item
 *  - Missing firstItem in a group → skip the whole group
 */
export const VideoComposition: React.FC<VideoCompositionProps> = (props) => {
	const frame = useCurrentFrame();
	const {
		trackItemIds,
		fps,
		size,
	} = props;

	// Guard: transitionsMap may be absent on older saved projects
	const transitionsMap: Record<string, any> = props.transitionsMap ?? {};

	// Resolve any localhost proxy URLs back to direct R2 CDN URLs
	// so Remotion's Puppeteer renderer can fetch them without needing localhost
	const trackItemsMap = resolveTrackItemSrcs(props.trackItemsMap ?? {});

	// Group items for transitions
	const groupedItems = groupTrackItems({
		trackItemIds: trackItemIds ?? [],
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
				// ── Single item (no transition) ─────────────────────────────────────
				if (group.length === 1) {
					const item = trackItemsMap[group[0].id];
					// Guard: orphaned id — item was deleted after state was saved
					if (!item) return null;

					// Guard: unknown item type → skip instead of crashing
					if (!SequenceItem[item.type]) {
						console.warn(
							`[VideoComposition] Unknown item type "${item.type}" (id: ${item.id}) — skipping`,
						);
						return null;
					}

					// Display-window guard: skip items outside their display.from / display.to range
					const itemFromFrame = Math.round(
						((item.display?.from ?? 0) / 1000) * fps,
					);
					const itemToFrame = Math.round(
						((item.display?.to ?? 0) / 1000) * fps,
					);
					if (frame < itemFromFrame || frame >= itemToFrame) return null;

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

				// ── Transition group ────────────────────────────────────────────────
				const firstItem = trackItemsMap[group[0].id];
				// Guard: first item missing from map (state corruption / orphaned id)
				if (!firstItem) {
					console.warn(
						`[VideoComposition] group[0].id "${group[0].id}" not in trackItemsMap — skipping transition group`,
					);
					return null;
				}

				const from = Math.round(
					((firstItem.display?.from ?? 0) / 1000) * fps,
				);

				return (
					<TransitionSeries from={from} key={index}>
						{group.map((item) => {
							// ── Transition presentation ─────────────────────────────
							if (item.type === "transition") {
								const durationInFrames = Math.max(
									1,
									Math.round(((item as any).duration / 1000) * fps),
								);
								// Guard: unknown kind → fall back to fade, never crash the render
								const kind = Transitions[(item as any).kind]
									? (item as any).kind
									: "fade";
								if (!(item as any).kind || !(Transitions[(item as any).kind])) {
									console.warn(
										`[VideoComposition] Unknown transition kind "${(item as any).kind}" — falling back to fade`,
									);
								}
								return Transitions[kind]({
									durationInFrames,
									...size,
									id: item.id,
									direction: (item as any).direction,
									color: (item as any).color,
								});
							}

							// ── Track item inside a transition group ────────────────
							const trackItem = trackItemsMap[item.id];
							// Guard: orphaned id in transition group
							if (!trackItem) {
								console.warn(
									`[VideoComposition] Orphaned id "${item.id}" in transition group — skipping`,
								);
								return null;
							}
							// Guard: unknown item type inside transition group
							if (!SequenceItem[trackItem.type]) {
								console.warn(
									`[VideoComposition] Unknown item type "${trackItem.type}" in transition group (id: ${item.id}) — skipping`,
								);
								return null;
							}
							return SequenceItem[trackItem.type](trackItem, {
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
