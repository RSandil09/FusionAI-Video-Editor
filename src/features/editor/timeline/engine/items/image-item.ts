import { BaseItem, BaseItemOptions } from "./base-item";
import ThumbnailCache from "../../../utils/thumbnail-cache";
import { SECONDARY_FONT } from "../../../constants/constants";

export interface ImageItemOptions extends BaseItemOptions {
  src: string;
  previewUrl?: string;
}

export class ImageItem extends BaseItem {
  private src: string;
  private thumbnailCache = new ThumbnailCache();
  private imgLoaded = false;

  constructor(opts: ImageItemOptions) {
    super(opts);
    this.src = opts.previewUrl || opts.src;
    this.loadImage();
  }

  private loadImage() {
    const url = this.src;
    if (!url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      const th = this.height;
      const ar = img.width / img.height || 1;
      const tw = Math.round(th * ar);
      const c = document.createElement("canvas");
      c.width = tw;
      c.height = th;
      c.getContext("2d")?.drawImage(img, 0, 0, tw, th);
      const resized = new Image();
      resized.src = c.toDataURL();
      resized.onload = () => {
        this.thumbnailCache.setThumbnail("thumb", resized);
        this.imgLoaded = true;
        this.engineRef.requestRenderAll();
      };
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderBackground(ctx, "#1a2e1a");

    const img = this.thumbnailCache.getThumbnail("thumb");
    if (img?.complete && this.imgLoaded) {
      ctx.save();
      this.clipToItemRounded(ctx);
      // Tile the image across the item width
      const tw = img.width;
      const th = this.height;
      for (let x = this.left; x < this.left + this.width; x += tw) {
        ctx.drawImage(img, x, this.top, tw, th);
      }
      ctx.restore();
    }

    ctx.save();
    ctx.font = `400 11px ${SECONDARY_FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.textBaseline = "middle";
    ctx.beginPath();
    ctx.rect(this.left + 4, this.top, this.width - 8, this.height);
    ctx.clip();
    ctx.fillText("Image", this.left + 28, this.top + this.height / 2);
    ctx.restore();

    this.renderSelectionBorder(ctx);
    this.renderControls(ctx);
  }
}
