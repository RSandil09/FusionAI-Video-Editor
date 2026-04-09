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
	end: number;   // seconds
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
			console.warn(`[auto-arrange] Video ${sizeMB.toFixed(1)} MB > 20 MB limit — skipping AI`);
			return fallback;
		}

		const base64 = Buffer.from(buffer).toString("base64");
		const client = getGeminiClient();

		const result = await client.models.generateContent({
			model: "gemini-2.5-flash",
			contents: [{
				role: "user",
				parts: [
					{ inlineData: { mimeType: contentType, data: base64 } },
					{ text: SCENE_PROMPT },
				],
			}],
		});

		const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
		const parsed = parseJsonResponse<{ segments: Segment[] }>(rawText);
		const segments = (parsed?.segments ?? []).filter(
			(s) => typeof s.start === "number" && typeof s.end === "number" && s.end > s.start,
		);
		return segments.length > 0 ? segments : fallback;
	} catch (err) {
		console.error("[auto-arrange] Scene analysis error:", err);
		return fallback;
	}
}

/** Pick top segments by confidence; cap at 4 clips, each 2–15 s */
function selectBestSegments(segments: Segment[], videoDurationMs: number): Segment[] {
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
	id: string, src: string,
	displayFrom: number, displayTo: number,
	trimFrom: number, trimTo: number,
	canvasW: number, canvasH: number,
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
	id: string, src: string,
	displayFrom: number, displayTo: number,
	canvasW: number, canvasH: number,
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
	id: string, src: string,
	displayFrom: number, displayTo: number,
	trimFrom: number, trimTo: number,
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
		accepts: type === "audio"
			? ["audio"]
			: ["video", "image", "audio", "text", "caption", "template", "composition"],
		magnetic: false,
		static: false,
	};
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

	// ── Videos: AI scene detection, run in parallel ───────────────────────────
	const videoResults = await Promise.all(
		videos.map(async (asset) => {
			const fallbackMs = asset.durationMs ?? 10_000;
			const rawSegments = await analyseVideoScenes(asset.url, fallbackMs);
			const segments = selectBestSegments(rawSegments, fallbackMs);
			return { asset, segments };
		}),
	);

	for (const { asset, segments } of videoResults) {
		const w = asset.width ?? size.width;
		const h = asset.height ?? size.height;

		for (const seg of segments) {
			const trimFromMs = Math.round(seg.start * 1000);
			const trimToMs   = Math.round(seg.end   * 1000);
			const clipMs     = trimToMs - trimFromMs;
			if (clipMs < 500) continue;

			const id = generateId();
			trackItemsMap[id] = makeVideoItem(
				id, asset.url,
				cursor, cursor + clipMs,
				trimFromMs, trimToMs,
				w, h,
			);
			mainTrackItemIds.push(id);
			cursor += clipMs;
		}
	}

	// ── Images: 4 s each ─────────────────────────────────────────────────────
	for (const asset of images) {
		const w = asset.width ?? size.width;
		const h = asset.height ?? size.height;
		const id = generateId();
		trackItemsMap[id] = makeImageItem(
			id, asset.url,
			cursor, cursor + IMAGE_DISPLAY_MS,
			w, h,
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
		const displayTo = totalVideoDurationMs > 0 ? totalVideoDurationMs : audioDurationMs;
		const trimTo    = Math.min(audioDurationMs, displayTo);
		const id = generateId();
		trackItemsMap[id] = makeAudioItem(id, asset.url, 0, displayTo, 0, trimTo);
		audioTrackItemIds.push(id);
	}
	if (audioTrackItemIds.length > 0) {
		tracks.push(makeTrack("audio", audioTrackItemIds));
	}

	// Full flat list of all item IDs (required by validateEditorState)
	const trackItemIds = [
		...mainTrackItemIds,
		...audioTrackItemIds,
	];

	// Minimum duration: max of video content vs first audio, at least 1 s
	const audioDuration = audios[0]?.durationMs ?? 0;
	const finalDuration = Math.max(totalVideoDurationMs, audioDuration, 1_000);

	return {
		id: generateId(),          // ← required by validateEditorState
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
