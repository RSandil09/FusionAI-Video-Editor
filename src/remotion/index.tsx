import { Composition, registerRoot } from "remotion";
import { VideoComposition } from "./VideoComposition";

/**
 * Remotion Root File
 * This file registers all compositions that can be rendered server-side
 */

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="VideoEditor"
				component={VideoComposition as React.ComponentType<any>}
				durationInFrames={300} // Default 10 seconds at 30fps
				fps={30}
				width={1080} // Portrait mode (mobile-first)
				height={1920} // 9:16 aspect ratio
				defaultProps={{
					trackItemsMap: {},
					trackItemIds: [],
					transitionsMap: {},
					fps: 30,
					size: { width: 1080, height: 1920 }, // Match composition size
				}}
			/>
		</>
	);
};

registerRoot(RemotionRoot);
