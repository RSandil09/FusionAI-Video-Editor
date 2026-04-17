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
				durationInFrames={300} // fallback only — overridden by calculateMetadata
				fps={30}
				width={1080}
				height={1920}
				defaultProps={{
					trackItemsMap: {},
					trackItemIds: [],
					transitionsMap: {},
					fps: 30,
					size: { width: 1080, height: 1920 },
					durationInFrames: 300,
				}}
				calculateMetadata={({ props }) => {
					// Read values injected via inputProps by the render API route.
					// This is the correct Remotion v4 pattern for dynamic composition
					// metadata — renderMediaOnLambda does not accept these directly.
					const fps = (props as any).fps ?? 30;
					const duration = (props as any).durationInFrames ?? 300;
					const size = (props as any).size ?? { width: 1080, height: 1920 };
					return {
						durationInFrames: Math.max(1, Math.round(duration)),
						fps,
						width: size.width ?? 1080,
						height: size.height ?? 1920,
					};
				}}
			/>
		</>
	);
};

registerRoot(RemotionRoot);
