import { IAudio } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { Audio as RemotionAudio } from "remotion";
import { AudioWithEffects } from "./audio-with-effects";

export default function Audio({
	item,
	options,
}: {
	item: IAudio;
	options: SequenceItemOptions;
}) {
	const { fps } = options;
	const { details } = item;
	const playbackRate = item.playbackRate || 1;
	const children = (
		<AudioWithEffects
			startFrom={(item.trim?.from! / 1000) * fps}
			endAt={(item.trim?.to! / 1000) * fps || 1 / fps}
			playbackRate={playbackRate}
			src={details.src}
			volume={details.volume! / 100}
			effects={(details as any).audioEffects}
		/>
	);
	return BaseSequence({ item, options, children });
}
