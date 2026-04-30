import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./header";
import Ruler from "./ruler";
import { timeMsToUnits, unitsToTimeMs } from "./engine/types";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { filter, subject } from "@designcombo/events";
import {
	TIMELINE_BOUNDING_CHANGED,
	TIMELINE_PREFIX,
} from "@designcombo/timeline";
import useStore from "../store/use-store";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import StateManager from "@designcombo/state";
import {
	TIMELINE_OFFSET_CANVAS_LEFT,
	TIMELINE_OFFSET_CANVAS_RIGHT,
} from "../constants/constants";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import TrackLabels from "./track-labels";
import { CanvasEngine } from "./engine/canvas-engine";
import { buildEngineCallbacks, applyTransition } from "../hooks/use-engine-sync";
import { TransitionPicker } from "./transition-picker";
import type { TransitionDef } from "../data/transitions";

// â”€â”€ Constants â€” must match canvas-engine.ts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SIZES_MAP: Record<string, number> = {
	caption: 32,
	text: 32,
	audio: 36,
	customTrack: 40,
	customTrack2: 40,
	linealAudioBars: 40,
	radialAudioBars: 40,
	waveAudioBars: 40,
	hillAudioBars: 40,
};
const TRACK_GAP = 8;
const CANVAS_TOP_OFFSET = 24;

const Timeline = ({ stateManager }: { stateManager: StateManager }) => {
	const timelineContainerRef = useRef<HTMLDivElement>(null);
	const canvasContainerRef = useRef<HTMLDivElement>(null);
	const canvasElRef = useRef<HTMLCanvasElement>(null);
	const engineRef = useRef<CanvasEngine | null>(null);

	const horizontalScrollbarVpRef = useRef<HTMLDivElement>(null);
	const verticalScrollbarVpRef = useRef<HTMLDivElement>(null);

	const [scrollLeft, setScrollLeft] = useState(0);
	const [scrollTop, setScrollTop] = useState(0);
	const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
	const [scrollSize, setScrollSize] = useState({ width: 0, height: 0 });

	// Transition picker state
	const [pickerState, setPickerState] = useState<{
		fromId: string;
		toId: string;
		x: number;
		y: number;
	} | null>(null);

	const {
		scale,
		playerRef,
		fps,
		duration,
		tracks,
		trackItemsMap,
		transitionsMap,
		activeIds,
		setTimeline,
		lockedTrackIds,
		mutedTrackIds,
		soloTrackIds,
		markers,
	} = useStore();

	const currentFrame = useCurrentPlayerFrame(playerRef);
	const timelineOffsetX = useTimelineOffsetX();

	// â”€â”€ Engine scroll callback â€” updates both scrollbars and track labels â”€â”€â”€â”€â”€â”€â”€â”€
	const onScroll = useCallback(
		(v: { scrollTop?: number; scrollLeft?: number }) => {
			if (v.scrollLeft !== undefined) {
				if (horizontalScrollbarVpRef.current)
					horizontalScrollbarVpRef.current.scrollLeft = v.scrollLeft;
				setScrollLeft(v.scrollLeft);
			}
			if (v.scrollTop !== undefined) {
				if (verticalScrollbarVpRef.current)
					verticalScrollbarVpRef.current.scrollTop = v.scrollTop;
				setScrollTop(v.scrollTop);
			}
		},
		[],
	);

	const onResizeCanvas = useCallback(
		(size: { width: number; height: number }) => {
			setCanvasSize(size);
		},
		[],
	);

	// â”€â”€ Mount engine once â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	useEffect(() => {
		const canvasEl = canvasElRef.current;
		const containerEl = canvasContainerRef.current;
		if (!canvasEl || !containerEl) return;

		// Remove any Fabric.js remnants (.canvas-container + .upper-canvas)
		const canvasParent = canvasEl.parentElement;
		if (canvasParent && canvasParent.classList.contains("canvas-container")) {
			const grandParent = canvasParent.parentElement;
			if (grandParent) {
				grandParent.insertBefore(canvasEl, canvasParent);
				grandParent.removeChild(canvasParent);
			}
		}
		containerEl.querySelectorAll(".upper-canvas").forEach((el) => el.remove());

		const rect = containerEl.getBoundingClientRect();
		const containerWidth = Math.max(rect.width, 400);
		const containerHeight = Math.max(rect.height, 200);

		const callbacks = buildEngineCallbacks(
			stateManager,
			fps,
			playerRef,
			engineRef,
			(fromId, toId, x, y) => {
				setPickerState({ fromId, toId, x, y });
				// Find the transition between these two clips and set it as active
				// so the right-side panel shows transition properties.
				const state = stateManager.getState();
				const entry = Object.values(state.transitionsMap ?? {}).find(
					(t: any) => t.fromId === fromId && t.toId === toId && t.kind !== "none",
				) as any;
				if (entry?.id) {
					useStore.getState().setActiveTransitionId(entry.id);
				}
			},
		);

		const eng = new CanvasEngine(canvasEl, {
			canvas: canvasEl,
			width: containerWidth,
			height: containerHeight,
			spacing: {
				left: TIMELINE_OFFSET_CANVAS_LEFT,
				right: TIMELINE_OFFSET_CANVAS_RIGHT,
			},
			scale,
			duration,
			fps,
			sizesMap: SIZES_MAP,
			trackGap: TRACK_GAP,
			canvasTopOffset: CANVAS_TOP_OFFSET,
			selectionColor: "rgba(0,216,214,0.1)",
			selectionBorderColor: "rgba(0,216,214,1)",
			guideLineColor: "#00d8d6",
			...callbacks,
			onScroll,
			onResizeCanvas,
		});

		engineRef.current = eng;
		setTimeline(eng as any);
		setCanvasSize({ width: containerWidth, height: containerHeight });

		eng.syncFromState({
			tracks,
			trackItemsMap,
			transitionsMap,
			duration,
			scale,
			sizesMap: SIZES_MAP,
			trackGap: TRACK_GAP,
			canvasTopOffset: CANVAS_TOP_OFFSET,
			activeIds,
		});

		// Restore persisted markers from the store into the engine
		const savedMarkers = useStore.getState().markers;
		if (savedMarkers.length) eng.setMarkers(savedMarkers);

		return () => {
			eng.purge();
			engineRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// â”€â”€ ResizeObserver â€” keep canvas filling its container â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	useEffect(() => {
		const containerEl = canvasContainerRef.current;
		if (!containerEl) return;
		const ro = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect;
			if (width > 10 && height > 10 && engineRef.current) {
				engineRef.current.resize({ width, height });
				setCanvasSize({ width, height });
			}
		});
		ro.observe(containerEl);
		return () => ro.disconnect();
	}, []);

	// â”€â”€ Sync structural state â†’ engine (tracks/items/scale/duration + meta) â”€â”€â”€â”€â”€â”€
	// Meta (locked/muted/solo) is applied in the same effect so there's no
	// 1-frame flash where rows briefly show as unlocked/unmuted.
	useEffect(() => {
		const eng = engineRef.current;
		if (!eng) return;
		eng.syncFromState({
			tracks,
			trackItemsMap,
			transitionsMap,
			duration,
			scale,
			sizesMap: SIZES_MAP,
			trackGap: TRACK_GAP,
			canvasTopOffset: CANVAS_TOP_OFFSET,
			// activeIds intentionally omitted â€” handled by the dedicated effect below
		});
		for (const row of eng.getTrackRows()) {
			eng.setTrackMeta(row.id, {
				locked: lockedTrackIds.includes(row.id),
				muted: mutedTrackIds.includes(row.id),
				solo: soloTrackIds.includes(row.id),
			});
		}
	}, [
		tracks,
		trackItemsMap,
		transitionsMap,
		scale,
		duration,
		lockedTrackIds,
		mutedTrackIds,
		soloTrackIds,
	]);

	// â”€â”€ Sync selection only â€” lightweight, no full rebuild â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	useEffect(() => {
		engineRef.current?.setActiveIds(activeIds);
	}, [activeIds]);

	// â”€â”€ Sync markers from store â†’ engine (covers restore-from-DB on load) â”€â”€â”€â”€â”€â”€â”€â”€
	useEffect(() => {
		if (!engineRef.current) return;
		engineRef.current.setMarkers(markers);
	}, [markers]);

	// â”€â”€ Playhead â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	useEffect(() => {
		if (!engineRef.current || !fps) return;
		engineRef.current.setPlayheadMs((currentFrame / fps) * 1000);
	}, [currentFrame, fps]);

	// â”€â”€ Auto-scroll canvas to keep playhead visible â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	useEffect(() => {
		const hVp = horizontalScrollbarVpRef.current;
		if (!hVp || !fps) return;
		const position = timeMsToUnits((currentFrame / fps) * 1000, scale.zoom);
		const canvasEl = canvasElRef.current;
		if (!canvasEl) return;
		const boundX = canvasEl.getBoundingClientRect().x + canvasEl.clientWidth;
		if (position - scrollLeft + 40 >= boundX) {
			const total = hVp.scrollWidth;
			const vp = hVp.clientWidth;
			const cur = hVp.scrollLeft;
			const available = total - vp - cur;
			if (available >= 0) {
				hVp.scrollTo({ left: available > vp ? cur + vp : total - vp });
			}
		}
	}, [currentFrame]);

	// â”€â”€ Listen for legacy TIMELINE_BOUNDING_CHANGED events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	useEffect(() => {
		const sub = subject
			.pipe(filter(({ key }) => key.startsWith(TIMELINE_PREFIX)))
			.subscribe((obj) => {
				if (obj.key === TIMELINE_BOUNDING_CHANGED) {
					const b = obj.value?.payload?.bounding;
					if (b) setScrollSize({ width: b.width, height: b.height });
				}
			});
		return () => sub.unsubscribe();
	}, []);

	// â”€â”€ Scrollbar event handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	const handleScrollH = (e: React.UIEvent<HTMLDivElement>) => {
		const sl = e.currentTarget.scrollLeft;
		engineRef.current?.scrollTo({ scrollLeft: sl });
		setScrollLeft(sl);
	};

	const handleScrollV = (e: React.UIEvent<HTMLDivElement>) => {
		const st = e.currentTarget.scrollTop;
		engineRef.current?.scrollTo({ scrollTop: st });
		setScrollTop(st);
	};

	// â”€â”€ Ruler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	const onClickRuler = (units: number) => {
		const timeMs = unitsToTimeMs(units, scale.zoom);
		playerRef?.current?.seekTo(Math.round((timeMs * fps) / 1000));
	};

	const onRulerScroll = (newLeft: number) => {
		engineRef.current?.scrollTo({ scrollLeft: newLeft });
		if (horizontalScrollbarVpRef.current)
			horizontalScrollbarVpRef.current.scrollLeft = newLeft;
		setScrollLeft(newLeft);
	};

	// â”€â”€ Track meta â†’ engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
	const handleTrackMetaChange = useCallback(
		(
			trackId: string,
			patch: { locked?: boolean; muted?: boolean; solo?: boolean },
		) => {
			engineRef.current?.setTrackMeta(trackId, patch);
		},
		[],
	);

	return (
		<div
			ref={timelineContainerRef}
			id="timeline-container"
			className="bg-background relative h-full w-full overflow-hidden flex flex-col"
		>
			{/* Transition picker portal */}
			{pickerState && (
				<TransitionPicker
					fromId={pickerState.fromId}
					toId={pickerState.toId}
					anchorX={pickerState.x}
					anchorY={pickerState.y}
					onSelect={(transition: TransitionDef) => {
						applyTransition(stateManager, pickerState.fromId, pickerState.toId, transition);
						setPickerState(null);
						// After applying, find the new transition entry so the right panel
						// reflects the updated transition (or clears if "none" was selected).
						if (transition.kind === "none") {
							useStore.getState().setActiveTransitionId(null);
						} else {
							// Give stateManager a tick to commit before reading back
							setTimeout(() => {
								const state = stateManager.getState();
								const entry = Object.values(state.transitionsMap ?? {}).find(
									(t: any) =>
										t.fromId === pickerState.fromId &&
										t.toId === pickerState.toId &&
										t.kind !== "none",
								) as any;
								useStore.getState().setActiveTransitionId(entry?.id ?? null);
							}, 0);
						}
					}}
					onClose={() => setPickerState(null)}
				/>
			)}
			{/* Header */}
			<Header stateManager={stateManager} />

			{/* Ruler */}
			<Ruler
				onClick={onClickRuler}
				scrollLeft={scrollLeft}
				onScroll={onRulerScroll}
			/>

			{/* Track area */}
			<div className="flex flex-1 overflow-hidden">
				{/* Track labels â€” left column, clips overflow, mirrors canvas scroll via translateY */}
				<div
					id="track-labels-container"
					style={{ width: timelineOffsetX, flexShrink: 0, overflow: "hidden" }}
					className="bg-background/95 border-r border-border/40 relative"
				>
					<TrackLabels
						scrollTop={scrollTop}
						onTrackMetaChange={handleTrackMetaChange}
					/>
				</div>

				{/* Canvas + scrollbars */}
				<div
					ref={canvasContainerRef}
					className="relative flex-1 overflow-hidden"
				>
					<canvas
						id="fusion-timeline-canvas"
						ref={canvasElRef}
						style={{ display: "block", position: "absolute", top: 0, left: 0 }}
					/>

					{/* Horizontal scrollbar */}
					<ScrollArea.Root
						type="always"
						style={{
							position: "absolute",
							bottom: 0,
							left: 0,
							right: 0,
							height: 10,
						}}
						className="ScrollAreaRootH"
					>
						<ScrollArea.Viewport
							ref={horizontalScrollbarVpRef}
							onScroll={handleScrollH}
							className="ScrollAreaViewport"
							id="viewportH"
						>
							<div
								style={{
									width:
										Math.max(scrollSize.width, canvasSize.width) +
										TIMELINE_OFFSET_CANVAS_RIGHT,
									height: 1,
								}}
							/>
						</ScrollArea.Viewport>
						<ScrollArea.Scrollbar
							className="ScrollAreaScrollbar"
							orientation="horizontal"
						>
							<ScrollArea.Thumb className="ScrollAreaThumb" />
						</ScrollArea.Scrollbar>
					</ScrollArea.Root>

					{/* Vertical scrollbar */}
					<ScrollArea.Root
						type="always"
						style={{
							position: "absolute",
							top: 0,
							right: 0,
							bottom: 10,
							width: 10,
						}}
						className="ScrollAreaRootV"
					>
						<ScrollArea.Viewport
							ref={verticalScrollbarVpRef}
							onScroll={handleScrollV}
							className="ScrollAreaViewport"
						>
							<div
								style={{
									height: Math.max(scrollSize.height, canvasSize.height) + 40,
									width: 1,
								}}
							/>
						</ScrollArea.Viewport>
						<ScrollArea.Scrollbar
							className="ScrollAreaScrollbar"
							orientation="vertical"
						>
							<ScrollArea.Thumb className="ScrollAreaThumb" />
						</ScrollArea.Scrollbar>
					</ScrollArea.Root>
				</div>
			</div>
		</div>
	);
};

export default Timeline;
