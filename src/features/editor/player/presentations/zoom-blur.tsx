import React from "react";
import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from "@designcombo/transitions";

export type ZoomBlurProps = {
	maxBlur?: number;
};

/** Combined zoom + blur — entering clip zooms in while blur clears, exiting blurs and shrinks. */
const ZoomBlurComponent: React.FC<
	TransitionPresentationComponentProps<ZoomBlurProps>
> = ({ presentationProgress, children, presentationDirection, passedProps }) => {
	const { maxBlur = 16 } = passedProps;
	const isEntering = presentationDirection === "entering";

	const blurAmount = isEntering
		? maxBlur * (1 - presentationProgress)
		: maxBlur * (1 - presentationProgress);

	const scale = isEntering
		? 1.2 - presentationProgress * 0.2
		: 1 - (1 - presentationProgress) * 0.2;

	const opacity = isEntering ? presentationProgress : presentationProgress;

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				transform: `scale(${scale})`,
				filter: `blur(${blurAmount}px)`,
				opacity,
				overflow: "hidden",
			}}
		>
			{children}
		</div>
	);
};

export const zoomBlur = (
	props?: ZoomBlurProps,
): TransitionPresentation<ZoomBlurProps> => ({
	component: ZoomBlurComponent,
	props: props ?? {},
});
