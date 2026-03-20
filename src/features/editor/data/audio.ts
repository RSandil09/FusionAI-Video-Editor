import { IAudio } from "@designcombo/types";

/**
 * Audio library is now fetched from YouTube Audio Library API.
 * See: useYouTubeAudioLibrary hook and /api/youtube-audio-library route.
 * All tracks are royalty-free and safe for YouTube videos.
 */
export const AUDIOS: Partial<IAudio>[] = [];
