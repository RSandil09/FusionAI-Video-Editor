import { BaseItem, BaseItemOptions } from "./base-item";
import { SECONDARY_FONT } from "../../../constants/constants";

export interface TextItemOptions extends BaseItemOptions {
	text: string;
}

export class TextItem extends BaseItem {
	private text: string;

	constructor(opts: TextItemOptions) {
		super(opts);
		this.text = opts.text ?? "";
	}

	render(ctx: CanvasRenderingContext2D): void {
		this.renderBackground(ctx, "#201630");

		// Text label with icon placeholder
		ctx.save();
		ctx.font = `400 11px ${SECONDARY_FONT}`;
		ctx.fillStyle = "rgba(255,255,255,0.75)";
		ctx.textBaseline = "middle";
		const label = this.text || "Text";
		// Clip to item bounds so text doesn't overflow
		ctx.beginPath();
		ctx.rect(this.left + 4, this.top, this.width - 8, this.height);
		ctx.clip();
		ctx.fillText(label, this.left + 28, this.top + this.height / 2);
		ctx.restore();

		this.renderSelectionBorder(ctx);
		this.renderControls(ctx);
	}
}
