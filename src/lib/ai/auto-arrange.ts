/**
 * Auto-arrange: AI-powered timeline assembly from raw assets.
 *
 * Given a list of uploaded assets (video, image, audio) and an optional
 * ParsedIntent derived from the user's natural-language prompt, this module:
 *
 *  1. Runs Gemini scene detection + transcription in parallel per video
 *  2. When intent.keepOnlyHighlights is set, runs a fast text-only Gemini call
 *     on the transcript to detect the most engaging moments, then filters
 *     segments to only those that overlap with the detected highlights
 *  3. When intent.removeSilence is set, skips caption groups that fall inside
 *     detected silent gaps (gaps > 800 ms between spoken words)
 *  4. Applies intent-driven caption styling (clean / bold / minimal)
 *  5. Caps total output at intent.maxOutputDurationMs if specified
 *  6. Returns a fully-valid editor_state that passes validateEditorState()
 *     and can be dispatched via DESIGN_LOAD without any transformation.
 *
 * IMPORTANT: the shape here must match createEmptyEditorState() exactly —
 * tracks need `accepts`, `magnetic`, `static`; items need `crop` in details;
 * and the state needs a top-level `id`.
 */

import { logger } from "@/lib/logger";
import { generateId } from "@designcombo/timeline";
import { getGeminiClient, parseJsonResponse } from "./gemini";
import { ParsedIntent, DEFAULT_INTENT, CaptionStyle } from "./parse-intent";

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

interface HighlightMoment {
  start: number;  // seconds
  end: number;    // seconds
  reason: string;
  score: number;  // 0–1
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

/**
 * Build the scene-detection prompt, optionally injecting intent context so
 * Gemini scores segments relative to what the user actually wants.
 */
function buildScenePrompt(intent: ParsedIntent): string {
  let intentContext = "";
  if (intent.userPrompt) {
    intentContext += `\nEditing goal: "${intent.userPrompt}"`;
  }
  if (intent.targetMoments.length > 0) {
    intentContext += `\nScore segments that contain ${intent.targetMoments.join(", ")} HIGHER (confidence closer to 1.0).`;
  }
  if (intent.avoidMoments.length > 0) {
    intentContext += `\nScore segments that contain ${intent.avoidMoments.join(", ")} LOWER (confidence closer to 0.0).`;
  }

  return `
You are a professional video editor assistant. Analyze this video carefully.
Return ONLY valid JSON (no markdown, no extra text).
All timestamps must be in SECONDS as floats.
${intentContext}

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
}

/**
 * Build the transcription prompt, injecting keyword hints from the intent so
 * Gemini spells proper nouns and brand names correctly.
 */
function buildTranscribePrompt(intent: ParsedIntent): string {
  let keywordHint = "";
  if (intent.captionKeywords.length > 0) {
    keywordHint = `\nThese terms appear in the video and must be spelled exactly as shown: ${intent.captionKeywords.join(", ")}.`;
  }
  let languageHint = "";
  if (intent.captionLanguage && intent.captionLanguage !== "en") {
    languageHint = `\nThe primary spoken language is "${intent.captionLanguage}" — transcribe in that language.`;
  }

  return `
You are a transcription assistant. Listen to this video and transcribe all spoken words.
Return ONLY valid JSON (no markdown, no extra text).
All timestamps must be in SECONDS as floats.
${keywordHint}${languageHint}

Return JSON:
{
  "words": [
    { "word": "Hello", "start": 0.0, "end": 0.4 },
    { "word": "world", "start": 0.5, "end": 0.9 }
  ]
}

Rules:
- Include every spoken word with its precise start/end time
- Do NOT estimate timestamps — measure them against the audio
- Include filler words (um, uh, like) only if the prompt does not ask to remove them
- If there is no speech, return { "words": [] }
`.trim();
}

// ─── Gemini scene analysis ────────────────────────────────────────────────────

async function analyseVideoScenes(
  url: string,
  fallbackDurationMs: number,
  intent: ParsedIntent,
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
        `[auto-arrange] Video ${sizeMB.toFixed(1)} MB > 20 MB limit — skipping AI scene analysis`,
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
            { text: buildScenePrompt(intent) },
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

// ─── Segment selection ────────────────────────────────────────────────────────

/**
 * Pick the best segments by confidence.
 * Respects intent.maxClipCount (defaults to 4) and the 2–15 s duration window.
 */
function selectBestSegments(
  segments: Segment[],
  videoDurationMs: number,
  intent: ParsedIntent,
): Segment[] {
  if (videoDurationMs <= 12_000 || segments.length <= 1) return segments;

  const maxClips = intent.maxClipCount ?? 4;

  const filtered = segments.filter((s) => {
    const dur = s.end - s.start;
    return dur >= 2 && dur <= 15;
  });
  const pool = filtered.length > 0 ? filtered : segments;

  return [...pool]
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .slice(0, maxClips)
    .sort((a, b) => a.start - b.start);
}

// ─── Highlight detection ──────────────────────────────────────────────────────

/**
 * Send the full transcript (text-only) to Gemini and ask it to identify the
 * most engaging moments that match the user's intent.
 *
 * This is a fast, cheap text-only call — no video bytes involved.
 * Returns an empty array on any failure so the pipeline degrades gracefully.
 */
async function detectHighlightMoments(
  transcriptText: string,
  intent: ParsedIntent,
): Promise<HighlightMoment[]> {
  if (transcriptText.trim().length < 30) return [];

  try {
    const client = getGeminiClient();

    const targetLine =
      intent.targetMoments.length > 0
        ? `Target content: ${intent.targetMoments.join(", ")}.`
        : "";
    const avoidLine =
      intent.avoidMoments.length > 0
        ? `Avoid: ${intent.avoidMoments.join(", ")}.`
        : "";
    const durationLine = intent.maxOutputDurationMs
      ? `Target total output duration: ${intent.maxOutputDurationMs / 1000} seconds.`
      : "";

    const prompt = `
You are a video editor. Identify the most engaging highlight moments in this transcript.

User's editing goal: "${intent.userPrompt}"
${targetLine}
${avoidLine}
${durationLine}

Transcript:
${transcriptText}

Return ONLY valid JSON (no markdown):
{
  "moments": [
    { "start": 12.5, "end": 28.0, "reason": "Key product demo", "score": 0.95 }
  ]
}

Rules:
- Each moment must be 5–45 seconds long
- Include natural sentence boundaries — don't cut in mid-sentence
- "score" is 0.0–1.0 (1.0 = most engaging)
- Timestamps are in SECONDS matching the transcript word times
- Prefer moments with strong emotion, key information, or clear narrative value
- If the transcript has no clear highlights, return { "moments": [] }
`.trim();

    const result = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = parseJsonResponse<{ moments: HighlightMoment[] }>(rawText);

    const moments = (parsed?.moments ?? []).filter(
      (m) =>
        typeof m.start === "number" &&
        typeof m.end === "number" &&
        m.end > m.start,
    );

    logger.log(`[auto-arrange] Highlight detection: ${moments.length} moments found`);
    return moments;
  } catch (err) {
    logger.error("[auto-arrange] Highlight detection error:", err);
    return [];
  }
}

/**
 * Filter segments to only those that overlap with at least one highlight moment.
 * Falls back to the full segment list if nothing overlaps.
 */
function filterByHighlights(
  segments: Segment[],
  highlights: HighlightMoment[],
  scoreThreshold = 0.5,
): Segment[] {
  if (highlights.length === 0) return segments;

  const relevant = segments.filter((seg) =>
    highlights.some(
      (h) =>
        h.score >= scoreThreshold &&
        h.start < seg.end &&
        h.end > seg.start,
    ),
  );

  return relevant.length > 0 ? relevant : segments;
}

// ─── Transcription ────────────────────────────────────────────────────────────

interface TranscriptWord {
  word: string;
  start: number; // seconds
  end: number;   // seconds
}

async function transcribeVideo(
  url: string,
  intent: ParsedIntent,
): Promise<TranscriptWord[]> {
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
            { text: buildTranscribePrompt(intent) },
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

// ─── Silence detection ────────────────────────────────────────────────────────

/**
 * Identify time ranges that are silent (gaps between spoken words
 * exceeding silenceThresholdMs). Returns ranges to KEEP (inverse of gaps).
 */
function getSpeechRanges(
  words: TranscriptWord[],
  silenceThresholdMs = 800,
): Array<{ start: number; end: number }> {
  if (words.length < 2) return [{ start: 0, end: Infinity }];

  const silentGaps: Array<{ start: number; end: number }> = [];

  for (let i = 1; i < words.length; i++) {
    const gapMs = (words[i].start - words[i - 1].end) * 1000;
    if (gapMs > silenceThresholdMs) {
      silentGaps.push({ start: words[i - 1].end, end: words[i].start });
    }
  }

  if (silentGaps.length === 0) return [{ start: 0, end: Infinity }];

  // Invert gaps → keep ranges
  const keepRanges: Array<{ start: number; end: number }> = [];
  let currentStart = 0;
  for (const gap of silentGaps) {
    if (gap.start > currentStart) {
      keepRanges.push({ start: currentStart, end: gap.start });
    }
    currentStart = gap.end;
  }
  keepRanges.push({ start: currentStart, end: Infinity });

  return keepRanges;
}

/**
 * Returns true if the given time range overlaps at least one speech range.
 */
function isInSpeechRange(
  startSecs: number,
  endSecs: number,
  speechRanges: Array<{ start: number; end: number }>,
): boolean {
  return speechRanges.some((r) => r.start < endSecs && r.end > startSecs);
}

// ─── Caption grouping ─────────────────────────────────────────────────────────

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

// ─── Caption style config ─────────────────────────────────────────────────────

const CAPTION_STYLE_CONFIG: Record<
  CaptionStyle,
  { fontSize: number; fontFamily: string; borderWidth: number; color: string; activeColor: string }
> = {
  clean: {
    fontSize: 40,
    fontFamily: "Roboto",
    borderWidth: 4,
    color: "#F8FAFC",
    activeColor: "#0EA5E9",
  },
  bold: {
    fontSize: 56,
    fontFamily: "Roboto",
    borderWidth: 6,
    color: "#FFFFFF",
    activeColor: "#FF6A00",
  },
  minimal: {
    fontSize: 32,
    fontFamily: "Roboto",
    borderWidth: 2,
    color: "#FFFFFF",
    activeColor: "#FFFFFF",
  },
};

// ─── Track item builders ──────────────────────────────────────────────────────

function makeCrop(canvasW: number, canvasH: number) {
  return { x: 0, y: 0, width: canvasW, height: canvasH };
}

function makeCaptionItem(
  id: string,
  text: string,
  words: TranscriptWord[],
  displayFrom: number,
  displayTo: number,
  canvasW: number,
  style: CaptionStyle = "clean",
) {
  const sc = CAPTION_STYLE_CONFIG[style];
  return {
    id,
    type: "caption",
    name: "Caption",
    display: { from: displayFrom, to: displayTo },
    metadata: {},
    details: {
      text,
      width: canvasW,
      fontSize: sc.fontSize,
      fontFamily: sc.fontFamily,
      fontUrl: "",
      textAlign: "center",
      color: sc.color,
      backgroundColor: "transparent",
      borderColor: "#000000",
      borderWidth: sc.borderWidth,
      appearedColor: sc.color,
      activeColor: sc.activeColor,
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
    },
    animations: {},
    metadata: {},
  };
}

function makeTrack(type: string, itemIds: string[]) {
  return {
    id: generateId(),
    type,
    name: type === "audio" ? "Audio Track" : "Main Track",
    items: itemIds,
    accepts:
      type === "audio"
        ? ["audio"]
        : ["video", "image", "audio", "text", "caption", "template", "composition"],
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
 * Pass a ParsedIntent (from parseUserIntent) to drive AI decisions:
 *  - intent.keepOnlyHighlights → filters timeline to detected highlight moments
 *  - intent.removeSilence      → skips captions in silent gaps
 *  - intent.captionStyle       → controls caption font size and weight
 *  - intent.maxOutputDurationMs → caps timeline length
 *  - intent.maxClipCount       → limits number of video clips
 *  - intent.targetMoments      → biases scene confidence scoring
 *  - intent.captionKeywords    → improves transcription accuracy
 *
 * The returned object passes validateEditorState() and can be saved
 * directly to the DB and loaded by the editor without any transformation.
 */
export async function autoArrangeAssets(
  assets: AssetInput[],
  fps = 30,
  size = { width: 1080, height: 1920 },
  intent: ParsedIntent = DEFAULT_INTENT,
): Promise<Record<string, unknown>> {
  const videos = assets.filter((a) => a.type === "video");
  const images = assets.filter((a) => a.type === "image");
  const audios = assets.filter((a) => a.type === "audio");

  const trackItemsMap: Record<string, unknown> = {};
  const mainTrackItemIds: string[] = [];
  let cursor = 0; // ms

  // Beat detection runs in parallel with all video processing
  const beatMsPromise =
    audios.length > 0
      ? detectBeats(audios[0].url)
      : Promise.resolve([] as number[]);

  // ── Videos: scene detection + transcription, parallel per video ─────────────
  const [videoResults, beatTimestampsSecs] = await Promise.all([
    Promise.all(
      videos.map(async (asset) => {
        const fallbackMs = asset.durationMs ?? 10_000;

        // Scene analysis and transcription run in parallel
        const [rawSegments, transcriptWords] = await Promise.all([
          analyseVideoScenes(asset.url, fallbackMs, intent),
          transcribeVideo(asset.url, intent),
        ]);

        // ── Highlight detection (text-only, fast) ──────────────────────────
        // Only runs when user explicitly asked for highlights
        let highlights: HighlightMoment[] = [];
        if (intent.keepOnlyHighlights && transcriptWords.length > 10) {
          const transcriptText = transcriptWords.map((w) => w.word).join(" ");
          highlights = await detectHighlightMoments(transcriptText, intent);
        }

        // Filter segments to highlight windows, then select best
        const highlightFiltered = filterByHighlights(rawSegments, highlights);
        const segments = selectBestSegments(highlightFiltered, fallbackMs, intent);

        // ── Silence map (used later when building caption track) ───────────
        const speechRanges = intent.removeSilence
          ? getSpeechRanges(transcriptWords, 800)
          : [{ start: 0, end: Infinity }];

        return { asset, segments, transcriptWords, speechRanges };
      }),
    ),
    beatMsPromise,
  ]);

  const beatMs = beatTimestampsSecs.map((b) => Math.round(b * 1000));

  // Words for caption track — collected as we place video clips
  const allCaptionWords: Array<TranscriptWord & {
    displayOffsetMs: number;
    speechRanges: Array<{ start: number; end: number }>;
  }> = [];

  for (const { asset, segments, transcriptWords, speechRanges } of videoResults) {
    const w = asset.width ?? size.width;
    const h = asset.height ?? size.height;

    for (const seg of segments) {
      const trimFromMs = Math.round(seg.start * 1000);
      const trimToMs = Math.round(seg.end * 1000);
      const clipMs = trimToMs - trimFromMs;
      if (clipMs < 500) continue;

      // Snap the clip start to the nearest beat if audio beats are available
      const snappedStart = snapToNearestBeat(cursor, beatMs);
      const gap = snappedStart - cursor;
      const displayStart = gap >= 0 && gap < 600 ? snappedStart : cursor;

      // Collect transcript words that fall within this segment
      const segWords = transcriptWords.filter(
        (tw) => tw.start >= seg.start && tw.end <= seg.end,
      );
      for (const tw of segWords) {
        allCaptionWords.push({
          ...tw,
          start: tw.start - seg.start + displayStart / 1000,
          end: tw.end - seg.start + displayStart / 1000,
          displayOffsetMs: displayStart,
          speechRanges,
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

      // Respect maxOutputDurationMs — stop adding clips once we hit the cap
      if (intent.maxOutputDurationMs && cursor >= intent.maxOutputDurationMs) {
        logger.log(
          `[auto-arrange] maxOutputDurationMs cap reached at ${cursor}ms — stopping clip placement`,
        );
        break;
      }
    }

    if (intent.maxOutputDurationMs && cursor >= intent.maxOutputDurationMs) break;
  }

  // ── Images: 4 s each ─────────────────────────────────────────────────────
  for (const asset of images) {
    if (intent.maxOutputDurationMs && cursor >= intent.maxOutputDurationMs) break;

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

  tracks.push(makeTrack("video", mainTrackItemIds));

  // Audio tracks
  const audioTrackItemIds: string[] = [];
  for (const asset of audios) {
    const audioDurationMs = asset.durationMs ?? totalVideoDurationMs;
    const displayTo = totalVideoDurationMs > 0 ? totalVideoDurationMs : audioDurationMs;
    const trimTo = Math.min(audioDurationMs, displayTo);
    const id = generateId();
    trackItemsMap[id] = makeAudioItem(id, asset.url, 0, displayTo, 0, trimTo);
    audioTrackItemIds.push(id);
  }
  if (audioTrackItemIds.length > 0) {
    tracks.push(makeTrack("audio", audioTrackItemIds));
  }

  // ── Caption track ─────────────────────────────────────────────────────────
  const captionTrackItemIds: string[] = [];
  if (allCaptionWords.length > 0) {
    const captionLines = groupIntoCaptions(allCaptionWords);
    const captionStyle = intent.captionStyle ?? "clean";

    for (const line of captionLines) {
      // Skip caption groups that fall entirely in a silence gap
      if (
        intent.removeSilence &&
        !isInSpeechRange(line.start, line.end, line.words[0]
          ? (allCaptionWords.find(
              (w) => w.word === line.words[0].word && Math.abs(w.start - line.words[0].start) < 0.01,
            )?.speechRanges ?? [{ start: 0, end: Infinity }])
          : [{ start: 0, end: Infinity }])
      ) {
        continue;
      }

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
        captionStyle,
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

  const trackItemIds = [
    ...mainTrackItemIds,
    ...audioTrackItemIds,
    ...captionTrackItemIds,
  ];

  const audioDuration = audios[0]?.durationMs ?? 0;
  let finalDuration = Math.max(totalVideoDurationMs, audioDuration, 1_000);

  // Clamp to user-requested max
  if (intent.maxOutputDurationMs && finalDuration > intent.maxOutputDurationMs) {
    finalDuration = intent.maxOutputDurationMs;
  }

  logger.log(
    `[auto-arrange] Complete. Duration: ${finalDuration}ms, ` +
      `clips: ${mainTrackItemIds.length}, captions: ${captionTrackItemIds.length}, ` +
      `mode: ${intent.mode}, highlights: ${intent.keepOnlyHighlights}, silence: ${intent.removeSilence}`,
  );

  return {
    id: generateId(),
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
