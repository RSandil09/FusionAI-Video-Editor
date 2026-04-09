import { BaseItem, BaseItemOptions } from "./base-item";
import { SECONDARY_FONT } from "../../../constants/constants";

export interface CaptionItemOptions extends BaseItemOptions {
  text?: string;
}

export class CaptionItem extends BaseItem {
  private text: string;

  constructor(opts: CaptionItemOptions) {
    super(opts);
    this.text = opts.text ?? "Caption";
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderBackground(ctx, "#1a1a2e");

    ctx.save();
    ctx.font = `400 10px ${SECONDARY_FONT}`;
    ctx.fillStyle = "rgba(255,200,100,0.9)";
    ctx.textBaseline = "middle";
    ctx.beginPath();
    ctx.rect(this.left + 4, this.top, this.width - 8, this.height);
    ctx.clip();
    ctx.fillText(this.text, this.left + 8, this.top + this.height / 2);
    ctx.restore();

    this.renderSelectionBorder(ctx);
    this.renderControls(ctx);
  }
}
