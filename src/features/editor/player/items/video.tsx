import { IVideo } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { BoxAnim, ContentAnim, MaskAnim } from "@designcombo/animations";
import { calculateContainerStyles, calculateMediaStyles } from "../styles";
import { getAnimations } from "../../utils/get-animations";
import { calculateFrames } from "../../utils/frames";
import { Video as RemotionVideo, OffthreadVideo, getRemotionEnvironment } from "remotion";

// Ensure video uses proxy URL for browser playback.
// During Lambda/server rendering, Puppeteer cannot reach the Next.js proxy route,
// so we return the src unchanged — VideoComposition.resolveTrackItemSrcs has already
// stripped any proxy wrapper leaving a direct R2 URL.
function ensureVideoUrl(src: string): string {
	if (!src) return src;

	// Skip all proxy logic during server-side rendering (Lambda / CLI)
	if (getRemotionEnvironment().isRendering) return src;

	if (src.includes("/api/video-proxy")) return src;
	if (src.includes("/api/image-proxy")) {
		return src.replace("/api/image-proxy", "/api/video-proxy");
	}

	// Proxy R2 URLs before the generic https check — absolute R2 URLs need the proxy
	// for authenticated playback, just like relative proxy paths do.
	if (src.includes(".r2.dev")) {
		return `/api/video-proxy?url=${encodeURIComponent(src)}`;
	}

	// Other absolute URLs (e.g. external CDNs used during Lambda render) — use as-is
	if (src.startsWith("http://") || src.startsWith("https://")) {
		return src;
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

	// Compute endAt in frames — Remotion's <Video> does not accept durationInSeconds
	// (unlike <Audio>), so duration-fetch prevention is not needed here.
	const trimEndMs = item.trim?.to ?? 0;
	const displayDurationMs = (item.display?.to ?? 0) - (item.display?.from ?? 0);
	const endAtFrames = trimEndMs > 0
		? (trimEndMs / 1000) * fps
		: (displayDurationMs / 1000 / playbackRate) * fps;

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
						{getRemotionEnvironment().isRendering ? (
							// OffthreadVideo uses ffmpeg for frame-accurate extraction in Lambda.
							// It handles large video files without relying on browser video APIs.
							<OffthreadVideo
								startFrom={((item.trim?.from ?? 0) / 1000) * fps}
								endAt={endAtFrames}
								playbackRate={playbackRate}
								src={videoSrc}
								volume={muteAudio ? 0 : (details.volume || 0) / 100}
							/>
						) : (
							<RemotionVideo
								startFrom={((item.trim?.from ?? 0) / 1000) * fps}
								endAt={endAtFrames}
								playbackRate={playbackRate}
								src={videoSrc}
								volume={muteAudio ? 0 : (details.volume || 0) / 100}
								onError={(e) => {
									console.error("Video playback error:", e, "URL:", videoSrc);
								}}
							/>
						)}
					</div>
				</MaskAnim>
			</ContentAnim>
		</BoxAnim>
	);

	return BaseSequence({ item, options, children });
};

export default Video;
