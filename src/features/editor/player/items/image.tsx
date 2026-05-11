import { IImage } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { BoxAnim, ContentAnim, MaskAnim } from "@designcombo/animations";
import { buildFilter, calculateContainerStyles, calculateMediaStyles } from "../styles";
import { getAnimations } from "../../utils/get-animations";
import { calculateFrames } from "../../utils/frames";
import { Img, getRemotionEnvironment } from "remotion";

// Ensure image URL is proxied for CORS support (browser only).
// During Remotion Lambda render, VideoComposition.resolveTrackItemSrcs() has
// already resolved any proxy URL back to the direct R2 URL — return it as-is.
// Without this guard, the direct R2 URL gets re-wrapped in a relative proxy
// path that Lambda resolves against its S3 host, causing export failures.
function ensureProxiedUrl(src: string): string {
	if (!src) return src;

	// Skip proxy logic entirely during Lambda / CLI rendering.
	if (getRemotionEnvironment().isRendering) return src;

	// Already going through a proxy route — leave as-is.
	if (src.includes("/api/image-proxy") || src.includes("/api/video-proxy")) {
		return src;
	}

	// Wrap R2 URLs in proxy for browser CORS support.
	if (src.includes(".r2.dev")) {
		return `/api/image-proxy?url=${encodeURIComponent(src)}`;
	}

	// External CDN or other absolute URL — serve directly.
	if (src.startsWith("http://") || src.startsWith("https://")) {
		return src;
	}

	return src;
}

export default function Image({
	item,
	options,
}: {
	item: IImage;
	options: SequenceItemOptions;
}) {
	const { fps, frame } = options;
	const { details, animations } = item;
	const { animationIn, animationOut, animationTimed } = getAnimations(
		animations!,
		item,
		frame,
		fps,
	);
	const crop = details?.crop || {
		x: 0,
		y: 0,
		width: details.width,
		height: details.height,
	};
	const { durationInFrames } = calculateFrames(item.display, fps);
	const currentFrame = (frame || 0) - (item.display.from * fps) / 1000;

	// Ensure image URL is proxied for CORS
	const imageSrc = ensureProxiedUrl(details.src);

	const filterCss = buildFilter(details);

	const children = (
		<BoxAnim
			style={calculateContainerStyles(details, crop, {
				transform: "scale(1)",
				filter: "none",
			})}
			animationIn={animationIn!}
			animationOut={animationOut!}
			frame={currentFrame}
			durationInFrames={durationInFrames}
		>
			<ContentAnim
				animationTimed={animationTimed!}
				durationInFrames={durationInFrames}
				frame={currentFrame}
			>
				<MaskAnim
					item={item}
					keyframeAnimations={animationTimed!}
					frame={frame || 0}
				>
					<div
						id={`${item.id}-reveal-mask`}
						style={calculateMediaStyles(details, crop)}
					>
						<Img data-id={item.id} src={imageSrc} style={{ filter: filterCss }} />
					</div>
				</MaskAnim>
			</ContentAnim>
		</BoxAnim>
	);

	return BaseSequence({ item, options, children });
}
