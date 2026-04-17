import React from "react";
import type {
	TransitionPresentation,
	TransitionPresentationComponentProps,
} from "@designcombo/transitions";

export type PushProps = {
	direction?: "left" | "right" | "up" | "down";
};

const PushComponent: React.FC<
	TransitionPresentationComponentProps<PushProps>
> = ({ presentationProgress, children, presentationDirection, passedProps }) => {
	const { direction = "left" } = passedProps;
	const isEntering = presentationDirection === "entering";
	const p = presentationProgress;

	let transform = "";
	if (direction === "left") {
		transform = isEntering
			? `translateX(${(1 - p) * 100}%)`
			: `translateX(${-p * 100}%)`;
	} else if (direction === "right") {
		transform = isEntering
			? `translateX(${-(1 - p) * 100}%)`
			: `translateX(${p * 100}%)`;
	} else if (direction === "up") {
		transform = isEntering
			? `translateY(${(1 - p) * 100}%)`
			: `translateY(${-p * 100}%)`;
	} else {
		transform = isEntering
			? `translateY(${-(1 - p) * 100}%)`
			: `translateY(${p * 100}%)`;
	}

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				transform,
				overflow: "hidden",
			}}
		>
			{children}
		</div>
	);
};

export const push = (props?: PushProps): TransitionPresentation<PushProps> => ({
	component: PushComponent,
	props: props ?? { direction: "left" },
});
