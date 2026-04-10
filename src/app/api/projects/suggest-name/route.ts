import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { getGeminiClient, parseJsonResponse } from "@/lib/ai/gemini";

/**
 * POST /api/projects/suggest-name
 *
 * Uses Gemini to suggest 3 creative project names based on asset filenames.
 *
 * Request: { filenames: string[] }
 * Response: { suggestions: string[] }
 */
export async function POST(request: NextRequest) {
	try {
		const user = await getUserFromRequest();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		let body: { filenames?: unknown };
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const filenames = Array.isArray(body.filenames)
			? (body.filenames as string[])
					.filter((f) => typeof f === "string")
					.slice(0, 20)
			: [];

		if (filenames.length === 0) {
			return NextResponse.json({ suggestions: [] });
		}

		const client = getGeminiClient();
		const prompt = `You are helping a video creator name their new project.
They uploaded these files: ${filenames.map((f) => `"${f}"`).join(", ")}

Based on the file names, suggest exactly 3 short, catchy, creative project names.
Each name should be 2–5 words. No quotes, no numbering, no punctuation at end.

Return ONLY valid JSON: { "suggestions": ["Name One", "Name Two", "Name Three"] }`;

		const result = await client.models.generateContent({
			model: "gemini-2.5-flash",
			contents: [{ role: "user", parts: [{ text: prompt }] }],
		});

		const raw = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
		const parsed = parseJsonResponse<{ suggestions: string[] }>(raw);
		const suggestions = (parsed?.suggestions ?? [])
			.filter((s) => typeof s === "string" && s.trim().length > 0)
			.slice(0, 3);

		return NextResponse.json({ suggestions });
	} catch (error) {
		logger.error("[suggest-name] Error:", error);
		// Non-fatal — client just won't show suggestions
		return NextResponse.json({ suggestions: [] });
	}
}
