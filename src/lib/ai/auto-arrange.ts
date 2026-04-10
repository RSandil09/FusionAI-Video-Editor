/**
 * Auto-arrange: AI-powered timeline assembly from raw assets.
 *
 * Given a list of uploaded assets (video, image, audio), this module:
 *  1. Fetches each video and sends it to Gemini for scene detection
 *  2. Picks the best segments (top scenes by confidence, or full clip if short)
 *  3. Returns a fully-valid editor_state that passes validateEditorState()
 *     and can be dispatched via DESIGN_LOAD without any transformation.
 *
 * IMPORTANT: the shape here must match createEmptyEditorState() exactly —
 * tracks need `accepts`, `magnetic`, `static`; items need `crop` in details;
 * and the state needs a top-level `id`.
 */

import { logger } from "@/lib/logger";
import { generateId } from "@designcombo/timeline";
import { getGeminiClient, parseJsonResponse } from "./gemini";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface AssetInput {
	url: string;
	type: "video" | "image" | "audio";
	/** Natural duration in ms (for video/audio). Undefined for images. */
	durationMs?: number;
	/** Natural dimensions for video/image */
	width?: number;
	height?: number;
	/** Original filename */
	name?: string;
}

interface Segment {
	start: number; // seconds
	end: number; // seconds
	label?: string;
	confidence?: number;
}

// ─── Gemini scene analysis ────────────────────────────────────────────────────

const SCENE_PROMPT = `
You are a professional video editor assistant. Analyze this video carefully.
Return ONLY valid JSON (no markdown, no extra text).
All timestamps must be in SECONDS as floats.

Task: Detect all scene changes/cuts in this video.

Return JSON:
{
  "segments": [
    { "start": 0.0, "end": 2.5, "label": "Opening shot", "confidence": 0.95 }
  ]
}

Rules:
- Each segment = one continuous scene
- "start" / "end" in seconds, "confidence" 0.0–1.0
- Include ALL scenes from start to end
- If video is under 10 s, return one segment covering the whole clip
`.trim();

async function analyseVideoScenes(
	url: string,
	fallbackDurationMs: number,
): Promise<Segment[]> {
	const fallback: Segment[] = [{ start: 0, end: fallbackDurationMs / 1000 }];
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(90_000) });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const contentType = response.headers.get("content-type") || "video/mp4";
		const buffer = await response.arrayBuffer();
		const sizeMB = buffer.byteLength / (1024 * 1024);

		if (sizeMB > 20) {
			logger.warn(
				`[auto-arrange] Video ${sizeMB.toFixed(1)} MB > 20 MB limit — skipping AI`,
			);
			return fallback;
		}

		const base64 = Buffer.from(buffer).toString("base64");
		const client = getGeminiClient();

		const result = await client.models.generateContent({
			model: "gemini-2.5-flash",
			contents: [
				{
					role: "user",
					parts: [
						{ inlineData: { mimeType: contentType, data: base64 } },
						{ text: SCENE_PROMPT },
					],
				},
			],
		});

		const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
		const parsed = parseJsonResponse<{ segments: Segment[] }>(rawText);
		const segments = (parsed?.segments ?? []).filter(
			(s) =>
				typeof s.start === "number" &&
				typeof s.end === "number" &&
				s.end > s.start,
		);
		return segments.length > 0 ? segments : fallback;
	} catch (err) {
		logger.error("[auto-arrange] Scene analysis error:", err);
		return fallback;
	}
}

/** Pick top segments by confidence; cap at 4 clips, each 2–15 s */
function selectBestSegments(
	segments: Segment[],
	videoDurationMs: number,
): Segment[] {
	if (videoDurationMs <= 12_000 || segments.length <= 1) return segments;

	const filtered = segments.filter((s) => {
		const dur = s.end - s.start;
		return dur >= 2 && dur <= 15;
	});
	const pool = filtered.length > 0 ? filtered : segments;

	return [...pool]
		.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
		.slice(0, 4)
		.sort((a, b) => a.start - b.start);
}

// ─── Transcription ───────────────────────────────────────────────────────────

interface TranscriptWord {
	word: string;
	start: number; // seconds
	end: number; // seconds
}

const TRANSCRIBE_PROMPT = `
You are a transcription assistant. Listen to this video and transcribe all spoken words.
Return ONLY valid JSON (no markdown, no extra text).
All timestamps must be in SECONDS as floats.

Return JSON:
{
  "words": [
    { "word": "Hello", "start": 0.0, "end": 0.4 },
    { "word": "world", "start": 0.5, "end": 0.9 }
  ]
}

Rules:
- Include every spoken word with its precise start/end time
- If there is no speech, return { "words": [] }
`.trim();

async function transcribeVideo(url: string): Promise<TranscriptWord[]> {
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(90_000) });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const contentType = response.headers.get("content-type") || "video/mp4";
		const buffer = await response.arrayBuffer();
		const sizeMB = buffer.byteLength / (1024 * 1024);

		if (sizeMB > 20) {
			logger.warn(
				`[auto-arrange] Video ${sizeMB.toFixed(1)} MB > 20 MB — skipping transcription`,
			);
			return [];
		}

		const base64 = Buffer.from(buffer).toString("base64");
		const client = getGeminiClient();

		const result = await client.models.generateContent({
			model: "gemini-2.5-flash",
			contents: [
				{
					role: "user",
					parts: [
						{ inlineData: { mimeType: contentType, data: base64 } },
						{ text: TRANSCRIBE_PROMPT },
					],
				},
			],
		});

		const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
		const parsed = parseJsonResponse<{ words: TranscriptWord[] }>(rawText);
		return (parsed?.words ?? []).filter(
			(w) =>
				typeof w.word === "string" &&
				typeof w.start === "number" &&
				typeof w.end === "number",
		);
	} catch (err) {
		logger.error("[auto-arrange] Transcription error:", err);
		return [];
	}
}

/** Group words into caption segments of up to maxWords or maxDurationSecs */
function groupIntoCaptions(
	words: TranscriptWord[],
	maxWords = 6,
	maxDurationSecs = 4,
): Array<{
	text: string;
	words: TranscriptWord[];
	start: number;
	end: number;
}> {
	const lines: Array<{
		text: string;
		words: TranscriptWord[];
		start: number;
		end: number;
	}> = [];
	let current: TranscriptWord[] = [];

	for (const w of words) {
		current.push(w);
		const dur = w.end - current[0].start;
		if (current.length >= maxWords || dur >= maxDurationSecs) {
			lines.push({
				text: current.map((x) => x.word).join(" "),
				words: current,
				start: current[0].start,
				end: w.end,
			});
			current = [];
		}
	}
	if (current.length > 0) {
		lines.push({
			text: current.map((x) => x.word).join(" "),
			words: current,
			start: current[0].start,
			end: current[current.length - 1].end,
		});
	}
	return lines;
}

function makeCaptionItem(
	id: string,
	text: string,
	words: TranscriptWord[],
	displayFrom: number,
	displayTo: number,
	canvasW: number,
) {
	return {
		id,
		type: "caption",
		name: "Caption",
		display: { from: displayFrom, to: displayTo },
		metadata: {},
		details: {
			text,
			width: canvasW,
			fontSize: 40,
			fontFamily: "Roboto",
			fontUrl: "",
			textAlign: "center",
			color: "#F8FAFC",
			backgroundColor: "transparent",
			borderColor: "#000000",
			borderWidth: 4,
			appearedColor: "#F8FAFC",
			activeColor: "#0EA5E9",
			activeFillColor: "#6366F1",
			linesPerCaption: 2,
			words: words.map((w) => ({
				word: w.word,
				start: Math.round(w.start * 1000),
				end: Math.round(w.end * 1000),
			})),
		},
	};
}

// ─── Track item builders ──────────────────────────────────────────────────────

/**
 * Returns a canvas-sized crop rect.
 * BaseSequence does `details.crop || { x:0, y:0, width: details.width, height: details.height }`
 * so providing it explicitly avoids any undefined-size fallback.
 */
function makeCrop(canvasW: number, canvasH: number) {
	return { x: 0, y: 0, width: canvasW, height: canvasH };
}

function makeVideoItem(
	id: string,
	src: string,
	displayFrom: number,
	displayTo: number,
	trimFrom: number,
	trimTo: number,
	canvasW: number,
	canvasH: number,
) {
	return {
		id,
		type: "video",
		name: "Video clip",
		display: { from: displayFrom, to: displayTo },
		trim: { from: trimFrom, to: trimTo },
		playbackRate: 1,
		details: {
			src,
			width: canvasW,
			height: canvasH,
			volume: 100,
			borderRadius: 0,
			brightness: 100,
			blur: 0,
			opacity: 100,
			crop: makeCrop(canvasW, canvasH),
		},
		animations: {},
		metadata: {},
	};
}

function makeImageItem(
	id: string,
	src: string,
	displayFrom: number,
	displayTo: number,
	canvasW: number,
	canvasH: number,
) {
	return {
		id,
		type: "image",
		name: "Photo",
		display: { from: displayFrom, to: displayTo },
		details: {
			src,
			width: canvasW,
			height: canvasH,
			borderRadius: 0,
			brightness: 100,
			blur: 0,
			opacity: 100,
			crop: makeCrop(canvasW, canvasH),
		},
		animations: {},
		metadata: {},
	};
}

function makeAudioItem(
	id: string,
	src: string,
	displayFrom: number,
	displayTo: number,
	trimFrom: number,
	trimTo: number,
) {
	return {
		id,
		type: "audio",
		name: "Audio",
		display: { from: displayFrom, to: displayTo },
		trim: { from: trimFrom, to: trimTo },
		details: {
			src,
			volume: 80,
			// audio items have no visual dimensions; crop not needed
		},
		animations: {},
		metadata: {},
	};
}

/** Build a track object matching the Track interface in empty-state.ts */
function makeTrack(type: string, itemIds: string[]) {
	return {
		id: generateId(),
		type,
		name: type === "audio" ? "Audio Track" : "Main Track",
		items: itemIds,
		accepts:
			type === "audio"
				? ["audio"]
				: [
						"video",
						"image",
						"audio",
						"text",
						"caption",
						"template",
						"composition",
					],
		magnetic: false,
		static: false,
	};
}

// ─── Beat detection ───────────────────────────────────────────────────────────

const BEAT_PROMPT = `
You are a music analysis assistant. Analyze this audio track carefully.
Return ONLY valid JSON (no markdown, no extra text).
All timestamps must be in SECONDS as floats.

Task: Detect the beat/rhythm timestamps in this audio.

Return JSON:
{
  "bpm": 120,
  "beats": [0.0, 0.5, 1.0, 1.5]
}

Rules:
- "beats" is an array of timestamps (in seconds) where each beat falls
- Include every beat from start to end
- "bpm" is the estimated tempo in beats per minute
- If the audio has no clear beat, return { "bpm": 0, "beats": [] }
`.trim();

async function detectBeats(url: string): Promise<number[]> {
	try {
		const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);

		const contentType = response.headers.get("content-type") || "audio/mpeg";
		const buffer = await response.arrayBuffer();
		const sizeMB = buffer.byteLength / (1024 * 1024);

		if (sizeMB > 20) {
			logger.warn(
				`[auto-arrange] Audio ${sizeMB.toFixed(1)} MB > 20 MB — skipping beat sync`,
			);
			return [];
		}

		const base64 = Buffer.from(buffer).toString("base64");
		const client = getGeminiClient();

		const result = await client.models.generateContent({
			model: "gemini-2.5-flash",
			contents: [
				{
					role: "user",
					parts: [
						{ inlineData: { mimeType: contentType, data: base64 } },
						{ text: BEAT_PROMPT },
					],
				},
			],
		});

		const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
		const parsed = parseJsonResponse<{ bpm: number; beats: number[] }>(rawText);
		const beats = (parsed?.beats ?? []).filter(
			(b) => typeof b === "number" && b >= 0,
		);
		logger.log(
			`[auto-arrange] Beat detection: ${beats.length} beats at ${parsed?.bpm ?? 0} BPM`,
		);
		return beats;
	} catch (err) {
		logger.error("[auto-arrange] Beat detection error:", err);
		return [];
	}
}

/** Snap a timestamp (ms) to the nearest beat (ms array), within tolerance */
function snapToNearestBeat(
	ms: number,
	beatMs: number[],
	toleranceMs = 400,
): number {
	if (beatMs.length === 0) return ms;
	let closest = ms;
	let minDiff = Infinity;
	for (const b of beatMs) {
		const diff = Math.abs(b - ms);
		if (diff < minDiff) {
			minDiff = diff;
			closest = b;
		}
	}
	return minDiff <= toleranceMs ? closest : ms;
}

// ─── Main assembler ───────────────────────────────────────────────────────────

const IMAGE_DISPLAY_MS = 4_000;

/**
 * Assemble a complete, valid editor_state from uploaded assets.
 *
 * The returned object passes validateEditorState() and can be saved
 * directly to the DB and loaded by the editor without any transformation.
 */
export async function autoArrangeAssets(
	assets: AssetInput[],
	fps = 30,
	size = { width: 1080, height: 1920 },
): Promise<Record<string, unknown>> {
	const videos = assets.filter((a) => a.type === "video");
	const images = assets.filter((a) => a.type === "image");
	const audios = assets.filter((a) => a.type === "audio");

	const trackItemsMap: Record<string, unknown> = {};
	const mainTrackItemIds: string[] = [];
	let cursor = 0; // ms

	// ── Beat detection from first audio asset (runs in parallel with video AI) ──
	const beatMsPromise =
		audios.length > 0
			? detectBeats(audios[0].url)
			: Promise.resolve([] as number[]);

	// ── Videos: AI scene detection + transcription, run in parallel ─────────────
	const [videoResults, beatTimestampsSecs] = await Promise.all([
		Promise.all(
			videos.map(async (asset) => {
				const fallbackMs = asset.durationMs ?? 10_000;
				const [rawSegments, transcriptWords] = await Promise.all([
					analyseVideoScenes(asset.url, fallbackMs),
					transcribeVideo(asset.url),
				]);
				const segments = selectBestSegments(rawSegments, fallbackMs);
				return { asset, segments, transcriptWords };
			}),
		),
		beatMsPromise,
	]);

	// Convert beat seconds to ms array for snapping
	const beatMs = beatTimestampsSecs.map((b) => Math.round(b * 1000));

	// Words for caption track — collected as we place video clips
	const allCaptionWords: Array<TranscriptWord & { displayOffsetMs: number }> =
		[];

	for (const { asset, segments, transcriptWords } of videoResults) {
		const w = asset.width ?? size.width;
		const h = asset.height ?? size.height;

		for (const seg of segments) {
			const trimFromMs = Math.round(seg.start * 1000);
			const trimToMs = Math.round(seg.end * 1000);
			const clipMs = trimToMs - trimFromMs;
			if (clipMs < 500) continue;

			// Snap the clip start to the nearest beat if audio beats available
			const snappedStart = snapToNearestBeat(cursor, beatMs);
			const gap = snappedStart - cursor;
			// Only apply snap if it doesn't create a large gap (> 1 beat ~500ms)
			const displayStart = gap >= 0 && gap < 600 ? snappedStart : cursor;

			// Offset transcript words that fall within this segment
			const segWords = transcriptWords.filter(
				(tw) => tw.start >= seg.start && tw.end <= seg.end,
			);
			for (const tw of segWords) {
				allCaptionWords.push({
					...tw,
					start: tw.start - seg.start + displayStart / 1000,
					end: tw.end - seg.start + displayStart / 1000,
					displayOffsetMs: displayStart,
				});
			}

			const id = generateId();
			trackItemsMap[id] = makeVideoItem(
				id,
				asset.url,
				displayStart,
				displayStart + clipMs,
				trimFromMs,
				trimToMs,
				w,
				h,
			);
			mainTrackItemIds.push(id);
			cursor = displayStart + clipMs;
		}
	}

	// ── Images: 4 s each ─────────────────────────────────────────────────────
	for (const asset of images) {
		const w = asset.width ?? size.width;
		const h = asset.height ?? size.height;
		const id = generateId();
		trackItemsMap[id] = makeImageItem(
			id,
			asset.url,
			cursor,
			cursor + IMAGE_DISPLAY_MS,
			w,
			h,
		);
		mainTrackItemIds.push(id);
		cursor += IMAGE_DISPLAY_MS;
	}

	const totalVideoDurationMs = cursor;

	// ── Build track list ──────────────────────────────────────────────────────
	const tracks: ReturnType<typeof makeTrack>[] = [];

	// Always include a main video track (even if empty, editor expects one)
	tracks.push(makeTrack("video", mainTrackItemIds));

	// Audio tracks
	const audioTrackItemIds: string[] = [];
	for (const asset of audios) {
		const audioDurationMs = asset.durationMs ?? totalVideoDurationMs;
		const displayTo =
			totalVideoDurationMs > 0 ? totalVideoDurationMs : audioDurationMs;
		const trimTo = Math.min(audioDurationMs, displayTo);
		const id = generateId();
		trackItemsMap[id] = makeAudioItem(id, asset.url, 0, displayTo, 0, trimTo);
		audioTrackItemIds.push(id);
	}
	if (audioTrackItemIds.length > 0) {
		tracks.push(makeTrack("audio", audioTrackItemIds));
	}

	// ── Caption track (only if transcription produced words) ─────────────────
	const captionTrackItemIds: string[] = [];
	if (allCaptionWords.length > 0) {
		const captionLines = groupIntoCaptions(allCaptionWords);
		for (const line of captionLines) {
			const id = generateId();
			const fromMs = Math.round(line.start * 1000);
			const toMs = Math.round(line.end * 1000);
			trackItemsMap[id] = makeCaptionItem(
				id,
				line.text,
				line.words,
				fromMs,
				toMs,
				size.width,
			);
			captionTrackItemIds.push(id);
		}
		if (captionTrackItemIds.length > 0) {
			tracks.push({
				id: generateId(),
				type: "caption",
				name: "Captions",
				items: captionTrackItemIds,
				accepts: ["caption"],
				magnetic: false,
				static: false,
			});
		}
	}

	// Full flat list of all item IDs (required by validateEditorState)
	const trackItemIds = [
		...mainTrackItemIds,
		...audioTrackItemIds,
		...captionTrackItemIds,
	];

	// Minimum duration: max of video content vs first audio, at least 1 s
	const audioDuration = audios[0]?.durationMs ?? 0;
	const finalDuration = Math.max(totalVideoDurationMs, audioDuration, 1_000);

	return {
		id: generateId(), // ← required by validateEditorState
		fps,
		size,
		duration: finalDuration,
		tracks,
		trackItemIds,
		transitionIds: [],
		transitionsMap: {},
		trackItemsMap,
	};
}
