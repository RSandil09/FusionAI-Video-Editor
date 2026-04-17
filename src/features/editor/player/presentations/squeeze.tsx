import React from "react";
import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from "@designcombo/transitions";

export type SqueezeProps = {
	axis?: "vertical" | "horizontal";
};

const SqueezeComponent: React.FC<
	TransitionPresentationComponentProps<SqueezeProps>
> = ({ presentationProgress, children, presentationDirection, passedProps }) => {
	const { axis = "vertical" } = passedProps;
	const isEntering = presentationDirection === "entering";
	const p = presentationProgress;

	const scale = isEntering ? p : p;
	const squish = isEntering
		? axis === "vertical"
			? `scaleY(${0.1 + p * 0.9})`
			: `scaleX(${0.1 + p * 0.9})`
		: axis === "vertical"
		? `scaleY(${p})`
		: `scaleX(${p})`;

	const opacity = isEntering ? Math.min(p * 2, 1) : Math.min((1 - p) * 2, 1) + p > 0.5 ? 1 : scale;

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				overflow: "hidden",
				transform: squish,
				transformOrigin: "center center",
				opacity: isEntering ? p : 1,
			}}
		>
			{children}
		</div>
	);
};

export const squeeze = (props?: SqueezeProps): TransitionPresentation<SqueezeProps> => ({
	component: SqueezeComponent,
	props: props ?? { axis: "vertical" },
});
