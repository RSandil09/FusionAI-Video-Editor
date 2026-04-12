/**
 * parse-intent.ts
 *
 * Converts a free-text user prompt ("extract the highlights, remove silences,
 * keep it under 90 seconds for TikTok") into a structured ParsedIntent object
 * that the auto-arrange pipeline can act on.
 *
 * Uses a single text-only Gemini call — fast, cheap, and runs before any
 * video processing begins.
 */

import { logger } from "@/lib/logger";
import { getGeminiClient, parseJsonResponse } from "./gemini";

// ─── Public types ─────────────────────────────────────────────────────────────

export type EditingMode =
  | "highlight_reel"  // keep only the best moments
  | "full_edit"       // complete edit, all footage used
  | "clip_extract"    // pull specific named clips out
  | "podcast_cut"     // speech-focused, remove off-topic tangents
  | "auto";           // no clear instruction — use smart defaults

export type CaptionStyle = "clean" | "bold" | "minimal";

export type TargetPlatform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "generic";

export interface ParsedIntent {
  /** The raw user prompt, preserved for logging and downstream prompts */
  userPrompt: string;

  /** High-level editing mode inferred from the prompt */
  mode: EditingMode;

  // ── Cutting rules ────────────────────────────────────────────────────────
  /** If true, only AI-detected highlight moments are placed on the timeline */
  keepOnlyHighlights: boolean;

  /** If true, silent gaps between words are removed from clips */
  removeSilence: boolean;

  /** Cap the total output duration in ms. null = no cap */
  maxOutputDurationMs: number | null;

  /** Maximum number of video clips on the main track. null = no cap */
  maxClipCount: number | null;

  // ── Caption rules ────────────────────────────────────────────────────────
  /** Visual style for generated captions */
  captionStyle: CaptionStyle;

  /** BCP-47 language code for transcription hint */
  captionLanguage: string;

  /**
   * Proper nouns, brand names, or technical terms the user mentioned.
   * Injected into the transcription prompt so Gemini spells them correctly.
   */
  captionKeywords: string[];

  // ── Content targeting ────────────────────────────────────────────────────
  /** What the user explicitly wants kept (e.g. "laugh", "product demo") */
  targetMoments: string[];

  /** What the user wants removed (e.g. "silence", "off-topic tangents") */
  avoidMoments: string[];

  // ── Platform ─────────────────────────────────────────────────────────────
  targetPlatform: TargetPlatform;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_INTENT: ParsedIntent = {
  userPrompt: "",
  mode: "auto",
  keepOnlyHighlights: false,
  removeSilence: false,
  maxOutputDurationMs: null,
  maxClipCount: null,
  captionStyle: "clean",
  captionLanguage: "en",
  captionKeywords: [],
  targetMoments: [],
  avoidMoments: [],
  targetPlatform: "generic",
};

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildParsePrompt(
  userPrompt: string,
  assetNames: string[],
  totalDurationSecs: number,
): string {
  return `
You are a video editing AI. Parse the user's editing instruction into a structured JSON object.

User prompt: "${userPrompt}"
Uploaded files: ${assetNames.length > 0 ? assetNames.join(", ") : "not specified"}
Total footage: ${totalDurationSecs} seconds

Return ONLY valid JSON — no markdown, no explanation:

{
  "mode": "highlight_reel" | "full_edit" | "clip_extract" | "podcast_cut" | "auto",
  "keepOnlyHighlights": boolean,
  "removeSilence": boolean,
  "maxOutputDurationMs": number | null,
  "maxClipCount": number | null,
  "captionStyle": "clean" | "bold" | "minimal",
  "captionLanguage": "en" | "es" | "fr" | "de" | "ja" | "ko" | "zh" | "pt" | "ar" | "it",
  "captionKeywords": string[],
  "targetMoments": string[],
  "avoidMoments": string[],
  "targetPlatform": "youtube" | "tiktok" | "instagram" | "generic"
}

Field rules:
- mode:
    "highlight_reel" → user wants best/engaging moments only
    "full_edit"      → user wants all footage used
    "clip_extract"   → user wants specific clips pulled out by name/topic
    "podcast_cut"    → speech-focused edit, remove tangents
    "auto"           → unclear or no instruction

- keepOnlyHighlights: true if prompt says "highlights", "best parts", "engaging", "exciting", "interesting moments", "cut to the good stuff"

- removeSilence: true if prompt says "remove silence", "cut pauses", "no dead air", "tighten", "remove filler", "no um/uh"

- maxOutputDurationMs: parse explicit durations:
    "under 60 seconds" → 60000
    "3 minutes"        → 180000
    "90 sec"           → 90000
    "keep it short"    → 60000
    null if not mentioned

- maxClipCount: parse if prompt says "top 5 clips", "3 best moments" → 5 or 3; null otherwise

- captionStyle:
    "bold"    → TikTok, Instagram Reels, high-energy content
    "clean"   → YouTube, tutorials, professional
    "minimal" → corporate, B2B, subtle

- captionKeywords: extract proper nouns, product names, brand names, technical terms from the prompt
    Example: "review my iPhone 16 Pro video" → ["iPhone", "16 Pro"]

- targetMoments: extract what to include
    Example: "keep the funny parts and the product demo" → ["funny", "product demo"]

- avoidMoments: extract what to remove
    Example: "cut out the intro and any silence" → ["intro", "silence"]

- targetPlatform:
    "tiktok"    → mentions TikTok, vertical, short-form
    "instagram" → mentions Instagram, Reels, Stories
    "youtube"   → mentions YouTube, long-form
    "generic"   → unspecified
`.trim();
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Parse a free-text editing prompt into a structured ParsedIntent.
 *
 * Always resolves — returns DEFAULT_INTENT on any error so the pipeline
 * never hard-fails due to intent parsing.
 */
export async function parseUserIntent(
  userPrompt: string,
  assetNames: string[] = [],
  totalDurationMs = 0,
): Promise<ParsedIntent> {
  const trimmed = userPrompt.trim();
  if (!trimmed) return { ...DEFAULT_INTENT };

  try {
    const client = getGeminiClient();
    const totalDurationSecs = Math.round(totalDurationMs / 1000);

    const result = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: buildParsePrompt(trimmed, assetNames, totalDurationSecs) }],
        },
      ],
    });

    const rawText =
      result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    type RawIntent = Omit<ParsedIntent, "userPrompt">;
    const parsed = parseJsonResponse<RawIntent>(rawText);

    if (!parsed) {
      logger.warn("[parse-intent] Gemini returned unparseable JSON, using defaults");
      return { ...DEFAULT_INTENT, userPrompt: trimmed };
    }

    // Sanitise every field so callers never see undefined
    const intent: ParsedIntent = {
      userPrompt: trimmed,
      mode: isEditingMode(parsed.mode) ? parsed.mode : "auto",
      keepOnlyHighlights: Boolean(parsed.keepOnlyHighlights),
      removeSilence: Boolean(parsed.removeSilence),
      maxOutputDurationMs:
        typeof parsed.maxOutputDurationMs === "number" && parsed.maxOutputDurationMs > 0
          ? parsed.maxOutputDurationMs
          : null,
      maxClipCount:
        typeof parsed.maxClipCount === "number" && parsed.maxClipCount > 0
          ? parsed.maxClipCount
          : null,
      captionStyle: isCaptionStyle(parsed.captionStyle) ? parsed.captionStyle : "clean",
      captionLanguage:
        typeof parsed.captionLanguage === "string" && parsed.captionLanguage
          ? parsed.captionLanguage
          : "en",
      captionKeywords: sanitiseStringArray(parsed.captionKeywords),
      targetMoments: sanitiseStringArray(parsed.targetMoments),
      avoidMoments: sanitiseStringArray(parsed.avoidMoments),
      targetPlatform: isTargetPlatform(parsed.targetPlatform)
        ? parsed.targetPlatform
        : "generic",
    };

    logger.log(
      `[parse-intent] mode=${intent.mode} highlights=${intent.keepOnlyHighlights} ` +
        `silence=${intent.removeSilence} platform=${intent.targetPlatform} ` +
        `maxDuration=${intent.maxOutputDurationMs} maxClips=${intent.maxClipCount}`,
    );

    return intent;
  } catch (err) {
    logger.error("[parse-intent] Error calling Gemini:", err);
    return { ...DEFAULT_INTENT, userPrompt: trimmed };
  }
}

// ─── Type guards ──────────────────────────────────────────────────────────────

function isEditingMode(v: unknown): v is EditingMode {
  return (
    v === "highlight_reel" ||
    v === "full_edit" ||
    v === "clip_extract" ||
    v === "podcast_cut" ||
    v === "auto"
  );
}

function isCaptionStyle(v: unknown): v is CaptionStyle {
  return v === "clean" || v === "bold" || v === "minimal";
}

function isTargetPlatform(v: unknown): v is TargetPlatform {
  return (
    v === "youtube" || v === "tiktok" || v === "instagram" || v === "generic"
  );
}

function sanitiseStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}
