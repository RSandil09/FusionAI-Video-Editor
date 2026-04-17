import React from "react";
import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from "@designcombo/transitions";

export type ColorSplitProps = Record<string, never>;

/**
 * Chromatic aberration split — the two clips shift apart in R/G/B channels
 * by layering three semi-transparent copies with mix-blend-mode.
 */
const ColorSplitComponent: React.FC<
	TransitionPresentationComponentProps<ColorSplitProps>
> = ({ presentationProgress, children, presentationDirection }) => {
	const isEntering = presentationDirection === "entering";
	const p = presentationProgress;

	const intensity = isEntering ? (1 - p) * 24 : p * 24;
	const opacity = isEntering ? p : 1;

	return (
		<div style={{ width: "100%", height: "100%", overflow: "hidden", opacity, position: "relative" }}>
			{/* Red channel offset */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					transform: `translateX(${-intensity}px)`,
					mixBlendMode: "screen",
					opacity: 0.6,
					filter: "url(#red-channel)",
				}}
			>
				{children}
			</div>
			{/* Blue channel offset */}
			<div
				style={{
					position: "absolute",
					inset: 0,
					transform: `translateX(${intensity}px)`,
					mixBlendMode: "screen",
					opacity: 0.6,
					filter: "url(#blue-channel)",
				}}
			>
				{children}
			</div>
			{/* Normal composite */}
			<div style={{ position: "absolute", inset: 0 }}>{children}</div>
		</div>
	);
};

export const colorSplit = (): TransitionPresentation<ColorSplitProps> => ({
	component: ColorSplitComponent,
	props: {},
});
