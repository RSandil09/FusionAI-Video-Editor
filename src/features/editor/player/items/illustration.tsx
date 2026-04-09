import { IIllustration } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { BoxAnim, ContentAnim, MaskAnim } from "@designcombo/animations";
import { calculateContainerStyles } from "../styles";
import { getAnimations } from "../../utils/get-animations";
import { calculateFrames } from "../../utils/frames";

/**
 * Strip dangerous elements and attributes from an SVG string to prevent XSS.
 * Removes <script>, event handlers (on*=), and javascript: URLs.
 */
function sanitizeSvg(raw: string): string {
	if (!raw) return "";
	return raw
		// Remove <script>…</script> blocks (case-insensitive, across newlines)
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		// Remove standalone <script … /> tags
		.replace(/<script[^>]*\/>/gi, "")
		// Remove event-handler attributes: on* = "…" or on*='…' or on*=value
		.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
		// Remove javascript: href / xlink:href values
		.replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'href="#"')
		// Remove <iframe>, <object>, <embed>, <base>
		.replace(/<\/?(?:iframe|object|embed|base)[\s\S]*?>/gi, "")
		// Remove ALL xlink:href attributes (used for external resource injection via <image> or <use>)
		.replace(/xlink:href\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
		// Remove href attributes pointing to external URLs or data URIs on <image> and <use>
		.replace(/(<(?:image|use)[^>]*)\shref\s*=\s*(?:"(?:https?:|data:)[^"]*"|'(?:https?:|data:)[^']*')/gi, "$1")
		// Remove <animate> and <animateTransform> — can trigger JS via xlink:href
		.replace(/<animate(?:Transform)?[\s\S]*?\/>/gi, "")
		.replace(/<animate(?:Transform)?[\s\S]*?<\/animate(?:Transform)?>/gi, "")
		// Remove <foreignObject> — can embed arbitrary HTML
		.replace(/<\/?foreignObject[\s\S]*?>/gi, "");
}

export const Illustration = ({
	item,
	options,
}: {
	item: IIllustration;
	options: SequenceItemOptions;
}) => {
	const { fps, frame } = options;
	const { details, animations } = item;
	const { animationIn, animationOut, animationTimed } = getAnimations(
		animations!,
		item,
		frame,
		fps,
	);
	const { durationInFrames } = calculateFrames(item.display, fps);
	const currentFrame = (frame || 0) - (item.display.from * fps) / 1000;
	const children = (
		<BoxAnim
			style={calculateContainerStyles(details)}
			animationIn={animationIn!}
			animationOut={animationOut!}
			frame={currentFrame}
			durationInFrames={durationInFrames}
		>
			<ContentAnim
				animationTimed={animationTimed}
				durationInFrames={durationInFrames}
				frame={currentFrame}
				style={details as unknown as React.CSSProperties}
			>
				<MaskAnim
					item={item}
					keyframeAnimations={animationTimed}
					frame={frame || 0}
				>
					<div dangerouslySetInnerHTML={{ __html: sanitizeSvg(item.details.svgString) }} />
				</MaskAnim>
			</ContentAnim>
		</BoxAnim>
	);
	return BaseSequence({ item, options, children });
};
export default Illustration;
