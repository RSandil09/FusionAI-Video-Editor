import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { requireAuth } from "@/lib/auth/require-auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { transcribeSchema, parseBody } from "@/lib/api-validation";

/**
 * POST /api/transcribe
 * Transcribes audio/video using Gemini 1.5 Flash with word-level timestamps.
 * Returns { transcribe: { url: string } } where url is a JSON data-URL.
 *
 * Required env var: GEMINI_API_KEY
 * Requires authentication.
 * Rate limit: 20 requests/hour per user.
 */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

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

	// Resolve relative URLs (e.g. /api/video-proxy?url=...) to absolute for server-side fetch
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

	// When mediaUrl points to our video-proxy, extract the underlying URL and fetch directly.
	// (video-proxy requires auth; transcribe runs server-side and can fetch R2 directly)
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
		// ignore, use absoluteMediaUrl as-is
	}

	// SSRF prevention: block internal/private URLs (except same-origin, e.g. /api/video-proxy)
	try {
		const parsed = new URL(absoluteMediaUrl);
		const requestHost = new URL(request.url).hostname.toLowerCase();
		const host = parsed.hostname.toLowerCase();

		// Allow same-origin (our own /api/video-proxy, etc.)
		if (host === requestHost) {
			// OK
		} else if (
			host === "localhost" ||
			host === "127.0.0.1" ||
			host === "0.0.0.0" ||
			host.startsWith("169.254.") ||
			host.startsWith("10.") ||
			host.startsWith("172.16.") ||
			host.startsWith("172.17.") ||
			host.startsWith("172.18.") ||
			host.startsWith("172.19.") ||
			host.startsWith("172.2") ||
			host.startsWith("172.30.") ||
			host.startsWith("172.31.") ||
			host.startsWith("192.168.")
		) {
			return NextResponse.json(
				{ error: "Invalid url: internal addresses not allowed" },
				{ status: 400 },
			);
		}
	} catch {
		return NextResponse.json({ error: "Invalid url format" }, { status: 400 });
	}

	logger.log(
		`🎙️  Transcribing: ${absoluteMediaUrl.slice(0, 80)}… (lang: ${targetLanguage})`,
	);

	try {
		// ── 1. Fetch the media file ────────────────────────────────────────────
		const mediaRes = await fetch(absoluteMediaUrl, {
			signal: AbortSignal.timeout(60_000),
		});
		if (!mediaRes.ok) {
			throw new Error(
				`Failed to fetch media (${mediaRes.status}): ${absoluteMediaUrl}`,
			);
		}

		const contentType = mediaRes.headers.get("content-type") || "audio/mpeg";
		const mediaBuffer = await mediaRes.arrayBuffer();
		const base64Data = Buffer.from(mediaBuffer).toString("base64");

		// ── 2. Send to Gemini for transcription ────────────────────────────────
		const ai = new GoogleGenAI({ apiKey });

		const prompt = `
You are a professional transcription service. Transcribe ALL speech in this audio/video.
Provide word-level timestamps as accurately as possible.

Return ONLY valid JSON matching exactly this schema (no markdown, no extra text):
{
  "results": {
    "main": {
      "words": [
        { "word": "hello", "start": 0.50, "end": 0.80, "confidence": 0.95 },
        { "word": "world", "start": 0.85, "end": 1.10, "confidence": 0.98 }
      ]
    }
  }
}

Rules:
- "start" and "end" are in SECONDS (float)
- "confidence" is 0.0–1.0
- Include ALL spoken words, including filler words (um, uh, etc.)
- If you cannot determine exact timestamps, distribute words evenly across the audio duration
- target language hint: ${targetLanguage}
`;

		const result = await ai.models.generateContent({
			model: "gemini-2.5-flash",
			contents: [
				{
					role: "user",
					parts: [
						{
							inlineData: {
								mimeType: contentType,
								data: base64Data,
							},
						},
						{ text: prompt },
					],
				},
			],
		});

		const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
		logger.log(
			"🤖 Gemini raw response (first 300 chars):",
			rawText.slice(0, 300),
		);

		// ── 3. Parse & validate the JSON response ──────────────────────────────
		// Strip any markdown fences in case Gemini adds them
		const cleaned = rawText
			.replace(/```json\s*/gi, "")
			.replace(/```\s*/gi, "")
			.trim();

		let transcriptionData: {
			results: {
				main: {
					words: {
						word: string;
						start: number;
						end: number;
						confidence: number;
					}[];
				};
			};
		};

		try {
			transcriptionData = JSON.parse(cleaned);
		} catch (parseErr) {
			logger.error(
				"❌ Failed to parse Gemini response as JSON:",
				cleaned.slice(0, 500),
			);
			// Fallback: try to extract JSON from the response
			const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				transcriptionData = JSON.parse(jsonMatch[0]);
			} else {
				throw new Error(
					"Gemini did not return valid JSON. Response: " +
						rawText.slice(0, 200),
				);
			}
		}

		// Validate structure
		if (!transcriptionData?.results?.main?.words) {
			throw new Error("Unexpected transcription format from Gemini");
		}

		const wordCount = transcriptionData.results.main.words.length;
		logger.log(`✅ Transcribed ${wordCount} words successfully`);

		// ── 4. Return as a JSON data-URL (avoids R2 storage for transcripts) ──
		const jsonDataUrl = `data:application/json;base64,${Buffer.from(
			JSON.stringify(transcriptionData),
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
