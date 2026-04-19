import { generateId } from "@designcombo/timeline";
import { ICaption } from "@designcombo/types";
import { CAPTION_DEFAULTS } from "../constants/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Word {
	word: string;
	start: number; // seconds (from transcription JSON)
	end: number;   // seconds
	confidence?: number;
}

interface ICaptionLine {
	text: string;
	words: Word[];
	start: number; // seconds
	end: number;   // seconds
}

interface FontInfo {
	fontFamily: string;
	fontUrl: string;
	fontSize: number;
}

export interface CaptionOptions {
	containerWidth: number;
	/** Maximum number of words per caption group. Default: 4. */
	maxWordsPerCaption?: number;
	parentId: string;
	/** Timeline position (ms) of the clip this caption belongs to. */
	displayFrom: number;
	/**
	 * Additional timing offset in milliseconds applied to every word's start/end.
	 * Positive = shift later, negative = shift earlier.
	 * Use negative values to compensate for any remaining LLM delay.
	 * Default: 0 (the route already applies -150ms calibration).
	 */
	timingOffsetMs?: number;
	/**
	 * Minimum silence gap (seconds) that forces a new caption group even
	 * if the current group hasn't hit maxWordsPerCaption yet.
	 * Default: 0.75s
	 */
	silenceGapS?: number;
	/**
	 * Start of the visible trim window in the source video, in seconds.
	 * Words before this point are excluded. Default: 0 (no trim).
	 */
	trimFromS?: number;
	/**
	 * End of the visible trim window in the source video, in seconds.
	 * Words after this point are excluded. Default: Infinity (no trim).
	 */
	trimToS?: number;
}

interface CaptionsInput {
	sourceUrl: string;
	results: {
		main: {
			words: Word[];
		};
	};
}

// ── Core caption generation ───────────────────────────────────────────────────

export const generateCaption = (
	captionLine: ICaptionLine,
	fontInfo: FontInfo,
	options: CaptionOptions,
	sourceUrl: string,
): ICaption => {
	const timingOffsetMs = options.timingOffsetMs ?? 0;

	// Apply any additional user-specified timing offset (on top of server calibration)
	const fromMs = options.displayFrom + captionLine.start * 1000 + timingOffsetMs;
	const toMs = options.displayFrom + captionLine.end * 1000 + timingOffsetMs;

	const caption = {
		id: generateId(),
		type: "caption",
		name: "Caption",
		display: {
			from: Math.max(0, fromMs),
			to: Math.max(0, toMs),
		},
		metadata: {
			sourceUrl,
			parentId: options.parentId,
		},
		details: {
			appearedColor: CAPTION_DEFAULTS.appearedColor,
			activeColor: CAPTION_DEFAULTS.activeColor,
			activeFillColor: CAPTION_DEFAULTS.activeFillColor,
			color: "#DADADA",
			backgroundColor: "transparent",
			borderColor: "#000000",
			borderWidth: 5,
			text: captionLine.text,
			fontSize: fontInfo.fontSize,
			width: options.containerWidth,
			fontFamily: fontInfo.fontFamily,
			fontUrl: fontInfo.fontUrl,
			textAlign: "center",
			linesPerCaption: 1,
			words: captionLine.words.map((w) => ({
				...w,
				// Convert seconds → milliseconds for the player
				start: w.start * 1000 + timingOffsetMs,
				end: w.end * 1000 + timingOffsetMs,
			})),
		} as unknown,
	};
	return caption as ICaption;
};

/**
 * Group words into caption lines.
 *
 * Strategy (in priority order):
 *  1. Start a new group when a silence gap >= silenceGapS is detected.
 *  2. Start a new group when maxWordsPerCaption has been reached.
 *  3. Prefer breaking after sentence-ending punctuation (., !, ?).
 *
 * This replaces the old canvas-measureText approach which was unreliable when
 * fonts aren't loaded and produced inconsistent line lengths.
 */
function createCaptionLines(
	input: CaptionsInput,
	_fontInfo: FontInfo,      // kept for API compatibility
	options: CaptionOptions,
): ICaptionLine[] {
	const allWords = input.results.main.words;
	if (!allWords || allWords.length === 0) return [];

	// ── Trim window filtering ─────────────────────────────────────────────────
	// trimFromS / trimToS are in source-video seconds.
	// We keep only words that fall inside [trimFromS, trimToS] and shift their
	// timestamps so t=0 is the start of the visible clip (not the raw file).
	const trimFromS = options.trimFromS ?? 0;
	const trimToS = options.trimToS ?? Infinity;

	const words: Word[] = allWords
		.filter((w) => w.end > trimFromS && w.start < trimToS)
		.map((w) => ({
			...w,
			// Clamp word boundaries to the trim window, then subtract the trim offset
			// so captions are relative to clip-start (t=0) rather than file-start.
			start: Math.max(0, w.start - trimFromS),
			end: Math.max(0, Math.min(w.end, trimToS) - trimFromS),
		}));

	if (words.length === 0) return [];

	const maxWords = Math.max(1, options.maxWordsPerCaption ?? 4);
	const silenceGapS = options.silenceGapS ?? 0.75;

	const lines: ICaptionLine[] = [];
	let currentWords: Word[] = [];

	const flushLine = () => {
		if (currentWords.length === 0) return;
		lines.push({
			text: currentWords.map((w) => w.word).join(" "),
			words: [...currentWords],
			start: currentWords[0].start,
			end: currentWords[currentWords.length - 1].end,
		});
		currentWords = [];
	};

	words.forEach((word, index) => {
		const prev = words[index - 1];

		// Check for a long silence gap since the previous word
		const silenceGap = prev ? word.start - prev.end : 0;
		const isSilenceBreak = silenceGap >= silenceGapS;

		// Check if the current group has hit the word limit
		const isWordLimitReached = currentWords.length >= maxWords;

		// Check if previous word ended a sentence
		const prevWordText = prev?.word ?? "";
		const isSentenceEnd = /[.!?]$/.test(prevWordText);

		if (currentWords.length > 0 && (isSilenceBreak || isWordLimitReached || isSentenceEnd)) {
			flushLine();
		}

		currentWords.push(word);
	});

	flushLine(); // push any remaining words

	return lines;
}

export function generateCaptions(
	input: CaptionsInput,
	fontInfo: FontInfo,
	options: CaptionOptions,
): ICaption[] {
	const captionLines = createCaptionLines(input, fontInfo, options);
	return captionLines.map((line) =>
		generateCaption(line, fontInfo, options, input.sourceUrl),
	);
}
