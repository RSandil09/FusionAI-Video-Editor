import React from "react";
import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from "@designcombo/transitions";

export type SpinProps = {
	/** Rotation in degrees for the full transition. Default 180. */
	degrees?: number;
};

const SpinComponent: React.FC<
	TransitionPresentationComponentProps<SpinProps>
> = ({ presentationProgress, children, presentationDirection, passedProps }) => {
	const { degrees = 180 } = passedProps;
	const isEntering = presentationDirection === "entering";

	// Exiting rotates from 0 → degrees, entering arrives from -degrees → 0.
	const rotate = isEntering
		? -degrees * (1 - presentationProgress)
		: degrees * (1 - presentationProgress);

	const opacity = isEntering ? presentationProgress : presentationProgress;
	const scale = isEntering
		? 0.8 + presentationProgress * 0.2
		: 0.8 + presentationProgress * 0.2;

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				transform: `rotate(${rotate}deg) scale(${scale})`,
				opacity,
				overflow: "hidden",
			}}
		>
			{children}
		</div>
	);
};

export const spin = (props?: SpinProps): TransitionPresentation<SpinProps> => ({
	component: SpinComponent,
	props: props ?? {},
});
