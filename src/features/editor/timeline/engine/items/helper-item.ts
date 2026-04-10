import { BaseItem, BaseItemOptions } from "./base-item";

export class HelperItem extends BaseItem {
	render(ctx: CanvasRenderingContext2D): void {
		// Helper items are invisible — used as placeholders
		ctx.save();
		ctx.globalAlpha = 0.15;
		ctx.fillStyle = "#52525b";
		ctx.beginPath();
		ctx.roundRect(this.left, this.top, this.width, this.height, 4);
		ctx.fill();
		ctx.globalAlpha = 1;
		ctx.restore();
	}
}
