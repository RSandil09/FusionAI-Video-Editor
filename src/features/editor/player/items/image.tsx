import { IImage } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { BoxAnim, ContentAnim, MaskAnim } from "@designcombo/animations";
import { calculateContainerStyles, calculateMediaStyles } from "../styles";
import { getAnimations } from "../../utils/get-animations";
import { calculateFrames } from "../../utils/frames";
import { Img } from "remotion";

// Ensure image URL is proxied for CORS support (browser only).
// During Remotion Lambda render the proxy is unreachable, so direct URLs are
// used as-is — VideoComposition.resolveTrackItemSrcs strips proxy wrappers
// before passing URLs to the render pipeline.
function ensureProxiedUrl(src: string): string {
	if (!src) return src;

	// Already going through a proxy route — leave as-is.
	if (src.includes("/api/image-proxy") || src.includes("/api/video-proxy")) {
		return src;
	}

	// R2 check BEFORE the generic https:// guard.
	// Bug that was here: absolute R2 URLs (https://pub-xxx.r2.dev/...) were
	// caught by the startsWith("https://") early-return and served without the
	// proxy, causing CORS failures for crossOrigin="anonymous" image requests.
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

	const children = (
		<BoxAnim
			style={calculateContainerStyles(details, crop, {
				transform: "scale(1)",
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
						<Img data-id={item.id} src={imageSrc} />
					</div>
				</MaskAnim>
			</ContentAnim>
		</BoxAnim>
	);

	return BaseSequence({ item, options, children });
}
