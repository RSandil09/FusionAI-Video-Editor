import { JSX } from "react";
import {
	circle,
	clockWipe,
	fade,
	linearTiming,
	rectangle,
	slide,
	slidingDoors,
	star,
	wipe,
	TransitionSeries,
} from "@designcombo/transitions";

// Directional flip from @remotion/transitions — supports from-left/right/top/bottom.
// Exported via the package's subpath exports map ("@remotion/transitions/flip").
// @designcombo/transitions' TransitionSeries accepts any compatible TransitionPresentation<T>.
import { flip } from "@remotion/transitions/flip";
import { springTiming } from "@remotion/transitions";

// Custom presentations
import { zoom } from "./presentations/zoom";
import { blur } from "./presentations/blur";
import { dipToColor } from "./presentations/dip-to-color";
import { spin } from "./presentations/spin";
import { zoomBlur } from "./presentations/zoom-blur";
import { push } from "./presentations/push";
import { glitch } from "./presentations/glitch";
import { colorSplit } from "./presentations/color-split";
import { dreamFade } from "./presentations/dream-fade";
import { squeeze } from "./presentations/squeeze";
import { crossZoom } from "./presentations/cross-zoom";

import type { SlideDirection } from "@designcombo/transitions";

interface TransitionOptions {
	width: number;
	height: number;
	durationInFrames: number;
	id: string;
	direction?: string;
	color?: string; // used by dipToBlack / dipToWhite
}

export const Transitions: Record<
	string,
	(options: TransitionOptions) => JSX.Element
> = {
	// ── Basic ────────────────────────────────────────────────────────────────────
	none: ({ id }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={fade()}
			timing={linearTiming({ durationInFrames: 1 })}
		/>
	),
	fade: ({ durationInFrames, id }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={fade()}
			timing={linearTiming({ durationInFrames })}
		/>
	),
	dipToBlack: ({ durationInFrames, id, color }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={dipToColor({ color: color ?? "#000000" })}
			timing={linearTiming({ durationInFrames })}
		/>
	),
	dipToWhite: ({ durationInFrames, id, color }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={dipToColor({ color: color ?? "#ffffff" })}
			timing={linearTiming({ durationInFrames })}
		/>
	),
	dreamFade: ({ durationInFrames, id }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={dreamFade()}
			timing={linearTiming({ durationInFrames })}
		/>
	),

	// ── Slide ────────────────────────────────────────────────────────────────────
	slide: ({ durationInFrames, id, direction }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={slide({ direction: direction as SlideDirection })}
			timing={linearTiming({ durationInFrames })}
		/>
	),
	push: ({ durationInFrames, id, direction }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={push({ direction: direction as any })}
			timing={linearTiming({ durationInFrames })}
		/>
	),

	// ── Wipe — includes @remotion/transitions diagonal directions ─────────────────
	wipe: ({ durationInFrames, id, direction }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={wipe({ direction: direction as any })}
			timing={linearTiming({ durationInFrames })}
		/>
	),
	clockWipe: ({ width, height, durationInFrames, id }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={clockWipe({ width, height })}
			timing={linearTiming({ durationInFrames })}
		/>
	),

	// ── Flip — @remotion/transitions supports direction prop ──────────────────────
	flip: ({ durationInFrames, id, direction }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={flip({ direction: direction as any })}
			timing={springTiming({ durationInFrames, config: { damping: 200 } })}
		/>
	),

	// ── Zoom ─────────────────────────────────────────────────────────────────────
	zoomIn: ({ durationInFrames, id }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={zoom({ direction: "in" })}
			timing={linearTiming({ durationInFrames })}
		/>
	),
	zoomOut: ({ durationInFrames, id }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={zoom({ direction: "out" })}
			timing={linearTiming({ durationInFrames })}
		/>
	),
	zoomBlur: ({ durationInFrames, id }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={zoomBlur()}
			timing={linearTiming({ durationInFrames })}
		/>
	),
	crossZoom: ({ durationInFrames, id }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={crossZoom()}
			timing={linearTiming({ durationInFrames })}
		/>
	),
	blur: ({ durationInFrames, id }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={blur()}
			timing={linearTiming({ durationInFrames })}
		/>
	),

	// ── Special ──────────────────────────────────────────────────────────────────
	spin: ({ durationInFrames, id }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={spin()}
			timing={linearTiming({ durationInFrames })}
		/>
	),
	glitch: ({ durationInFrames, id }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={glitch()}
			timing={linearTiming({ durationInFrames })}
		/>
	),
	colorSplit: ({ durationInFrames, id }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={colorSplit()}
			timing={linearTiming({ durationInFrames })}
		/>
	),
	squeeze: ({ durationInFrames, id, direction }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={squeeze({ axis: direction === "horizontal" ? "horizontal" : "vertical" })}
			timing={springTiming({ durationInFrames, config: { damping: 200 } })}
		/>
	),
	star: ({ width, height, durationInFrames, id }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={star({ width, height })}
			timing={linearTiming({ durationInFrames })}
		/>
	),
	circle: ({ width, height, durationInFrames, id }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={circle({ width, height })}
			timing={linearTiming({ durationInFrames })}
		/>
	),
	rectangle: ({ width, height, durationInFrames, id }: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={rectangle({ width, height })}
			timing={linearTiming({ durationInFrames })}
		/>
	),
	slidingDoors: ({
		width,
		height,
		durationInFrames,
		id,
	}: TransitionOptions) => (
		<TransitionSeries.Transition
			key={id}
			presentation={slidingDoors({ width, height })}
			timing={linearTiming({ durationInFrames })}
		/>
	),
};
