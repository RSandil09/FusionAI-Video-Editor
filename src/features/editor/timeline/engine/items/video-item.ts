import type { IDisplay, IMetadata, ITrim } from "@designcombo/types";
import { BaseItem, BaseItemOptions } from "./base-item";
import ThumbnailCache from "../../../utils/thumbnail-cache";
import { timeMsToUnits, unitsToTimeMs } from "../types";
import {
	calculateOffscreenSegments,
	calculateThumbnailSegmentLayout,
} from "../../../utils/filmstrip";
import { getFileFromUrl } from "../../../utils/file";
import { SECONDARY_FONT } from "../../../constants/constants";

const EMPTY_FILMSTRIP = {
	offset: 0,
	startTime: 0,
	thumbnailsCount: 0,
	widthOnScreen: 0,
	segmentIndex: -1,
};

export interface VideoItemOptions extends BaseItemOptions {
	src: string;
	aspectRatio: number;
	metadata: Partial<IMetadata> & { previewUrl: string };
}

export class VideoItem extends BaseItem {
	private src: string;
	private previewUrl: string;
	private clip: any = null;

	private aspectRatio: number;
	private thumbnailWidth = 0;
	private thumbnailHeight: number;
	private thumbnailsPerSegment = 0;
	private segmentSize = 0;

	private thumbnailCache = new ThumbnailCache();
	private isFetchingThumbnails = false;
	private scrollLeft = 0;

	private currentFilmstrip = { ...EMPTY_FILMSTRIP };
	private nextFilmstrip = { ...EMPTY_FILMSTRIP };
	private loadingFilmstrip = { ...EMPTY_FILMSTRIP };

	private fallbackSegmentIndex = 0;
	private fallbackSegmentsCount = 0;
	private fallbackOffscreen: OffscreenCanvas | null = null;
	private fallbackCtx: OffscreenCanvasRenderingContext2D | null = null;

	constructor(opts: VideoItemOptions) {
		super(opts);
		this.src = opts.src;
		this.aspectRatio = opts.aspectRatio || 16 / 9;
		this.previewUrl = opts.metadata?.previewUrl ?? "";
		this.thumbnailHeight = this.height;
		this.initDimensions();
		this.initialize();
	}

	private initDimensions() {
		this.thumbnailHeight = this.height;
		this.thumbnailWidth = Math.max(1, this.thumbnailHeight * this.aspectRatio);
		const seg = calculateThumbnailSegmentLayout(this.thumbnailWidth);
		this.thumbnailsPerSegment = seg.thumbnailsPerSegment;
		this.segmentSize = seg.segmentSize;
	}

	private async initialize() {
		await this.loadFallbackThumbnail();
		this.buildFallbackOffscreen();
		this.onScrollChange(this.scrollLeft);
		this.engineRef.requestRenderAll();
		await this.prepareAssets();
		this.onScrollChange(this.scrollLeft, true);
	}

	private async prepareAssets() {
		if (typeof window === "undefined") return;
		try {
			// Use /api/video-stream (streaming proxy) â€” NOT /api/video-proxy (redirect).
			// getFileFromUrl() needs to read the full response body, which requires a
			// same-origin response. The redirect proxy sends the browser cross-origin
			// to R2, where CORS headers on the bucket are required. The streaming proxy
			// returns the bytes directly as a same-origin response, avoiding that.
			let videoUrl = this.src;
			if (videoUrl.includes("/api/image-proxy")) {
				videoUrl = videoUrl.replace("/api/image-proxy", "/api/video-stream");
			} else if (
				videoUrl.includes(".r2.dev") &&
				!videoUrl.includes("/api/video-stream")
			) {
				videoUrl = `/api/video-stream?url=${encodeURIComponent(videoUrl)}`;
			}
			const file = await getFileFromUrl(videoUrl);
			if (!file || file.size === 0) return;
			const { MP4Clip } = await import("@designcombo/frames");
			this.clip = new MP4Clip(file.stream());
		} catch {
			this.clip = null;
		}
	}

	private async loadFallbackThumbnail() {
		const src = this.previewUrl || this.src;
		if (!src) return;
		const isVideo =
			!this.previewUrl ||
			src.includes(".mp4") ||
			src.includes(".webm") ||
			src.includes(".mov");
		if (isVideo && !this.previewUrl) {
			return this.extractVideoThumbnail();
		}
		await new Promise<void>((resolve) => {
			const img = new Image();
			img.crossOrigin = "anonymous";
			img.src = src;
			img.onload = () => {
				const ar = img.width / img.height || this.aspectRatio;
				const th = this.thumbnailHeight;
				const tw = Math.round(th * ar);
				const c = document.createElement("canvas");
				c.width = tw;
				c.height = th;
				c.getContext("2d")?.drawImage(img, 0, 0, tw, th);
				const resized = new Image();
				resized.src = c.toDataURL();
				resized.onload = () => {
					this.aspectRatio = ar;
					this.thumbnailWidth = Math.max(1, tw);
					this.thumbnailCache.setThumbnail("fallback", resized);
					resolve();
				};
				resized.onerror = () => resolve();
			};
			img.onerror = () => this.extractVideoThumbnail().then(resolve);
		});
	}

	private async extractVideoThumbnail() {
		if (!this.src) return;
		// Use /api/video-stream (streaming proxy) so the <video> element makes a
		// same-origin request. crossOrigin="anonymous" on a cross-origin URL (R2)
		// requires CORS headers from the bucket; the streaming proxy avoids that.
		let videoUrl = this.src;
		if (videoUrl.includes("/api/image-proxy")) {
			videoUrl = videoUrl.replace("/api/image-proxy", "/api/video-stream");
		} else if (
			videoUrl.includes(".r2.dev") &&
			!videoUrl.includes("/api/video-stream")
		) {
			videoUrl = `/api/video-stream?url=${encodeURIComponent(videoUrl)}`;
		}
		await new Promise<void>((resolve) => {
			const v = document.createElement("video");
			v.crossOrigin = "anonymous";
			v.muted = true;
			v.preload = "metadata";
			v.onloadeddata = () => {
				v.currentTime = Math.min(1, v.duration * 0.1);
			};
			v.onseeked = () => {
				const ar = v.videoWidth / v.videoHeight || 16 / 9;
				const th = this.thumbnailHeight;
				const tw = Math.round(th * ar);
				const c = document.createElement("canvas");
				c.width = tw;
				c.height = th;
				c.getContext("2d")?.drawImage(v, 0, 0, tw, th);
				const img = new Image();
				img.src = c.toDataURL();
				img.onload = () => {
					this.aspectRatio = ar;
					this.thumbnailWidth = Math.max(1, tw);
					this.thumbnailCache.setThumbnail("fallback", img);
					this.engineRef.requestRenderAll();
					resolve();
				};
				img.onerror = () => resolve();
				v.src = "";
				v.load();
			};
			v.onerror = () => resolve();
			v.src = videoUrl;
			v.load();
		});
	}

	private buildFallbackOffscreen() {
		const fallback = this.thumbnailCache.getThumbnail("fallback");
		if (!fallback) return;
		const maxW = 12000;
		const totalW = Math.min(
			maxW,
			this.thumbnailsPerSegment * this.thumbnailWidth * 10,
		);
		const segs = Math.ceil(totalW / this.segmentSize);
		this.fallbackSegmentsCount = segs;
		const patternW = segs * this.segmentSize;
		const c = new OffscreenCanvas(Math.max(1, patternW), this.thumbnailHeight);
		const ctx = c.getContext("2d");
		if (!ctx) return;
		const total = segs * this.thumbnailsPerSegment;
		for (let i = 0; i < total; i++) {
			ctx.drawImage(
				fallback,
				i * this.thumbnailWidth,
				0,
				this.thumbnailWidth,
				this.thumbnailHeight,
			);
		}
		this.fallbackOffscreen = c;
		this.fallbackCtx = ctx;
	}

	private calculateFilmstripDimensions(
		segmentIndex: number,
		widthOnScreen: number,
	) {
		const filmstripOffset = segmentIndex * this.segmentSize;
		const leftBacklog = segmentIndex > 0 ? this.segmentSize : 0;
		const totalW = timeMsToUnits(this.duration, this.tScale);
		const rightRemaining =
			totalW - widthOnScreen - leftBacklog - filmstripOffset;
		const rightBacklog = Math.min(this.segmentSize, rightRemaining);
		const startTime = unitsToTimeMs(filmstripOffset, this.tScale);
		const count =
			1 +
			Math.round(
				(widthOnScreen + leftBacklog + Math.max(0, rightBacklog)) /
					Math.max(1, this.thumbnailWidth),
			);
		return { filmstripOffset, startTime, thumbnailsCount: Math.max(0, count) };
	}

	private calcVisibleWidth() {
		const canvasEl = document.getElementById("fusion-timeline-canvas");
		const cw = canvasEl?.clientWidth ?? 0;
		const visible = Math.min(cw - this.left - this.scrollLeft, cw);
		const cutRight = Math.max(
			cw - (this.width + this.left + this.scrollLeft),
			0,
		);
		return Math.max(visible - cutRight, 0);
	}

	private calcOffscreenWidth() {
		return Math.abs(Math.min(this.left + this.scrollLeft, 0));
	}

	onScrollChange(scrollLeft: number, force = false) {
		this.scrollLeft = scrollLeft;
		const offW = this.calcOffscreenWidth();
		const trimFromSize = timeMsToUnits(this.trim.from, this.tScale);
		const seg = calculateOffscreenSegments(
			offW,
			trimFromSize,
			this.segmentSize,
		);

		if (this.currentFilmstrip.segmentIndex === seg && !force) return;

		if (this.isFetchingThumbnails && !force) return;

		const visibleW = this.calcVisibleWidth();
		const { filmstripOffset, startTime, thumbnailsCount } =
			this.calculateFilmstripDimensions(seg, visibleW);

		this.nextFilmstrip = {
			segmentIndex: seg,
			offset: filmstripOffset,
			startTime,
			thumbnailsCount,
			widthOnScreen: visibleW,
		};

		this.loadAndRenderThumbnails();
	}

	onScale() {
		this.initDimensions();
		this.currentFilmstrip = { ...EMPTY_FILMSTRIP };
		this.nextFilmstrip = { ...EMPTY_FILMSTRIP };
		this.loadingFilmstrip = { ...EMPTY_FILMSTRIP };
		this.buildFallbackOffscreen();
		this.onScrollChange(this.scrollLeft, true);
	}

	private async loadAndRenderThumbnails() {
		if (this.isFetchingThumbnails || !this.clip) return;
		this.loadingFilmstrip = { ...this.nextFilmstrip };
		this.isFetchingThumbnails = true;

		const { startTime, thumbnailsCount } = this.loadingFilmstrip;
		const timePerThumb = unitsToTimeMs(this.thumbnailWidth, this.tScale);
		const timestamps = Array.from({ length: thumbnailsCount }, (_, i) =>
			Math.ceil((startTime + i * timePerThumb) / 1000),
		);

		try {
			const thumbs = await this.clip.thumbnailsList(this.thumbnailWidth, {
				timestamps: timestamps.map((t) => t * 1e6),
			});
			const batch = thumbs.map((t: { ts: number; img: Blob }) => ({
				ts: Math.round(t.ts / 1e6),
				img: t.img,
			}));
			await Promise.all(
				batch.map(async (t: { ts: number; img: Blob }) => {
					if (this.thumbnailCache.getThumbnail(t.ts)) return;
					await new Promise<void>((resolve) => {
						const img = new Image();
						const url = URL.createObjectURL(t.img);
						img.src = url;
						img.onload = () => {
							URL.revokeObjectURL(url);
							this.thumbnailCache.setThumbnail(t.ts, img);
							resolve();
						};
						img.onerror = () => resolve();
					});
				}),
			);
		} catch {
			// ignore
		}

		this.currentFilmstrip = { ...this.loadingFilmstrip };
		this.isFetchingThumbnails = false;
		requestAnimationFrame(() => this.engineRef.requestRenderAll());
	}

	render(ctx: CanvasRenderingContext2D): void {
		this.renderBackground(ctx, "#27272a");

		ctx.save();
		this.clipToItemRounded(ctx);

		const { offset, startTime, thumbnailsCount } = this.currentFilmstrip;
		const tw = Math.max(1, this.thumbnailWidth);
		const th = this.thumbnailHeight;
		const trimFromSize = timeMsToUnits(this.trim.from, this.tScale);
		const timePerThumb = unitsToTimeMs(tw, this.tScale);

		// Try real thumbnails first, fall back to fallback pattern
		let drewAny = false;
		for (let i = 0; i < thumbnailsCount; i++) {
			const ts = Math.ceil((startTime + i * timePerThumb) / 1000);
			const img =
				this.thumbnailCache.getThumbnail(ts) ??
				this.thumbnailCache.getThumbnail("fallback");
			if (img?.complete) {
				const x = this.left + i * tw + offset - trimFromSize;
				ctx.drawImage(img, x, this.top, tw, th);
				drewAny = true;
			}
		}

		// If no real thumbnails available and we have a fallback offscreen, tile it
		if (!drewAny && this.fallbackOffscreen) {
			const fW = this.fallbackOffscreen.width;
			if (fW > 0) {
				const segOff =
					this.fallbackSegmentIndex *
					(this.fallbackSegmentsCount > 0
						? this.fallbackOffscreen.width / this.fallbackSegmentsCount
						: 0);
				ctx.drawImage(
					this.fallbackOffscreen,
					segOff,
					0,
					fW,
					th,
					this.left,
					this.top,
					this.width,
					th,
				);
			}
		}

		ctx.restore();

		// Label
		ctx.save();
		ctx.translate(this.left, this.top);
		ctx.font = `400 11px ${SECONDARY_FONT}`;
		ctx.fillStyle = "rgba(255,255,255,0.85)";
		ctx.textBaseline = "middle";
		ctx.fillText("Video", 28, this.height / 2);
		ctx.restore();

		this.renderSelectionBorder(ctx);
		this.renderControls(ctx);
	}
}
