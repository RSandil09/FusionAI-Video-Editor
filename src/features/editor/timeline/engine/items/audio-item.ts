import { BaseItem, BaseItemOptions } from "./base-item";
import { timeMsToUnits } from "../types";
import { getAudioData, getWaveformPortion, AudioData } from "@remotion/media-utils";
import { SECONDARY_FONT } from "../../../constants/constants";

const MAX_CANVAS_WIDTH = 12000;
const CANVAS_SAFE = 2000;

export interface AudioItemOptions extends BaseItemOptions {
  src: string;
}

export class AudioItem extends BaseItem {
  private src: string;
  private barData?: AudioData;
  private bars: any[] = [];
  private offscreen: OffscreenCanvas | null = null;
  private offCtx: OffscreenCanvasRenderingContext2D | null = null;
  private isDirty = true;
  private scrollLeft = 0;

  constructor(opts: AudioItemOptions) {
    super(opts);
    this.src = opts.src;
    this.initOffscreen();
    this.initialize();
  }

  private initOffscreen() {
    if (!this.offscreen) {
      this.offscreen = new OffscreenCanvas(MAX_CANVAS_WIDTH, this.height);
      this.offCtx = this.offscreen.getContext("2d");
    } else {
      this.offscreen.height = this.height;
    }
  }

  private async initialize() {
    try {
      this.barData = await getAudioData(this.src);
      this.bars = this.computeBars();
      this.isDirty = true;
      this.engineRef.requestRenderAll();
    } catch {
      // no audio data
    }
  }

  private computeBars(): any[] {
    if (!this.barData) return [];
    const durationInUnits = timeMsToUnits(this.duration, this.tScale);
    return (
      getWaveformPortion({
        audioData: this.barData,
        startTimeInSeconds: 0,
        durationInSeconds: this.barData.durationInSeconds,
        numberOfSamples: Math.max(1, Math.round(durationInUnits / 4)),
      }) ?? []
    );
  }

  onScrollChange(scrollLeft: number) {
    this.scrollLeft = scrollLeft;
    this.isDirty = true;
  }

  onScale() {
    this.bars = this.computeBars();
    this.isDirty = true;
  }

  private renderToOffscreen() {
    if (!this.offCtx || !this.offscreen) return;
    if (!this.isDirty) return;
    this.offscreen.height = this.height;
    const ctx = this.offCtx;
    const displayFromInUnits = timeMsToUnits(this.display.from, this.tScale);
    const sl = this.scrollLeft + displayFromInUnits;
    const trimFromSize = timeMsToUnits(this.trim.from, this.tScale);
    const visibleStart = Math.max(0, -sl) - CANVAS_SAFE + trimFromSize;

    ctx.clearRect(0, 0, MAX_CANVAS_WIDTH, this.height);
    ctx.beginPath();
    ctx.roundRect(0, 0, MAX_CANVAS_WIDTH, this.height, 4);
    ctx.clip();

    if (!this.bars.length) {
      this.isDirty = false;
      return;
    }

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    const barW = 4;
    const startI = Math.max(0, Math.floor(visibleStart / barW));
    const endI = Math.ceil((visibleStart + MAX_CANVAS_WIDTH) / barW);
    ctx.beginPath();
    for (let i = startI; i < endI && i < this.bars.length; i++) {
      const bar = this.bars[i];
      if (!bar) continue;
      const x = Math.round(i * barW - visibleStart);
      if (x < 0 || x >= MAX_CANVAS_WIDTH) continue;
      const amp = bar.amplitude ?? 0;
      const h = Math.round(amp * 15);
      const y = Math.round((20 - h) / 2 + 8);
      ctx.rect(x, y, 1, h);
    }
    ctx.fill();
    this.isDirty = false;
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderBackground(ctx, "#2D1625");

    this.renderToOffscreen();

    if (this.offscreen) {
      const displayFromInUnits = timeMsToUnits(this.display.from, this.tScale);
      const sl = this.scrollLeft + displayFromInUnits;
      const visibleStart = Math.max(0, -sl) - CANVAS_SAFE;

      ctx.save();
      this.clipToItemRounded(ctx);
      ctx.drawImage(
        this.offscreen,
        0, 0, this.offscreen.width, this.height,
        this.left + visibleStart, this.top, this.offscreen.width, this.height,
      );
      ctx.restore();
    }

    // Label
    ctx.save();
    ctx.font = `400 11px ${SECONDARY_FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textBaseline = "middle";
    ctx.fillText("Audio", this.left + 28, this.top + this.height / 2);
    ctx.restore();

    this.renderSelectionBorder(ctx);
    this.renderControls(ctx);
  }
}
