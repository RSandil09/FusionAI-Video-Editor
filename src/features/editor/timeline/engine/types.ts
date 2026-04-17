import type { IDisplay, ITrim, ITimelineScaleState } from "@designcombo/types";

// ─── Coordinate / unit helpers ────────────────────────────────────────────────
export const PREVIEW_FRAME_WIDTH = 188;
export const FRAME_INTERVAL = 1000 / 60; // 16.667 ms

export function timeMsToUnits(timeMs: number, zoom = 1): number {
	return timeMs * (60 / 1000) * PREVIEW_FRAME_WIDTH * zoom;
}

export function unitsToTimeMs(units: number, zoom = 1): number {
	return (units / (PREVIEW_FRAME_WIDTH * zoom)) * FRAME_INTERVAL;
}

// ─── Rect helpers ─────────────────────────────────────────────────────────────
export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export function rectContains(r: Rect, px: number, py: number): boolean {
	return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
	return (
		a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
	);
}

// ─── Item types ───────────────────────────────────────────────────────────────
export type ItemType =
	| "video"
	| "audio"
	| "text"
	| "image"
	| "caption"
	| "track"
	| "helper"
	| "preview"
	| "linealAudioBars"
	| "radialAudioBars"
	| "waveAudioBars"
	| "hillAudioBars";

// ─── Snap point ───────────────────────────────────────────────────────────────
export interface SnapPoint {
	timeMs: number;
	source: "item-start" | "item-end" | "playhead" | "marker";
}

// ─── Marker ───────────────────────────────────────────────────────────────────
export interface TimelineMarker {
	id: string;
	timeMs: number;
	label: string;
	color: string;
}

// ─── Track metadata (augments ITrack) ─────────────────────────────────────────
export interface TrackMeta {
	id: string;
	locked: boolean;
	muted: boolean;
	solo: boolean;
	height: number; // px
	type: ItemType;
}

// ─── Tool modes ───────────────────────────────────────────────────────────────
export type ToolMode =
	| "select" // default — click, drag, resize
	| "razor" // click to split at cursor position
	| "hand" // pan timeline
	| "marker"; // click to place marker

// ─── Engine options (passed to CanvasEngine constructor) ──────────────────────
export interface EngineOptions {
	canvas: HTMLCanvasElement;
	width: number;
	height: number;
	spacing: { left: number; right: number };
	scale: ITimelineScaleState;
	duration: number;
	fps: number;
	sizesMap: Record<string, number>;
	trackGap: number; // px between tracks
	canvasTopOffset: number; // px — space above first track (ruler area)
	selectionColor: string;
	selectionBorderColor: string;
	guideLineColor: string;
	onScroll: (v: { scrollTop: number; scrollLeft: number }) => void;
	onResizeCanvas: (size: { width: number; height: number }) => void;
	onSelectionChange: (ids: string[]) => void;
	onItemMove: (id: string, display: IDisplay) => void;
	onItemResize: (id: string, display: IDisplay, trim: ITrim) => void;
	onItemSplit: (id: string, timeMs: number) => void;
	onMarkerAdd: (marker: TimelineMarker) => void;
	onMarkerSeek: (timeMs: number) => void;
	/** Called when an item is dropped onto a different track of the same type */
	onItemChangeTrack?: (
		id: string,
		display: IDisplay,
		fromTrackId: string,
		toTrackId: string,
	) => void;
	/**
	 * Called when the user clicks the zone between two adjacent clips.
	 * `x` and `y` are viewport coordinates used to position an anchor popover.
	 */
	onTransitionZoneClick?: (
		fromId: string,
		toId: string,
		x: number,
		y: number,
	) => void;
	/**
	 * Called when the user drags a transition from the panel and drops it onto
	 * the zone between two adjacent clips.  `data` is the raw `TransitionDef`
	 * object (not lowercased) recovered from the drag payload.
	 */
	onTransitionDrop?: (fromId: string, toId: string, data: unknown) => void;
}

// ─── Drag / resize state ──────────────────────────────────────────────────────
export type DragKind =
	| "move"
	| "resize-left"
	| "resize-right"
	| "selection-rect";

export interface ActiveDrag {
	kind: DragKind;
	itemId?: string;
	startCanvasX: number;
	startCanvasY: number;
	startScreenX: number;
	startScreenY: number;
	originalDisplay?: IDisplay;
	originalTrim?: ITrim;
	/** IDs of sibling items moved by a ripple (Alt+drag) operation */
	movedSiblingIds?: Set<string>;
	/** Track row ID where the drag started */
	sourceTrackId?: string;
	/** Track row ID currently being hovered (for cross-track drop) */
	targetTrackId?: string;
	/** item.top at drag start — used to restore when not merging */
	originalTop?: number;
	// For selection-rect
	selX?: number;
	selY?: number;
	selW?: number;
	selH?: number;
}
