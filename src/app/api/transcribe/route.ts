import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { transcribeSchema, parseBody } from "@/lib/api-validation";

/**
 * POST /api/transcribe
 * Transcribes audio/video using Gemini with word-level timestamps.
 *
 * Strategy:
 *  - Files < FILE_UPLOAD_THRESHOLD → inline base64 (fast, small files)
 *  - Files >= FILE_UPLOAD_THRESHOLD → Gemini Files API (better quality for long/large media)
 *
 * Post-processing:
 *  - Timestamps are shifted earlier by TIMESTAMP_CALIBRATION_S to compensate for
 *    Gemini's tendency to mark the END of word pronunciation rather than the START.
 *  - Timestamps are validated for monotonicity and clamped to [0, ∞).
 *
 * Required env var: GEMINI_API_KEY
 * Requires authentication.
 * Rate limit: 20 requests/hour per user.
 */

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

/** Files larger than this use the Files API instead of inline base64. */
const FILE_UPLOAD_THRESHOLD = 4 * 1024 * 1024; // 4 MB

/**
 * Shift all word timestamps this many seconds EARLIER to compensate for
 * Gemini marking when words END rather than START.
 * 150 ms is a good default; users can fine-tune via the UI offset slider.
 */
const TIMESTAMP_CALIBRATION_S = 0.15;

/** Maximum time to wait for the Files API to finish processing a file. */
const FILE_PROCESSING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const TRANSCRIPTION_PROMPT = (targetLanguage: string) => `
You are a professional speech transcription service specializing in precise word-level timestamps.

CRITICAL TIMING RULES — read carefully:
1. "start" is the EXACT moment the speaker BEGINS pronouncing the word (lips open / first sound)
2. "end" is when the speaker FINISHES the word
3. Timestamps are in SECONDS from the very start of the audio/video (t=0.0)
4. When in doubt, timestamp EARLIER rather than later — it is better to show the word slightly early than late
5. Timestamps must be strictly non-decreasing: each word's "start" must be >= the previous word's "end"
6. Never include negative timestamps

Return ONLY valid JSON — no markdown fences, no extra text — matching this exact schema:
{
  "results": {
    "main": {
      "words": [
        { "word": "Hello", "start": 0.52, "end": 0.81, "confidence": 0.97 },
        { "word": "world", "start": 0.85, "end": 1.12, "confidence": 0.95 }
      ]
    }
  }
}

Additional rules:
- Include every spoken word including fillers (um, uh, hmm, like)
- "confidence" ranges 0.0–1.0; use lower values when uncertain
- For silences/pauses: simply leave a gap between the previous word's "end" and the next word's "start"
- Target transcription language: ${targetLanguage}
- Do NOT invent words that are not spoken
`.trim();

export async function POST(request: Request) {
	const user = await requireAuth();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const rl = await checkRateLimit(
		`transcribe:${user.id}`,
		RATE_LIMIT,
		RATE_WINDOW_MS,
	);
	if (!rl.success) {
		return NextResponse.json(
			{ error: "Rate limit exceeded. Try again later." },
			{ status: 429, headers: { "Retry-After": String(rl.resetIn) } },
		);
	}

	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		return NextResponse.json(
			{
				error:
					"GEMINI_API_KEY is not set. Add it to .env.local → GEMINI_API_KEY=your_key",
				detail: "Get a free key at https://aistudio.google.com/",
			},
			{ status: 503 },
		);
	}

	let rawBody: unknown;
	try {
		rawBody = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const parsed = parseBody(rawBody, transcribeSchema);
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error }, { status: 400 });
	}
	const { url: mediaUrl, targetLanguage } = parsed.data;

	// ── Resolve URL ─────────────────────────────────────────────────────────────
	let absoluteMediaUrl = mediaUrl;
	if (mediaUrl.startsWith("/")) {
		const baseUrl = new URL(request.url);
		absoluteMediaUrl = `${baseUrl.origin}${mediaUrl}`;
	} else if (
		!mediaUrl.startsWith("http://") &&
		!mediaUrl.startsWith("https://")
	) {
		return NextResponse.json(
			{ error: "Invalid url: must be absolute or relative path" },
			{ status: 400 },
		);
	}

	// Unwrap video-proxy to fetch R2 directly
	try {
		const parsedMedia = new URL(absoluteMediaUrl);
		const requestOrigin = new URL(request.url).origin;
		if (
			`${parsedMedia.protocol}//${parsedMedia.host}` === requestOrigin &&
			parsedMedia.pathname === "/api/video-proxy"
		) {
			const proxiedUrl = parsedMedia.searchParams.get("url");
			if (
				proxiedUrl &&
				(proxiedUrl.startsWith("http://") || proxiedUrl.startsWith("https://"))
			) {
				absoluteMediaUrl = proxiedUrl;
			}
		}
	} catch {
		// ignore
	}

	// ── SSRF prevention ──────────────────────────────────────────────────────────
	try {
		const parsedHost = new URL(absoluteMediaUrl);
		const requestHost = new URL(request.url).hostname.toLowerCase();
		const host = parsedHost.hostname.toLowerCase();
		if (host !== requestHost) {
			const blocked =
				host === "localhost" ||
				host === "127.0.0.1" ||
				host === "0.0.0.0" ||
				host.startsWith("169.254.") ||
				host.startsWith("10.") ||
				/^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
				host.startsWith("192.168.");
			if (blocked) {
				return NextResponse.json(
					{ error: "Invalid url: internal addresses not allowed" },
					{ status: 400 },
				);
			}
		}
	} catch {
		return NextResponse.json({ error: "Invalid url format" }, { status: 400 });
	}

	logger.log(
		`🎙️  Transcribing: ${absoluteMediaUrl.slice(0, 80)}… (lang: ${targetLanguage})`,
	);

	try {
		// ── 1. Fetch the media file ────────────────────────────────────────────────
		const mediaRes = await fetch(absoluteMediaUrl, {
			signal: AbortSignal.timeout(120_000),
		});
		if (!mediaRes.ok) {
			throw new Error(
				`Failed to fetch media (${mediaRes.status}): ${absoluteMediaUrl}`,
			);
		}

		const contentType =
			mediaRes.headers.get("content-type") || "audio/mpeg";
		const mediaBuffer = await mediaRes.arrayBuffer();
		const fileSizeBytes = mediaBuffer.byteLength;

		logger.log(
			`📦 Media size: ${(fileSizeBytes / 1024 / 1024).toFixed(2)} MB, type: ${contentType}`,
		);

		const ai = new GoogleGenAI({ apiKey });
		const prompt = TRANSCRIPTION_PROMPT(targetLanguage);

		let transcriptionData: {
			results: { main: { words: { word: string; start: number; end: number; confidence: number }[] } };
		};

		if (fileSizeBytes >= FILE_UPLOAD_THRESHOLD) {
			// ── 2a. Large file → Gemini Files API ───────────────────────────────────
			logger.log("📤 Using Gemini Files API (large file)…");

			const blob = new Blob([mediaBuffer], { type: contentType });
			let uploadedFile = await ai.files.upload({
				file: blob,
				config: { mimeType: contentType, displayName: "transcription-media" },
			});

			logger.log(
				`⏳ File uploaded (${uploadedFile.name}), state: ${uploadedFile.state}`,
			);

			// Poll until the file is ready
			const deadline = Date.now() + FILE_PROCESSING_TIMEOUT_MS;
			while (uploadedFile.state === "PROCESSING") {
				if (Date.now() > deadline) {
					await ai.files
						.delete({ name: uploadedFile.name! })
						.catch(() => {});
					throw new Error(
						"File processing timed out. Try a shorter clip or smaller file.",
					);
				}
				await new Promise((r) => setTimeout(r, 3000));
				uploadedFile = await ai.files.get({ name: uploadedFile.name! });
			}

			if (uploadedFile.state === "FAILED") {
				throw new Error(
					"Gemini could not process this media file. Try a different format.",
				);
			}

			logger.log("✅ File ready, sending to Gemini for transcription…");

			const result = await ai.models.generateContent({
				model: "gemini-2.5-flash",
				contents: [
					{
						role: "user",
						parts: [
							{
								fileData: {
									fileUri: uploadedFile.uri!,
									mimeType: contentType,
								},
							},
							{ text: prompt },
						],
					},
				],
			});

			// Delete the uploaded file — we no longer need it
			await ai.files.delete({ name: uploadedFile.name! }).catch(() => {});

			const rawText =
				result.candidates?.[0]?.content?.parts?.[0]?.text || "";
			transcriptionData = parseGeminiResponse(rawText);
		} else {
			// ── 2b. Small file → inline base64 ──────────────────────────────────────
			logger.log("📤 Using inline base64 (small file)…");

			const base64Data = Buffer.from(mediaBuffer).toString("base64");

			const result = await ai.models.generateContent({
				model: "gemini-2.5-flash",
				contents: [
					{
						role: "user",
						parts: [
							{
								inlineData: { mimeType: contentType, data: base64Data },
							},
							{ text: prompt },
						],
					},
				],
			});

			const rawText =
				result.candidates?.[0]?.content?.parts?.[0]?.text || "";
			transcriptionData = parseGeminiResponse(rawText);
		}

		// ── 3. Validate & calibrate timestamps ──────────────────────────────────
		const rawWords = transcriptionData.results.main.words;
		const calibratedWords = calibrateTimestamps(rawWords, TIMESTAMP_CALIBRATION_S);

		logger.log(`✅ Transcribed ${calibratedWords.length} words (calibrated by -${TIMESTAMP_CALIBRATION_S * 1000}ms)`);

		const output = {
			results: { main: { words: calibratedWords } },
		};

		// ── 4. Return as a JSON data-URL ─────────────────────────────────────────
		const jsonDataUrl = `data:application/json;base64,${Buffer.from(
			JSON.stringify(output),
		).toString("base64")}`;

		return NextResponse.json({ transcribe: { url: jsonDataUrl } });
	} catch (error: any) {
		logger.error("❌ Transcription error:", error.message);
		return NextResponse.json(
			{ error: `Transcription failed: ${error.message}` },
			{ status: 500 },
		);
	}
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseGeminiResponse(rawText: string): {
	results: { main: { words: { word: string; start: number; end: number; confidence: number }[] } };
} {
	const cleaned = rawText
		.replace(/```json\s*/gi, "")
		.replace(/```\s*/gi, "")
		.trim();

	let data: any;
	try {
		data = JSON.parse(cleaned);
	} catch {
		logger.error("❌ Failed to parse Gemini response:", cleaned.slice(0, 500));
		const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			data = JSON.parse(jsonMatch[0]);
		} else {
			throw new Error(
				"Gemini did not return valid JSON. Response: " +
					rawText.slice(0, 200),
			);
		}
	}

	if (!data?.results?.main?.words) {
		throw new Error("Unexpected transcription format from Gemini");
	}

	return data;
}

/**
 * Calibrate word timestamps:
 * 1. Shift all start/end values EARLIER by `calibrationS` seconds to compensate
 *    for Gemini timing words at their end rather than start.
 * 2. Clamp all values to [0, Infinity).
 * 3. Enforce monotonicity (each start >= previous end).
 */
function calibrateTimestamps(
	words: { word: string; start: number; end: number; confidence: number }[],
	calibrationS: number,
): { word: string; start: number; end: number; confidence: number }[] {
	if (!words.length) return words;

	let prevEnd = 0;
	return words.map((w) => {
		const start = Math.max(0, (w.start ?? 0) - calibrationS);
		const end = Math.max(start + 0.01, (w.end ?? w.start + 0.1) - calibrationS);

		// Enforce monotonicity: start must be >= previous word's end
		const safeStart = Math.max(start, prevEnd);
		const safeEnd = Math.max(safeStart + 0.01, end);
		prevEnd = safeEnd;

		return {
			word: w.word,
			start: Math.round(safeStart * 1000) / 1000,
			end: Math.round(safeEnd * 1000) / 1000,
			confidence: w.confidence ?? 0.9,
		};
	});
}
