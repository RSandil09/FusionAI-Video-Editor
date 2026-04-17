import React from "react";
import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from "@designcombo/transitions";

export type DreamFadeProps = Record<string, never>;

/**
 * Dream fade — blur + brightness overexposure that peaks at the midpoint,
 * giving a soft, dreamy dissolve.
 */
const DreamFadeComponent: React.FC<
	TransitionPresentationComponentProps<DreamFadeProps>
> = ({ presentationProgress, children, presentationDirection }) => {
	const isEntering = presentationDirection === "entering";
	const p = presentationProgress;

	// Both clips peak at maximum blur/brightness at the midpoint
	const blurAmount = isEntering ? (1 - p) * 14 : p * 14;
	const brightness = isEntering ? 1 + (1 - p) * 0.8 : 1 + p * 0.8;
	const opacity = isEntering ? p : 1;

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				overflow: "hidden",
				opacity,
				filter: `blur(${blurAmount}px) brightness(${brightness})`,
			}}
		>
			{children}
		</div>
	);
};

export const dreamFade = (): TransitionPresentation<DreamFadeProps> => ({
	component: DreamFadeComponent,
	props: {},
});
