import React from "react";
import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from "@designcombo/transitions";

export type BlurProps = {
	/** Maximum blur radius in pixels at the midpoint. Default 20. */
	maxBlur?: number;
};

const BlurComponent: React.FC<
	TransitionPresentationComponentProps<BlurProps>
> = ({ presentationProgress, children, presentationDirection, passedProps }) => {
	const { maxBlur = 20 } = passedProps;
	const isEntering = presentationDirection === "entering";

	// Both clips are fully blurred at the midpoint (progress = 0.5 maps to 1.0 blur).
	// Exiting: blur grows as progress goes 1→0.  Entering: blur shrinks as progress goes 0→1.
	const blurAmount = isEntering
		? maxBlur * (1 - presentationProgress)
		: maxBlur * presentationProgress;

	const opacity = isEntering ? presentationProgress : 1;

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				filter: `blur(${blurAmount}px)`,
				opacity,
				overflow: "hidden",
			}}
		>
			{children}
		</div>
	);
};

export const blur = (props?: BlurProps): TransitionPresentation<BlurProps> => ({
	component: BlurComponent,
	props: props ?? {},
});
