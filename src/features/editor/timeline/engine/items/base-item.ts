import type { IDisplay, ITrim } from "@designcombo/types";
import type { ItemType, Rect } from "../types";
import { timeMsToUnits, unitsToTimeMs } from "../types";

export interface BaseItemOptions {
  id: string;
  type: ItemType;
  display: IDisplay;
  trim: ITrim;
  duration: number;
  playbackRate: number;
  tScale: number; // zoom value
  top: number;
  height: number;
  spacing: { left: number; right: number };
  engineRef: { requestRenderAll: () => void };
}

export abstract class BaseItem {
  id: string;
  type: ItemType;
  display: IDisplay;
  trim: ITrim;
  duration: number;
  playbackRate: number;
  tScale: number;
  top: number;
  height: number;
  spacing: { left: number; right: number };
  isSelected = false;
  protected engineRef: { requestRenderAll: () => void };

  // Derived from display + tScale — recalculated on every syncFromState
  left = 0;
  width = 0;

  constructor(opts: BaseItemOptions) {
    this.id = opts.id;
    this.type = opts.type;
    this.display = opts.display;
    this.trim = opts.trim;
    this.duration = opts.duration;
    this.playbackRate = opts.playbackRate;
    this.tScale = opts.tScale;
    this.top = opts.top;
    this.height = opts.height;
    this.spacing = opts.spacing;
    this.engineRef = opts.engineRef;
    this.recalcLayout();
  }

  recalcLayout(): void {
    this.left =
      timeMsToUnits(this.display.from, this.tScale) + this.spacing.left;
    this.width = timeMsToUnits(
      this.display.to - this.display.from,
      this.tScale,
    );
  }

  getRect(): Rect {
    return { x: this.left, y: this.top, w: this.width, h: this.height };
  }

  containsPoint(cx: number, cy: number): boolean {
    return (
      cx >= this.left &&
      cx <= this.left + this.width &&
      cy >= this.top &&
      cy <= this.top + this.height
    );
  }

  /** Returns "left" | "right" | null depending on which resize handle is hit */
  hitHandle(cx: number, cy: number): "left" | "right" | null {
    const HANDLE_HIT_W = 14;
    const midY = this.top + this.height / 2;
    if (Math.abs(cy - midY) > this.height / 2) return null;
    if (Math.abs(cx - this.left) < HANDLE_HIT_W) return "left";
    if (Math.abs(cx - (this.left + this.width)) < HANDLE_HIT_W) return "right";
    return null;
  }

  abstract render(ctx: CanvasRenderingContext2D): void;

  // ── Shared rendering primitives ─────────────────────────────────────────────

  protected renderBackground(
    ctx: CanvasRenderingContext2D,
    color: string,
  ): void {
    const rx = 4;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(this.left, this.top, this.width, this.height, rx);
    ctx.fill();
    ctx.restore();
  }

  renderSelectionBorder(ctx: CanvasRenderingContext2D): void {
    const borderColor = this.isSelected
      ? "rgba(255,255,255,1)"
      : "rgba(255,255,255,0.05)";
    const bw = 2;
    const rx = 4;
    ctx.save();
    ctx.fillStyle = borderColor;
    ctx.beginPath();
    ctx.rect(this.left, this.top, this.width, this.height);
    ctx.roundRect(
      this.left + bw,
      this.top + bw,
      this.width - bw * 2,
      this.height - bw * 2,
      rx,
    );
    ctx.fill("evenodd");
    ctx.restore();
  }

  renderControls(ctx: CanvasRenderingContext2D): void {
    if (!this.isSelected) return;
    this.drawHandle(ctx, this.left, "left");
    this.drawHandle(ctx, this.left + this.width, "right");
  }

  private drawHandle(
    ctx: CanvasRenderingContext2D,
    x: number,
    side: "left" | "right",
  ): void {
    const w = 10;
    const h = Math.min(this.height, 32);
    const midY = this.top + this.height / 2;
    const rx = 4;
    const ox = side === "left" ? 6 : -6;

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.beginPath();
    if (side === "left") {
      ctx.roundRect(x + ox - w / 2, midY - h / 2, w, h, [rx, 0, 0, rx]);
    } else {
      ctx.roundRect(x + ox - w / 2, midY - h / 2, w, h, [0, rx, rx, 0]);
    }
    ctx.fill();

    // Inner grip line
    ctx.fillStyle = "#333";
    const lw = 2.5;
    const lh = 16;
    ctx.beginPath();
    ctx.roundRect(x + ox - lw / 2, midY - lh / 2, lw, lh, lw / 2);
    ctx.fill();
    ctx.restore();
  }

  /** Clip context to item bounds (call save/restore around this) */
  protected clipToItem(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.rect(this.left, this.top, this.width, this.height);
    ctx.clip();
  }

  /** Clip to item bounds with rounded corners */
  protected clipToItemRounded(
    ctx: CanvasRenderingContext2D,
    rx = 4,
  ): void {
    ctx.beginPath();
    ctx.roundRect(this.left, this.top, this.width, this.height, rx);
    ctx.clip();
  }
}
