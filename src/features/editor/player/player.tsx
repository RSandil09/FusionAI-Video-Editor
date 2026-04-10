import { useEffect, useRef } from "react";
import Composition from "./composition";
import { Player as RemotionPlayer, PlayerRef } from "@remotion/player";
import useStore from "../store/use-store";

const Player = () => {
	const playerRef = useRef<PlayerRef>(null);
	const { setPlayerRef, duration, fps, size, background } = useStore();

	// Defensive guard: never let durationInFrames shrink while the playhead is
	// beyond the new value. Remotion throws an invariant error if the current
	// frame exceeds durationInFrames-1. We only allow a shrink when the playhead
	// is safely inside the new range.
	const safeDurationFramesRef = useRef(
		Math.max(1, Math.round((duration / 1000) * fps)),
	);
	const computedFrames = Math.max(1, Math.round((duration / 1000) * fps));
	const currentFrame = playerRef.current?.getCurrentFrame?.() ?? 0;
	if (
		computedFrames > safeDurationFramesRef.current ||
		currentFrame < computedFrames
	) {
		safeDurationFramesRef.current = computedFrames;
	}

	useEffect(() => {
		setPlayerRef(playerRef as React.RefObject<PlayerRef>);
	}, []);

	return (
		<RemotionPlayer
			ref={playerRef}
			component={Composition}
			durationInFrames={safeDurationFramesRef.current}
			compositionWidth={size.width}
			compositionHeight={size.height}
			className={`h-full w-full bg-[${background.value}]`}
			fps={fps}
			overflowVisible
		/>
	);
};
export default Player;
