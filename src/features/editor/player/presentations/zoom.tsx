import React from "react";
import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from "@designcombo/transitions";

type ZoomDirection = "in" | "out";

export type ZoomProps = {
	direction?: ZoomDirection;
};

const ZoomComponent: React.FC<
	TransitionPresentationComponentProps<ZoomProps>
> = ({ presentationProgress, children, presentationDirection, passedProps }) => {
	const { direction = "in" } = passedProps;
	const isEntering = presentationDirection === "entering";

	let scale: number;
	let opacity: number;

	if (direction === "in") {
		// Entering: scale from 1.3 → 1, exiting: scale 1 → 0.8 and fade out
		if (isEntering) {
			scale = 1.3 - presentationProgress * 0.3;
			opacity = presentationProgress;
		} else {
			scale = 1 - (1 - presentationProgress) * 0.2;
			opacity = presentationProgress;
		}
	} else {
		// Zoom out: entering zooms from 0.8 → 1, exiting 1 → 1.3
		if (isEntering) {
			scale = 0.7 + presentationProgress * 0.3;
			opacity = presentationProgress;
		} else {
			scale = 1 + (1 - presentationProgress) * 0.3;
			opacity = presentationProgress;
		}
	}

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				transform: `scale(${scale})`,
				opacity,
				overflow: "hidden",
			}}
		>
			{children}
		</div>
	);
};

export const zoom = (props?: ZoomProps): TransitionPresentation<ZoomProps> => ({
	component: ZoomComponent,
	props: props ?? { direction: "in" },
});
