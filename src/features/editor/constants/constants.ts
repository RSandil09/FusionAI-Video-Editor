export const PREVIEW_FRAME_WIDTH = 188;
export const DEFAULT_FRAMERATE = 60;
export const FRAME_INTERVAL = 1000 / DEFAULT_FRAMERATE;
export const TIMELINE_OFFSET_X = 8; // Static fallback value
export const TIMELINE_OFFSET_CANVAS_LEFT = 16;
export const TIMELINE_OFFSET_CANVAS_RIGHT = 80;
export const DEFAULT_FONT = "Roboto";
export const DEFAULT_WEIGHT = "Regular";
export const SECONDARY_FONT_URL =
	"https://cdn.designcombo.dev/fonts/Geist-SemiBold.ttf";
export const SECONDARY_FONT = "geist-regular";

export const LARGER_FONT_SIZE = 30;
export const LARGE_FONT_SIZE = 24;
export const NORMAL_FONT_SIZE = 16;
export const SMALL_FONT_SIZE = 12;

// Dynamic timeline offset values (width of track labels area)
export const TIMELINE_OFFSET_X_SMALL = 40;
export const TIMELINE_OFFSET_X_LARGE = 120;

// Default caption colors - professional broadcast-style palette
export const CAPTION_DEFAULTS = {
	appearedColor: "#F8FAFC", // Soft white - readable, easy on eyes
	activeColor: "#0EA5E9", // Sky blue - modern, professional accent
	activeFillColor: "#6366F1", // Indigo - sophisticated highlight fill
} as const;
