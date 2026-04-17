import React from "react";
import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from "@designcombo/transitions";

export type DipToColorProps = {
	color?: string;
};

/**
 * Dip-to-Color: fades the exiting clip to a solid color, then fades the
 * entering clip in from that color.  Each clip is responsible for half the
 * animation (exiting: 1→0 opacity, entering: 0→1 opacity).  A full-screen
 * overlay of `color` fills the gap at the midpoint.
 */
const DipToColorComponent: React.FC<
	TransitionPresentationComponentProps<DipToColorProps>
> = ({ presentationProgress, children, presentationDirection, passedProps }) => {
	const { color = "#000000" } = passedProps;
	const isEntering = presentationDirection === "entering";

	// Clip opacity
	const clipOpacity = isEntering ? presentationProgress : presentationProgress;

	// Color overlay opacity: peaks at 1 when the clip is fully faded (progress = 0 for
	// exiting and progress = 0 for entering).  We invert presentationProgress for exiting.
	const overlayOpacity = isEntering
		? 1 - presentationProgress
		: 1 - presentationProgress;

	return (
		<div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
			<div style={{ width: "100%", height: "100%", opacity: clipOpacity }}>
				{children}
			</div>
			<div
				style={{
					position: "absolute",
					inset: 0,
					backgroundColor: color,
					opacity: overlayOpacity,
					pointerEvents: "none",
				}}
			/>
		</div>
	);
};

export const dipToColor = (
	props?: DipToColorProps,
): TransitionPresentation<DipToColorProps> => ({
	component: DipToColorComponent,
	props: props ?? { color: "#000000" },
});
