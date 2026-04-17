import React from "react";
import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from "@designcombo/transitions";

export type GlitchProps = Record<string, never>;

const GlitchComponent: React.FC<
	TransitionPresentationComponentProps<GlitchProps>
> = ({ presentationProgress, children, presentationDirection }) => {
	const isEntering = presentationDirection === "entering";
	const p = presentationProgress;

	// Intensity peaks near the midpoint for exiting, and decays for entering
	const intensity = isEntering ? (1 - p) * 0.5 : p * 0.5;

	// Deterministic "random" offsets based on progress
	const rx = Math.sin(p * 37.3) * intensity * 12;
	const ry = Math.cos(p * 23.7) * intensity * 4;
	const rSlice = Math.abs(Math.sin(p * 89.1)) * intensity;

	const opacity = isEntering ? p : 1;

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				overflow: "hidden",
				opacity,
				transform: `translate(${rx}px, ${ry}px)`,
				filter: rSlice > 0.15
					? `hue-rotate(${rSlice * 120}deg) saturate(${1 + rSlice * 2})`
					: undefined,
			}}
		>
			{children}
		</div>
	);
};

export const glitch = (): TransitionPresentation<GlitchProps> => ({
	component: GlitchComponent,
	props: {},
});
