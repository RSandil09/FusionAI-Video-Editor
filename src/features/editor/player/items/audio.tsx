import { IAudio } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { AudioWithEffects } from "./audio-with-effects";

export default function Audio({
	item,
	options,
}: {
	item: IAudio;
	options: SequenceItemOptions;
}) {
	const { fps, muteAudio } = options;
	const { details } = item;
	const playbackRate = item.playbackRate || 1;

	// Compute source file duration so Remotion skips its internal network fetch.
	// Without this, Remotion calls delayRender() to load the audio and measure
	// its duration — which times out inside Lambda when reaching R2 storage.
	const trimEndMs = item.trim?.to ?? 0;
	const displayDurationMs = (item.display?.to ?? 0) - (item.display?.from ?? 0);
	const sourceDurationSec = trimEndMs > 0
		? trimEndMs / 1000
		: displayDurationMs / 1000 / playbackRate;

	const children = (
		<AudioWithEffects
			startFrom={((item.trim?.from ?? 0) / 1000) * fps}
			endAt={trimEndMs > 0 ? (trimEndMs / 1000) * fps : (displayDurationMs / 1000 / playbackRate) * fps}
			playbackRate={playbackRate}
			src={details.src}
			volume={muteAudio ? 0 : details.volume! / 100}
			effects={(details as any).audioEffects}
			durationInSeconds={Math.max(sourceDurationSec, 1)}
		/>
	);
	return BaseSequence({ item, options, children });
}
