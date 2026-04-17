import React from "react";
import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from "@designcombo/transitions";

export type CrossZoomProps = Record<string, never>;

/**
 * Cross-zoom — outgoing clip zooms in while fading, incoming clip zooms out from large.
 * Creates a punchy "smash zoom" feel between clips.
 */
const CrossZoomComponent: React.FC<
	TransitionPresentationComponentProps<CrossZoomProps>
> = ({ presentationProgress, children, presentationDirection }) => {
	const isEntering = presentationDirection === "entering";
	const p = presentationProgress;

	const scale = isEntering ? 1.5 - p * 0.5 : 1 + (1 - p) * 0.5;
	const opacity = isEntering ? p : p;

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				overflow: "hidden",
				transform: `scale(${scale})`,
				opacity,
			}}
		>
			{children}
		</div>
	);
};

export const crossZoom = (): TransitionPresentation<CrossZoomProps> => ({
	component: CrossZoomComponent,
	props: {},
});
