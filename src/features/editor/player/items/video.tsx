import { IVideo } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { BoxAnim, ContentAnim, MaskAnim } from "@designcombo/animations";
import { calculateContainerStyles, calculateMediaStyles } from "../styles";
import { getAnimations } from "../../utils/get-animations";
import { calculateFrames } from "../../utils/frames";
import { Video as RemotionVideo } from "remotion";

// Ensure video uses proxy URL (same URL that works when opened in new tab)
// During Remotion server render, use direct URLs as-is - no localhost proxy available
function ensureVideoUrl(src: string): string {
	if (!src) return src;

	if (src.includes("/api/video-proxy")) return src;
	if (src.includes("/api/image-proxy")) {
		return src.replace("/api/image-proxy", "/api/video-proxy");
	}

	// Absolute URL (e.g. direct R2 from render) - use as-is
	if (src.startsWith("http://") || src.startsWith("https://")) {
		return src;
	}

	if (src.includes(".r2.dev")) {
		return `/api/video-proxy?url=${encodeURIComponent(src)}`;
	}

	return src;
}

export const Video = ({
	item,
	options,
}: {
	item: IVideo;
	options: SequenceItemOptions;
}) => {
	const { fps, frame, muteAudio } = options;
	const { details, animations } = item;
	const playbackRate = item.playbackRate || 1;
	const { animationIn, animationOut, animationTimed } = getAnimations(
		animations!,
		item,
		frame,
		fps,
	);
	const crop = details?.crop || {
		x: 0,
		y: 0,
		width: details.width,
		height: details.height,
	};
	const { durationInFrames } = calculateFrames(item.display, fps);
	const currentFrame = (frame || 0) - (item.display.from * fps) / 1000;

	// Use proxy URL - same URL that works when opened in new tab
	const videoSrc = ensureVideoUrl(details.src);

	const children = (
		<BoxAnim
			style={calculateContainerStyles(details, crop, {
				overflow: "hidden",
			})}
			animationIn={animationIn}
			animationOut={animationOut}
			frame={currentFrame}
			durationInFrames={durationInFrames}
		>
			<ContentAnim
				animationTimed={animationTimed}
				durationInFrames={durationInFrames}
				frame={currentFrame}
			>
				<MaskAnim
					item={item}
					keyframeAnimations={animationTimed}
					frame={frame || 0}
				>
					<div style={calculateMediaStyles(details, crop)}>
						<RemotionVideo
							startFrom={(item.trim?.from! / 1000) * fps}
							endAt={(item.trim?.to! / 1000) * fps || 1 / fps}
							playbackRate={playbackRate}
							src={videoSrc}
							volume={muteAudio ? 0 : (details.volume || 0) / 100}
							onError={(e) => {
								console.error("Video playback error:", e, "URL:", videoSrc);
							}}
						/>
					</div>
				</MaskAnim>
			</ContentAnim>
		</BoxAnim>
	);

	return BaseSequence({ item, options, children });
};

export default Video;
