/**
 * CanvasEngine — pure Canvas 2D timeline engine
 *
 * Replaces @designcombo/timeline (Fabric.js-based). Zero external dependencies.
 * API is compatible with the existing CanvasTimeline wrapper.
 *
 * Rendering pipeline (per frame):
 *   1. Clear
 *   2. Track row backgrounds (with muted / locked state)
 *   3. Transitions between adjacent clips
 *   4. Items (video filmstrip, audio waveform, text, etc.)
 *   5. Snap guide line
 *   6. Playhead line
 *   7. Markers
 *   8. Selection rect (if box-selecting)
 */

import type {
  IDisplay,
  ITrim,
  ITrack,
  ITrackItem,
  ITimelineScaleState,
  ITransition,
} from "@designcombo/types";
import {
  type EngineOptions,
  type ActiveDrag,
  type DragKind,
  type SnapPoint,
  type TimelineMarker,
  type ToolMode,
  timeMsToUnits,
  unitsToTimeMs,
} from "./types";
import { BaseItem } from "./items/base-item";
import { VideoItem } from "./items/video-item";
import { AudioItem } from "./items/audio-item";
import { TextItem } from "./items/text-item";
import { CaptionItem } from "./items/caption-item";
import { ImageItem } from "./items/image-item";
import { HelperItem } from "./items/helper-item";
import { SECONDARY_FONT } from "../../constants/constants";

// ─── Track row geometry ───────────────────────────────────────────────────────

export interface TrackRow {
  id: string;
  type: string;
  top: number;
  height: number;
  locked: boolean;
  muted: boolean;
  solo: boolean;
  itemIds: string[];
}

const DEFAULT_SIZES: Record<string, number> = {
  caption: 32,
  text: 32,
  audio: 36,
  video: 44,
  image: 44,
  default: 44,
};

// ─── Track row fill colors ─────────────────────────────────────────────────────
const ROW_BG_EVEN = "rgba(255,255,255,0.015)";
const ROW_BG_ODD = "rgba(0,0,0,0.15)";
const ROW_BG_LOCKED = "rgba(255,255,255,0.04)";
const ROW_BG_MUTED = "rgba(255,40,40,0.04)";

// ─── Snap threshold ───────────────────────────────────────────────────────────
const SNAP_THRESHOLD_PX = 8;

// ─── Ruler height / canvas top ────────────────────────────────────────────────
const RULER_H = 24;

// ─── Transition zone width (px) ───────────────────────────────────────────────
const TRANSITION_W = 24;

export class CanvasEngine {
  // ── Canvas / DOM ─────────────────────────────────────────────────────────────
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  width: number;
  height: number;

  // ── Viewport ──────────────────────────────────────────────────────────────────
  private translateX = 0; // = -scrollLeft
  private translateY = 0; // = -scrollTop

  // ── Items & tracks ────────────────────────────────────────────────────────────
  private items: BaseItem[] = [];
  private trackRows: TrackRow[] = [];
  private transitionsMap: Record<string, ITransition> = {};

  // ── Markers ───────────────────────────────────────────────────────────────────
  private markers: TimelineMarker[] = [];

  // ── Selection ─────────────────────────────────────────────────────────────────
  private selectedIds: Set<string> = new Set();

  // ── Playhead ──────────────────────────────────────────────────────────────────
  private playheadMs = 0;

  // ── Interaction ───────────────────────────────────────────────────────────────
  private drag: ActiveDrag | null = null;
  private toolMode: ToolMode = "select";

  // ── Snap ──────────────────────────────────────────────────────────────────────
  private snapPoints: SnapPoint[] = [];
  private guideLine: number | null = null;

  // ── Razor preview ─────────────────────────────────────────────────────────────
  /** Canvas-space X of the current razor hover position (null = not hovering over an item) */
  private razorPreviewX: number | null = null;

  // ── Options ───────────────────────────────────────────────────────────────────
  private opts: EngineOptions;

  // ── RAF loop ──────────────────────────────────────────────────────────────────
  private rafId = 0;
  private needsRender = true;

  // ── State cache ───────────────────────────────────────────────────────────────
  private lastScale: ITimelineScaleState | null = null;
  private lastDuration = 0;
  private spacing: { left: number; right: number };

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions) {
    this.canvas = canvas;
    this.opts = opts;
    this.width = opts.width;
    this.height = opts.height;
    this.spacing = opts.spacing;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("CanvasEngine: 2D context unavailable");
    this.ctx = ctx;

    canvas.width = opts.width;
    canvas.height = opts.height;
    canvas.style.display = "block";

    // Bind pointer events
    canvas.addEventListener("mousedown", this.onMouseDown);
    canvas.addEventListener("mousemove", this.onMouseMove);
    canvas.addEventListener("mouseup", this.onMouseUp);
    canvas.addEventListener("mouseleave", this.onMouseLeave);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("dblclick", this.onDblClick);
    canvas.addEventListener("contextmenu", this.onContextMenu);

    this.loop();
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  syncFromState(payload: {
    tracks: ITrack[];
    trackItemsMap: Record<string, ITrackItem>;
    transitionsMap?: Record<string, ITransition>;
    duration: number;
    scale: ITimelineScaleState;
    sizesMap?: Record<string, number>;
    trackGap?: number;
    canvasTopOffset?: number;
    /** When omitted, existing selection is preserved */
    activeIds?: string[];
  }) {
    const {
      tracks,
      trackItemsMap,
      transitionsMap = {},
      duration,
      scale,
      sizesMap = {},
      trackGap = this.opts.trackGap ?? 8,
      canvasTopOffset = RULER_H,
      activeIds,
    } = payload;

    const scaleChanged =
      !this.lastScale ||
      this.lastScale.zoom !== scale.zoom ||
      this.lastScale.unit !== scale.unit;
    this.lastScale = scale;
    this.lastDuration = duration;
    this.transitionsMap = transitionsMap;

    if (activeIds !== undefined) this.selectedIds = new Set(activeIds);

    const existingMap = new Map<string, BaseItem>(this.items.map((i) => [i.id, i]));
    const newItems: BaseItem[] = [];
    const newTrackRows: TrackRow[] = [];

    let trackTop = canvasTopOffset;

    for (let ti = 0; ti < tracks.length; ti++) {
      const track = tracks[ti];
      const itemIds: string[] = (track as any).items ?? (track as any).trackItemIds ?? [];
      const dominantType = this.getDominantType(itemIds, trackItemsMap);
      const trackHeight =
        sizesMap[dominantType] ??
        DEFAULT_SIZES[dominantType] ??
        DEFAULT_SIZES.default;

      // Build track row metadata
      newTrackRows.push({
        id: track.id,
        type: dominantType,
        top: trackTop,
        height: trackHeight,
        locked: (track as any).locked ?? false,
        muted: (track as any).muted ?? false,
        solo: (track as any).solo ?? false,
        itemIds,
      });

      for (const itemId of itemIds) {
        const trackItem = trackItemsMap[itemId];
        if (!trackItem) continue;

        const display: IDisplay = trackItem.display ?? { from: 0, to: duration };
        const trim: ITrim =
          (trackItem as any).trim ?? { from: 0, to: (trackItem as any).duration ?? duration };
        const itemDuration: number = (trackItem as any).duration ?? duration;
        const playbackRate: number = (trackItem as any).playbackRate ?? 1;
        const type = (trackItem.type ?? "video") as string;

        const baseOpts = {
          id: itemId,
          type: type as any,
          display,
          trim,
          duration: itemDuration,
          playbackRate,
          tScale: scale.zoom,
          top: trackTop,
          height: trackHeight,
          spacing: this.spacing,
          engineRef: { requestRenderAll: () => this.requestRenderAll() },
        };

        let item = existingMap.get(itemId);
        if (item) {
          item.display = display;
          item.trim = trim;
          item.duration = itemDuration;
          item.playbackRate = playbackRate;
          item.tScale = scale.zoom;
          item.top = trackTop;
          item.height = trackHeight;
          item.isSelected = this.selectedIds.has(itemId);
          item.recalcLayout();
          if (scaleChanged) (item as any).onScale?.();
        } else {
          item = this.createItem(type, baseOpts, trackItem);
          item.isSelected = this.selectedIds.has(itemId);
        }

        newItems.push(item);
      }

      trackTop += trackHeight + trackGap;
    }

    this.items = newItems;
    this.trackRows = newTrackRows;
    this.buildSnapPoints();

    // Grow canvas if content overflows
    const contentHeight = trackTop + 40;
    if (contentHeight > this.height) {
      this.resize({ width: this.width, height: contentHeight });
    }

    this.requestRenderAll();
  }

  scrollTo(v: { scrollLeft?: number; scrollTop?: number }) {
    if (v.scrollLeft !== undefined) this.translateX = -v.scrollLeft;
    if (v.scrollTop !== undefined) this.translateY = -v.scrollTop;
    this.onScrollItems();
    this.requestRenderAll();
  }

  resize(size: { width: number; height: number }, _opts?: { force?: boolean }) {
    this.width = size.width;
    this.height = size.height;
    this.canvas.width = size.width;
    this.canvas.height = size.height;
    this.opts.onResizeCanvas(size);
    this.requestRenderAll();
  }

  setPlayheadMs(ms: number) {
    if (this.playheadMs === ms) return;
    this.playheadMs = ms;
    this.requestRenderAll();
  }

  setToolMode(mode: ToolMode) {
    this.toolMode = mode;
    if (mode !== "razor" && this.razorPreviewX !== null) {
      this.razorPreviewX = null;
      this.requestRenderAll();
    }
    this.canvas.style.cursor =
      mode === "hand" ? "grab"
      : mode === "razor" ? "crosshair"
      : mode === "marker" ? "cell"
      : "default";
  }

  setTrackMeta(trackId: string, patch: Partial<Pick<TrackRow, "locked" | "muted" | "solo">>) {
    const row = this.trackRows.find((r) => r.id === trackId);
    if (!row) return;
    Object.assign(row, patch);
    this.requestRenderAll();
  }

  addMarker(marker: TimelineMarker) {
    this.markers.push(marker);
    this.requestRenderAll();
  }

  removeMarker(id: string) {
    this.markers = this.markers.filter((m) => m.id !== id);
    this.requestRenderAll();
  }

  getTrackRows(): TrackRow[] {
    return this.trackRows;
  }

  /** Lightweight selection update — no full track/item rebuild */
  setActiveIds(ids: string[]) {
    this.selectedIds = new Set(ids);
    for (const item of this.items) item.isSelected = this.selectedIds.has(item.id);
    this.requestRenderAll();
  }

  getMarkers(): TimelineMarker[] {
    return [...this.markers];
  }

  setMarkers(markers: TimelineMarker[]) {
    this.markers = markers;
    this.requestRenderAll();
  }

  requestRenderAll() {
    this.needsRender = true;
  }

  purge() {
    cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mouseup", this.onMouseUp);
    this.canvas.removeEventListener("mouseleave", this.onMouseLeave);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("dblclick", this.onDblClick);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
    this.items = [];
    this.trackRows = [];
  }

  // ── RAF loop ──────────────────────────────────────────────────────────────────

  private loop = () => {
    this.rafId = requestAnimationFrame(this.loop);
    if (!this.needsRender) return;
    this.needsRender = false;
    this.render();
  };

  // ── Full render pipeline ──────────────────────────────────────────────────────

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(this.translateX, this.translateY);

    // 1 — Track row backgrounds
    this.renderTrackRows(ctx);

    // 2 — Transition zones
    this.renderTransitions(ctx);

    // 3 — Items (check if track is solo-active → dim non-solo)
    const hasSolo = this.trackRows.some((r) => r.solo);
    for (const item of this.items) {
      const row = this.trackRows.find((r) => r.itemIds.includes(item.id));
      if (!row) { item.render(ctx); continue; }
      const dimmed = (hasSolo && !row.solo) || row.muted;
      if (dimmed) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        item.render(ctx);
        ctx.globalAlpha = 1;
        ctx.restore();
      } else {
        item.render(ctx);
      }
    }

    // 4 — Muted / locked overlays on top of items
    this.renderTrackStateOverlays(ctx);

    // 5 — Snap guide line
    if (this.guideLine !== null) {
      this.renderGuideLine(ctx, this.guideLine);
    }

    // 5b — Razor preview cut line
    if (this.toolMode === "razor" && this.razorPreviewX !== null) {
      this.renderRazorPreview(ctx, this.razorPreviewX);
    }

    // 6 — Playhead
    this.renderPlayhead(ctx);

    // 7 — Markers
    this.renderMarkers(ctx);

    ctx.restore();

    // 8 — Selection rect (screen space, not scrolled)
    if (this.drag?.kind === "selection-rect" && (this.drag.selW ?? 0) > 2) {
      this.renderSelectionRect(ctx);
    }
  }

  /** Overlays drawn OVER items to visually communicate muted/locked/solo state */
  private renderTrackStateOverlays(ctx: CanvasRenderingContext2D) {
    const contentWidth = Math.max(
      this.width - this.translateX + 400,
      timeMsToUnits(this.lastDuration, this.lastScale?.zoom ?? 1) + this.spacing.left + 400,
    );
    const hasSolo = this.trackRows.some((r) => r.solo);

    for (const row of this.trackRows) {
      // MUTED — red tint overlay + waveform crossed-out icon
      if (row.muted) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = "rgba(30,0,0,0.85)";
        ctx.fillRect(0, row.top, contentWidth, row.height);
        ctx.globalAlpha = 1;

        // "MUTED" badge
        ctx.fillStyle = "rgba(239,68,68,0.9)";
        ctx.font = `bold 9px sans-serif`;
        ctx.textBaseline = "middle";
        ctx.fillText("MUTED", 6, row.top + row.height / 2);
        ctx.restore();
      }

      // LOCKED — dark hatched overlay
      if (row.locked) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, row.top, contentWidth, row.height);
        ctx.globalAlpha = 0.15;
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1;
        const step = 10;
        for (let x = 0; x < contentWidth + row.height; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, row.top);
          ctx.lineTo(x - row.height, row.top + row.height);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // "LOCKED" badge
        ctx.fillStyle = "rgba(250,204,21,0.95)";
        ctx.font = `bold 9px sans-serif`;
        ctx.textBaseline = "middle";
        ctx.fillText("🔒 LOCKED", 6, row.top + row.height / 2);
        ctx.restore();
      }

      // NON-SOLO dim (when another track has solo)
      if (hasSolo && !row.solo) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, row.top, contentWidth, row.height);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }
  }

  // ── Track row backgrounds ─────────────────────────────────────────────────────

  private renderTrackRows(ctx: CanvasRenderingContext2D) {
    const contentWidth = Math.max(
      this.width - this.translateX + 200,
      timeMsToUnits(this.lastDuration, this.lastScale?.zoom ?? 1) + this.spacing.left + 200,
    );

    for (let i = 0; i < this.trackRows.length; i++) {
      const row = this.trackRows[i];

      let fill = i % 2 === 0 ? ROW_BG_EVEN : ROW_BG_ODD;
      if (row.muted) fill = ROW_BG_MUTED;
      if (row.locked) fill = ROW_BG_LOCKED;

      ctx.fillStyle = fill;
      ctx.fillRect(0, row.top, contentWidth, row.height);

      // Left accent stripe (type color)
      ctx.fillStyle = this.trackAccentColor(row.type);
      ctx.fillRect(0, row.top, 3, row.height);

      // Locked overlay pattern
      if (row.locked) {
        ctx.save();
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = "#ffffff";
        const stripeW = 8;
        for (let x = 0; x < contentWidth; x += stripeW * 2) {
          ctx.fillRect(x, row.top, stripeW, row.height);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Bottom border
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, row.top + row.height);
      ctx.lineTo(contentWidth, row.top + row.height);
      ctx.stroke();
    }
  }

  private trackAccentColor(type: string): string {
    const colors: Record<string, string> = {
      video: "#3b82f6",
      image: "#10b981",
      audio: "#8b5cf6",
      text: "#f59e0b",
      caption: "#f97316",
    };
    return colors[type] ?? "#52525b";
  }

  // ── Transition rendering ──────────────────────────────────────────────────────

  private renderTransitions(ctx: CanvasRenderingContext2D) {
    // Group items by track row
    for (const row of this.trackRows) {
      const rowItems = this.items.filter((it) => row.itemIds.includes(it.id));
      // Sort by start position
      rowItems.sort((a, b) => a.left - b.left);

      for (let i = 0; i < rowItems.length - 1; i++) {
        const a = rowItems[i];
        const b = rowItems[i + 1];
        // Adjacent items — draw transition zone
        const gap = b.left - (a.left + a.width);
        if (Math.abs(gap) < 4) {
          this.renderTransitionZone(ctx, a.left + a.width - TRANSITION_W / 2, row.top, TRANSITION_W, row.height);
        }
      }
    }

    // Also render named transitions from state
    for (const [, tr] of Object.entries(this.transitionsMap)) {
      const zoom = this.lastScale?.zoom ?? 1;
      const x = timeMsToUnits((tr as any).startTime ?? 0, zoom) + this.spacing.left - TRANSITION_W / 2;
      const rowForTr = this.trackRows.find((r) =>
        r.itemIds.includes((tr as any).fromId) ||
        r.itemIds.includes((tr as any).toId),
      );
      if (rowForTr) {
        this.renderTransitionZone(ctx, x, rowForTr.top, TRANSITION_W, rowForTr.height);
      }
    }
  }

  private renderTransitionZone(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    ctx.save();
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, "rgba(99,102,241,0)");
    grad.addColorStop(0.5, "rgba(99,102,241,0.35)");
    grad.addColorStop(1, "rgba(99,102,241,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Diagonal lines
    ctx.strokeStyle = "rgba(99,102,241,0.5)";
    ctx.lineWidth = 1;
    const step = 6;
    ctx.beginPath();
    for (let lx = x; lx <= x + w + h; lx += step) {
      ctx.moveTo(lx, y);
      ctx.lineTo(lx - h, y + h);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── Playhead ──────────────────────────────────────────────────────────────────

  private renderPlayhead(ctx: CanvasRenderingContext2D) {
    const zoom = this.lastScale?.zoom ?? 1;
    const x = timeMsToUnits(this.playheadMs, zoom) + this.spacing.left;

    ctx.save();
    // Line
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, this.height - this.translateY);
    ctx.stroke();

    // Triangle head (at ruler height)
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(x, RULER_H);
    ctx.lineTo(x - 6, RULER_H - 10);
    ctx.lineTo(x + 6, RULER_H - 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Markers ───────────────────────────────────────────────────────────────────

  private renderMarkers(ctx: CanvasRenderingContext2D) {
    for (const marker of this.markers) {
      const x = timeMsToUnits(marker.timeMs, this.lastScale?.zoom ?? 1) + this.spacing.left;
      ctx.save();
      ctx.strokeStyle = marker.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, RULER_H);
      ctx.lineTo(x, this.height - this.translateY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Diamond cap
      ctx.fillStyle = marker.color;
      ctx.beginPath();
      ctx.moveTo(x, RULER_H + 2);
      ctx.lineTo(x + 6, RULER_H + 9);
      ctx.lineTo(x, RULER_H + 16);
      ctx.lineTo(x - 6, RULER_H + 9);
      ctx.closePath();
      ctx.fill();

      // Label
      if (marker.label) {
        ctx.font = `10px ${SECONDARY_FONT}`;
        ctx.fillStyle = marker.color;
        ctx.fillText(marker.label, x + 8, RULER_H + 10);
      }
      ctx.restore();
    }
  }

  // ── Guide line ────────────────────────────────────────────────────────────────

  private renderGuideLine(ctx: CanvasRenderingContext2D, canvasX: number) {
    ctx.save();
    ctx.strokeStyle = this.opts.guideLineColor ?? "#00d8d6";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(canvasX, 0);
    ctx.lineTo(canvasX, this.height - this.translateY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ── Razor preview ─────────────────────────────────────────────────────────────

  private renderRazorPreview(ctx: CanvasRenderingContext2D, cx: number) {
    ctx.save();

    // Dashed vertical cut line
    ctx.strokeStyle = "#f97316"; // orange
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, RULER_H);
    ctx.lineTo(cx, this.height - this.translateY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Scissors icon — two small triangles suggesting a cut
    const tipY = RULER_H + 14;
    ctx.fillStyle = "#f97316";
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 1;
    // Top blade
    ctx.beginPath();
    ctx.moveTo(cx, tipY);
    ctx.lineTo(cx - 7, tipY - 8);
    ctx.lineTo(cx - 2, tipY - 8);
    ctx.closePath();
    ctx.fill();
    // Bottom blade
    ctx.beginPath();
    ctx.moveTo(cx, tipY);
    ctx.lineTo(cx - 7, tipY + 8);
    ctx.lineTo(cx - 2, tipY + 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // ── Selection rect ────────────────────────────────────────────────────────────

  private renderSelectionRect(ctx: CanvasRenderingContext2D) {
    const { selX = 0, selY = 0, selW = 0, selH = 0 } = this.drag!;
    ctx.save();
    ctx.fillStyle = this.opts.selectionColor ?? "rgba(0,216,214,0.1)";
    ctx.strokeStyle = this.opts.selectionBorderColor ?? "rgba(0,216,214,1)";
    ctx.lineWidth = 1;
    ctx.fillRect(selX, selY, selW, selH);
    ctx.strokeRect(selX, selY, selW, selH);
    ctx.restore();
  }

  // ── Snap ──────────────────────────────────────────────────────────────────────

  private buildSnapPoints() {
    this.snapPoints = [];
    for (const item of this.items) {
      this.snapPoints.push({
        timeMs: unitsToTimeMs(item.left - this.spacing.left, item.tScale),
        source: "item-start",
      });
      this.snapPoints.push({
        timeMs: unitsToTimeMs(item.left + item.width - this.spacing.left, item.tScale),
        source: "item-end",
      });
    }
  }

  private snapX(canvasX: number, _excludeId?: string): number | null {
    for (const sp of this.snapPoints) {
      const zoom = this.lastScale?.zoom ?? 1;
      const sx = timeMsToUnits(sp.timeMs, zoom) + this.spacing.left;
      if (Math.abs(canvasX - sx) < SNAP_THRESHOLD_PX) return sx;
    }
    return null;
  }

  // ── Hit detection ─────────────────────────────────────────────────────────────

  private screenToCanvas(sx: number, sy: number): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    return [sx - rect.left - this.translateX, sy - rect.top - this.translateY];
  }

  private getItemAt(cx: number, cy: number): BaseItem | null {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this.items[i].containsPoint(cx, cy)) return this.items[i];
    }
    return null;
  }

  private getHandleAt(cx: number, cy: number): { item: BaseItem; side: "left" | "right" } | null {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      const side = item.hitHandle(cx, cy);
      if (side) return { item, side };
    }
    return null;
  }

  private getTrackRowAt(cy: number): TrackRow | null {
    return this.trackRows.find((r) => cy >= r.top && cy < r.top + r.height) ?? null;
  }

  // ── Pointer events ────────────────────────────────────────────────────────────

  private onMouseDown = (e: MouseEvent) => {
    const [cx, cy] = this.screenToCanvas(e.clientX, e.clientY);
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Locked track — block interaction on items in it
    const row = this.getTrackRowAt(cy);
    if (row?.locked && this.toolMode !== "hand") return;

    if (this.toolMode === "razor") {
      const item = this.getItemAt(cx, cy);
      if (item) {
        const timeMs = unitsToTimeMs(cx - this.spacing.left, item.tScale);
        this.razorPreviewX = null;
        this.requestRenderAll();
        this.opts.onItemSplit(item.id, timeMs);
      }
      return;
    }

    if (this.toolMode === "marker") {
      const timeMs = unitsToTimeMs(cx - this.spacing.left, this.lastScale?.zoom ?? 1);
      const marker: TimelineMarker = {
        id: `marker-${Date.now()}`,
        timeMs,
        label: "",
        color: "#f59e0b",
      };
      this.addMarker(marker);
      this.opts.onMarkerAdd(marker);
      return;
    }

    if (this.toolMode === "hand") {
      this.drag = {
        kind: "move",
        startCanvasX: cx,
        startCanvasY: cy,
        startScreenX: sx,
        startScreenY: sy,
      };
      this.canvas.style.cursor = "grabbing";
      return;
    }

    // — select mode —
    const handle = this.getHandleAt(cx, cy);
    if (handle && handle.item.isSelected) {
      const kind: DragKind = handle.side === "left" ? "resize-left" : "resize-right";
      this.drag = {
        kind,
        itemId: handle.item.id,
        startCanvasX: cx,
        startCanvasY: cy,
        startScreenX: sx,
        startScreenY: sy,
        originalDisplay: { ...handle.item.display },
        originalTrim: { ...handle.item.trim },
      };
      this.canvas.style.cursor = "ew-resize";
      return;
    }

    const item = this.getItemAt(cx, cy);
    if (item) {
      const multi = e.shiftKey || e.metaKey || e.ctrlKey;
      if (!multi && !item.isSelected) this.setSelection([item.id]);
      else if (multi) this.toggleSelection(item.id);

      this.drag = {
        kind: "move",
        itemId: item.id,
        startCanvasX: cx,
        startCanvasY: cy,
        startScreenX: sx,
        startScreenY: sy,
        originalDisplay: { ...item.display },
        originalTrim: { ...item.trim },
      };
      this.canvas.style.cursor = "grabbing";
      return;
    }

    // Start box selection
    if (!e.shiftKey) this.setSelection([]);
    this.drag = {
      kind: "selection-rect",
      startCanvasX: cx,
      startCanvasY: cy,
      startScreenX: sx,
      startScreenY: sy,
      selX: sx,
      selY: sy,
      selW: 0,
      selH: 0,
    };
  };

  private onMouseMove = (e: MouseEvent) => {
    const [cx, cy] = this.screenToCanvas(e.clientX, e.clientY);
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (!this.drag) {
      // Hover cursor + razor preview
      if (this.toolMode === "razor") {
        const hovered = this.getItemAt(cx, cy);
        if (hovered) {
          // Show cut preview line on this item
          if (this.razorPreviewX !== cx) {
            this.razorPreviewX = cx;
            this.requestRenderAll();
          }
          this.canvas.style.cursor = "crosshair";
        } else {
          if (this.razorPreviewX !== null) {
            this.razorPreviewX = null;
            this.requestRenderAll();
          }
          this.canvas.style.cursor = "crosshair";
        }
        return;
      }

      if (this.razorPreviewX !== null) {
        this.razorPreviewX = null;
        this.requestRenderAll();
      }

      const handle = this.getHandleAt(cx, cy);
      if (handle && handle.item.isSelected) {
        this.canvas.style.cursor = "ew-resize";
      } else if (this.getItemAt(cx, cy)) {
        this.canvas.style.cursor = "grab";
      } else {
        this.canvas.style.cursor =
          this.toolMode === "hand" ? "grab"
          : this.toolMode === "marker" ? "cell"
          : "default";
      }
      return;
    }

    const dx = cx - this.drag.startCanvasX;

    if (this.drag.kind === "selection-rect") {
      this.drag.selX = Math.min(sx, this.drag.startScreenX);
      this.drag.selY = Math.min(sy, this.drag.startScreenY);
      this.drag.selW = Math.abs(sx - this.drag.startScreenX);
      this.drag.selH = Math.abs(sy - this.drag.startScreenY);
      this.updateSelectionRect();
      this.requestRenderAll();
      return;
    }

    // Pan mode (hand tool / middle-button)
    if (this.drag.kind === "move" && !this.drag.itemId) {
      const dsx = sx - this.drag.startScreenX;
      const dsy = sy - this.drag.startScreenY;
      const newScrollLeft = Math.max(0, -this.translateX - dsx);
      const newScrollTop = Math.max(0, -this.translateY - dsy);
      this.translateX = -newScrollLeft;
      this.translateY = -newScrollTop;
      this.drag.startScreenX = sx;
      this.drag.startScreenY = sy;
      this.drag.startCanvasX = cx;
      this.drag.startCanvasY = cy;
      this.onScrollItems();
      this.opts.onScroll({ scrollLeft: newScrollLeft, scrollTop: newScrollTop });
      this.requestRenderAll();
      return;
    }

    if (this.drag.kind === "move" && this.drag.itemId) {
      const item = this.items.find((i) => i.id === this.drag!.itemId);
      if (!item || !this.drag.originalDisplay) return;
      const zoom = item.tScale;
      const deltaMs = unitsToTimeMs(dx, zoom);
      const dur = this.drag.originalDisplay.to - this.drag.originalDisplay.from;
      let newFrom = Math.max(0, this.drag.originalDisplay.from + deltaMs);

      // Ripple: Alt key = ripple edit — shift all items on the same track
      if (e.altKey) {
        const row = this.trackRows.find((r) => r.itemIds.includes(item.id));
        if (row) {
          const originalFrom = this.drag.originalDisplay.from;
          const delta = newFrom - originalFrom;
          // Move all items after the dragged one
          for (const id of row.itemIds) {
            if (id === item.id) continue;
            const sibling = this.items.find((it) => it.id === id);
            if (sibling && sibling.display.from >= originalFrom) {
              sibling.display = {
                from: Math.max(0, sibling.display.from + delta),
                to: Math.max(0, sibling.display.to + delta),
              };
              sibling.recalcLayout();
            }
          }
        }
      }

      const snapResult = this.snapX(
        timeMsToUnits(newFrom, zoom) + this.spacing.left,
        item.id,
      );
      if (snapResult !== null) {
        const snappedFrom = unitsToTimeMs(snapResult - this.spacing.left, zoom);
        item.display = { from: snappedFrom, to: snappedFrom + dur };
        this.guideLine = snapResult;
      } else {
        item.display = { from: newFrom, to: newFrom + dur };
        this.guideLine = null;
      }

      item.recalcLayout();
      this.requestRenderAll();
      return;
    }

    if (
      (this.drag.kind === "resize-left" || this.drag.kind === "resize-right") &&
      this.drag.itemId
    ) {
      const item = this.items.find((i) => i.id === this.drag!.itemId);
      if (!item || !this.drag.originalDisplay || !this.drag.originalTrim) return;
      const zoom = item.tScale;
      const deltaMs = unitsToTimeMs(dx, zoom);

      if (this.drag.kind === "resize-left") {
        const newFrom = Math.max(0, this.drag.originalDisplay.from + deltaMs);
        const newTrimFrom = Math.max(
          0,
          this.drag.originalTrim.from + deltaMs / (item.playbackRate || 1),
        );
        item.display = { ...item.display, from: newFrom };
        item.trim = { ...item.trim, from: newTrimFrom };
      } else {
        const minDur = 100;
        const newTo = Math.max(
          this.drag.originalDisplay.from + minDur,
          this.drag.originalDisplay.to + deltaMs,
        );
        const newTrimTo = Math.max(
          this.drag.originalTrim.from + minDur / (item.playbackRate || 1),
          this.drag.originalTrim.to + deltaMs / (item.playbackRate || 1),
        );
        item.display = { ...item.display, to: newTo };
        item.trim = { ...item.trim, to: newTrimTo };
      }

      item.recalcLayout();
      this.requestRenderAll();
    }
  };

  private onMouseUp = (_e: MouseEvent) => {
    if (!this.drag) return;
    const { kind } = this.drag;

    if (kind === "move" && this.drag.itemId) {
      const item = this.items.find((i) => i.id === this.drag!.itemId);
      if (item && this.drag.originalDisplay) {
        const moved =
          item.display.from !== this.drag.originalDisplay.from ||
          item.display.to !== this.drag.originalDisplay.to;
        if (moved) this.opts.onItemMove(item.id, { ...item.display });
      }
    }

    if ((kind === "resize-left" || kind === "resize-right") && this.drag.itemId) {
      const item = this.items.find((i) => i.id === this.drag!.itemId);
      if (item) this.opts.onItemResize(item.id, { ...item.display }, { ...item.trim });
    }

    this.guideLine = null;
    this.drag = null;
    this.canvas.style.cursor = "default";
    this.requestRenderAll();
  };

  private onMouseLeave = (e: MouseEvent) => {
    // Clear razor preview
    if (this.razorPreviewX !== null) {
      this.razorPreviewX = null;
      this.requestRenderAll();
    }
    // Don't cancel drag on leave — user may drag back in
    if (this.drag?.kind !== "selection-rect") return;
    // For selection rect, commit it
    this.onMouseUp(e);
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const newScrollLeft = Math.max(0, -this.translateX + e.deltaX);
    const newScrollTop = Math.max(0, -this.translateY + e.deltaY);
    this.translateX = -newScrollLeft;
    this.translateY = -newScrollTop;
    this.onScrollItems();
    this.opts.onScroll({ scrollLeft: newScrollLeft, scrollTop: newScrollTop });
    this.requestRenderAll();
  };

  private onDblClick = (e: MouseEvent) => {
    const [cx] = this.screenToCanvas(e.clientX, e.clientY);
    const timeMs = unitsToTimeMs(cx - this.spacing.left, this.lastScale?.zoom ?? 1);
    this.opts.onMarkerSeek(timeMs);
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    // Only add marker via right-click when in marker mode
    if (this.toolMode !== "marker") return;
    const [cx] = this.screenToCanvas(e.clientX, e.clientY);
    const timeMs = unitsToTimeMs(cx - this.spacing.left, this.lastScale?.zoom ?? 1);
    const marker: TimelineMarker = {
      id: `marker-${Date.now()}`,
      timeMs,
      label: "",
      color: "#f59e0b",
    };
    this.addMarker(marker);
    this.opts.onMarkerAdd(marker);
  };

  // ── Selection ─────────────────────────────────────────────────────────────────

  private setSelection(ids: string[]) {
    this.selectedIds = new Set(ids);
    for (const item of this.items) item.isSelected = this.selectedIds.has(item.id);
    this.opts.onSelectionChange([...this.selectedIds]);
    this.requestRenderAll();
  }

  private toggleSelection(id: string) {
    this.selectedIds.has(id) ? this.selectedIds.delete(id) : this.selectedIds.add(id);
    for (const item of this.items) item.isSelected = this.selectedIds.has(item.id);
    this.opts.onSelectionChange([...this.selectedIds]);
    this.requestRenderAll();
  }

  private updateSelectionRect() {
    if (!this.drag || this.drag.kind !== "selection-rect") return;
    const { selX = 0, selY = 0, selW = 0, selH = 0 } = this.drag;
    const cx1 = selX - this.translateX;
    const cy1 = selY - this.translateY;
    const cx2 = cx1 + selW;
    const cy2 = cy1 + selH;
    const selected: string[] = [];
    for (const item of this.items) {
      const inX = item.left < cx2 && item.left + item.width > cx1;
      const inY = item.top < cy2 && item.top + item.height > cy1;
      if (inX && inY) selected.push(item.id);
    }
    this.selectedIds = new Set(selected);
    for (const item of this.items) item.isSelected = this.selectedIds.has(item.id);
    this.opts.onSelectionChange([...this.selectedIds]);
  }

  // ── Scroll notification ───────────────────────────────────────────────────────

  private onScrollItems() {
    const scrollLeft = -this.translateX;
    for (const item of this.items) {
      (item as any).onScrollChange?.(scrollLeft);
    }
  }

  // ── Item factory ──────────────────────────────────────────────────────────────

  private createItem(type: string, baseOpts: any, trackItem: ITrackItem): BaseItem {
    const details = (trackItem as any).details ?? {};
    const src: string = details.src ?? "";
    const metadata = details.metadata ?? { previewUrl: details.previewUrl ?? "" };

    switch (type) {
      case "video":
        return new VideoItem({
          ...baseOpts,
          src,
          aspectRatio:
            details.width && details.height ? details.width / details.height : 16 / 9,
          metadata,
        });
      case "audio":
        return new AudioItem({ ...baseOpts, src });
      case "text":
        return new TextItem({ ...baseOpts, text: details.text ?? trackItem.name ?? "Text" });
      case "caption":
        return new CaptionItem({ ...baseOpts, text: details.text ?? trackItem.name ?? "Caption" });
      case "image":
        return new ImageItem({ ...baseOpts, src, previewUrl: metadata.previewUrl ?? src });
      default:
        return new HelperItem(baseOpts);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private getDominantType(itemIds: string[], map: Record<string, ITrackItem>): string {
    const counts: Record<string, number> = {};
    for (const id of itemIds) {
      const t = map[id]?.type ?? "default";
      counts[t] = (counts[t] ?? 0) + 1;
    }
    let max = 0;
    let dominant = "default";
    for (const [t, c] of Object.entries(counts)) {
      if (c > max) { max = c; dominant = t; }
    }
    return dominant;
  }
}
