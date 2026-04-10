import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";
import { analyzeVideoSchema, parseBody } from "@/lib/api-validation";

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST /api/analyze-video
 * Analyze video for smart editing features using Gemini 1.5 Pro
 *
 * Request: {
 *   videoUrl: string,
 *   analysisType: 'scenes' | 'silences' | 'highlights',
 *   options?: { threshold?: number, minDuration?: number }
 * }
 * Response: {
 *   analysis: {
 *     type: string,
 *     segments: Array<{ start: number, end: number, label?: string, confidence?: number }>
 *   }
 * }
 */
export async function POST(request: NextRequest) {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		return NextResponse.json(
			{
				error: "GEMINI_API_KEY is not set",
				detail: "Add GEMINI_API_KEY to .env.local",
			},
			{ status: 503 },
		);
	}

	try {
		// 1. Authenticate user
		const user = await getUserFromRequest();
		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized - please log in" },
				{ status: 401 },
			);
		}

		const rl = await checkRateLimit(
			`analyze-video:${user.id}`,
			RATE_LIMIT,
			RATE_WINDOW_MS,
		);
		if (!rl.success) {
			return NextResponse.json(
				{ error: "Rate limit exceeded. Try again later." },
				{ status: 429, headers: { "Retry-After": String(rl.resetIn) } },
			);
		}

		// 2. Parse request body
		const body = await request.json();
		const { videoUrl, analysisType, options = {} } = body;

		if (!videoUrl || typeof videoUrl !== "string") {
			return NextResponse.json(
				{ error: "videoUrl is required" },
				{ status: 400 },
			);
		}

		const validTypes = ["scenes", "silences", "highlights"];
		if (!analysisType || !validTypes.includes(analysisType)) {
			return NextResponse.json(
				{ error: `analysisType must be one of: ${validTypes.join(", ")}` },
				{ status: 400 },
			);
		}

		// 3. Resolve video URL for server-side fetch (relative URLs like /api/video-proxy?url=... need absolute base)
		let fetchUrl = videoUrl;
		if (fetchUrl.startsWith("/")) {
			let origin: string;
			try {
				origin = request.nextUrl?.origin ?? new URL(request.url).origin;
			} catch {
				const host = request.headers.get("host") || "localhost:3000";
				const proto = request.headers.get("x-forwarded-proto") || "http";
				origin = `${proto}://${host}`;
			}
			fetchUrl = `${origin}${fetchUrl}`;
		} else if (
			!fetchUrl.startsWith("http://") &&
			!fetchUrl.startsWith("https://")
		) {
			return NextResponse.json(
				{
					error:
						"Invalid videoUrl: must be absolute URL or relative path (e.g. /api/video-proxy?url=...)",
				},
				{ status: 400 },
			);
		}

		// When fetchUrl points to our video-proxy, extract the underlying URL and fetch directly.
		// (video-proxy requires auth; we fetch the R2/external URL directly from server)
		let isOurVideoProxy = false;
		try {
			const parsed = new URL(fetchUrl);
			const requestOrigin = new URL(request.url).origin;
			const sameOrigin =
				`${parsed.protocol}//${parsed.host}` === requestOrigin ||
				parsed.hostname === new URL(request.url).hostname;
			if (sameOrigin && parsed.pathname === "/api/video-proxy") {
				isOurVideoProxy = true;
				const proxiedUrl = parsed.searchParams.get("url");
				if (
					proxiedUrl &&
					(proxiedUrl.startsWith("http://") ||
						proxiedUrl.startsWith("https://"))
				) {
					fetchUrl = proxiedUrl;
				}
			}
		} catch {
			// ignore
		}

		// Build fetch headers - forward auth when hitting our video-proxy (extraction failed)
		const fetchHeaders: HeadersInit = {
			"User-Agent": "Fusion-Video-Editor/1.0",
		};
		if (isOurVideoProxy && fetchUrl.includes("/api/video-proxy")) {
			const auth = request.headers.get("authorization");
			const cookie = request.headers.get("cookie");
			if (auth) fetchHeaders["Authorization"] = auth;
			if (cookie) fetchHeaders["Cookie"] = cookie;
		}

		logger.log(
			`🎬 Analyzing video (${analysisType}) for user ${user.id}: ${fetchUrl.slice(0, 80)}...`,
		);

		// 4. Fetch video and convert to base64
		let videoResponse: Response;
		try {
			videoResponse = await fetch(fetchUrl, {
				headers: fetchHeaders,
				signal: AbortSignal.timeout(120_000),
			});
		} catch (fetchError) {
			const msg =
				fetchError instanceof Error ? fetchError.message : "Unknown error";
			logger.error("Video fetch failed:", msg);
			return NextResponse.json(
				{
					error: `Failed to fetch video: ${msg}. Check that the video URL is accessible.`,
				},
				{ status: 502 },
			);
		}

		if (!videoResponse.ok) {
			return NextResponse.json(
				{
					error: `Video source returned ${videoResponse.status}. The file may be unavailable or restricted.`,
				},
				{ status: 502 },
			);
		}

		const contentType =
			videoResponse.headers.get("content-type") || "video/mp4";
		const videoBuffer = await videoResponse.arrayBuffer();
		const base64Data = Buffer.from(videoBuffer).toString("base64");

		// Check video size (Gemini has limits)
		const videoSizeMB = videoBuffer.byteLength / (1024 * 1024);
		if (videoSizeMB > 20) {
			return NextResponse.json(
				{ error: "Video too large. Maximum size is 20MB for analysis." },
				{ status: 400 },
			);
		}

		// 5. Build analysis prompt based on type
		const prompt = buildAnalysisPrompt(analysisType, options);

		// 6. Call Gemini API
		const ai = new GoogleGenAI({ apiKey });

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
			`🤖 Gemini analysis response (first 300 chars): ${rawText.slice(0, 300)}`,
		);

		// 7. Parse response
		const segments = parseAnalysisResponse(rawText, analysisType);

		logger.log(
			`✅ Analysis complete: found ${segments.length} ${analysisType}`,
		);

		return NextResponse.json({
			analysis: {
				type: analysisType,
				segments,
				videoUrl,
			},
		});
	} catch (error) {
		logger.error("Video analysis error:", error);
		return NextResponse.json(
			{
				error: error instanceof Error ? error.message : "Video analysis failed",
			},
			{ status: 500 },
		);
	}
}

/**
 * Build analysis prompt based on type
 */
function buildAnalysisPrompt(
	analysisType: string,
	options: { threshold?: number; minDuration?: number },
): string {
	const baseInstructions = `
You are a professional video editor assistant. Analyze this video carefully.
Return ONLY valid JSON matching the schema below (no markdown, no extra text).
All timestamps should be in SECONDS (float).
`;

	const schemas: Record<string, string> = {
		scenes: `
${baseInstructions}

Task: Detect all scene changes/cuts in this video.
A scene change is when the visual content changes significantly (cut, transition, fade, etc).

Return JSON:
{
  "segments": [
    { "start": 0.0, "end": 2.5, "label": "Opening shot", "confidence": 0.95 },
    { "start": 2.5, "end": 5.0, "label": "Scene 2", "confidence": 0.92 }
  ]
}

Rules:
- Each segment represents one continuous scene
- "start" is when the scene begins
- "end" is when the scene ends (next cut)
- "label" is a brief description of the scene content
- "confidence" is how certain you are about this cut (0.0-1.0)
- Include ALL scenes from start to end of video
`,

		silences: `
${baseInstructions}

Task: Detect all silent or very quiet segments in this video.
Silent segments have no speech, music, or significant audio.

Return JSON:
{
  "segments": [
    { "start": 5.0, "end": 7.5, "label": "silence", "confidence": 0.90 },
    { "start": 15.0, "end": 16.2, "label": "pause", "confidence": 0.85 }
  ]
}

Rules:
- Only include segments with ${options.minDuration || 0.5}+ seconds of silence
- "start" is when silence begins
- "end" is when sound returns
- "label" can be "silence", "pause", or "quiet"
- "confidence" indicates how certain you are (0.0-1.0)
`,

		highlights: `
${baseInstructions}

Task: Identify the most engaging/interesting moments in this video.
Highlights are moments that would work well for short clips, social media, or teasers.

Return JSON:
{
  "segments": [
    { "start": 10.0, "end": 15.0, "label": "Key moment: speaker makes important point", "confidence": 0.95 },
    { "start": 30.0, "end": 35.0, "label": "Emotional peak", "confidence": 0.88 }
  ]
}

Rules:
- Select the top 3-5 most engaging moments
- Each segment should be 3-15 seconds long
- "label" should describe WHY this is a highlight
- "confidence" indicates engagement potential (0.0-1.0)
- Prioritize: emotional moments, key statements, visual interest, humor
`,
	};

	return schemas[analysisType] || schemas.scenes;
}

/**
 * Parse Gemini response into structured segments
 */
function parseAnalysisResponse(
	rawText: string,
	analysisType: string,
): Array<{ start: number; end: number; label?: string; confidence?: number }> {
	try {
		// Clean up markdown fences if present
		const cleaned = rawText
			.replace(/```json\s*/gi, "")
			.replace(/```\s*/gi, "")
			.trim();

		// Try to parse JSON
		let data: any;
		try {
			data = JSON.parse(cleaned);
		} catch {
			// Try to extract JSON from response
			const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				data = JSON.parse(jsonMatch[0]);
			} else {
				throw new Error("Could not parse JSON from response");
			}
		}

		// Extract segments
		const segments = data.segments || [];

		// Validate and clean segments
		return segments
			.filter(
				(seg: any) =>
					typeof seg.start === "number" &&
					typeof seg.end === "number" &&
					seg.start < seg.end,
			)
			.map((seg: any) => ({
				start: Math.max(0, seg.start),
				end: seg.end,
				label: seg.label || undefined,
				confidence:
					typeof seg.confidence === "number"
						? Math.min(1, Math.max(0, seg.confidence))
						: undefined,
			}));
	} catch (error) {
		logger.error("Failed to parse analysis response:", error);
		return [];
	}
}
