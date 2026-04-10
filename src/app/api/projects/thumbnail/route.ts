import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { getGeminiClient, parseJsonResponse } from "@/lib/ai/gemini";
import { getR2Client } from "@/lib/r2-client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { bundle } from "@remotion/bundler/dist/bundle";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import os from "os";

/**
 * POST /api/projects/thumbnail
 *
 * Generates an AI-selected thumbnail for a project by:
 * 1. Analysing the project's video clips with Gemini to find the best frame
 * 2. Rendering that frame with Remotion renderStill
 * 3. Uploading to R2 and saving thumbnail_url on the project
 *
 * Request: { projectId: string }
 * Response: { thumbnailUrl: string }
 */
export async function POST(request: NextRequest) {
	try {
		const user = await getUserFromRequest();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		let body: { projectId?: unknown };
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const projectId =
			typeof body.projectId === "string" ? body.projectId : null;
		if (!projectId) {
			return NextResponse.json(
				{ error: "projectId is required" },
				{ status: 400 },
			);
		}

		// 1. Fetch project
		const { data: project, error: fetchErr } = await supabaseAdmin
			.from("projects")
			.select(
				"id, name, editor_state, user_id, frame_rate, resolution_width, resolution_height",
			)
			.eq("id", projectId)
			.eq("user_id", user.id)
			.maybeSingle();

		if (fetchErr || !project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}

		const editorState = project.editor_state as Record<string, any> | null;
		if (!editorState) {
			return NextResponse.json(
				{ error: "Project has no editor state" },
				{ status: 400 },
			);
		}

		const fps = project.frame_rate ?? 30;
		const width = project.resolution_width ?? 1080;
		const height = project.resolution_height ?? 1920;
		const duration = (editorState.duration as number) ?? 10_000;

		// 2. Pick best thumbnail frame via AI
		const bestFrameMs = await pickBestThumbnailFrame(editorState, duration);
		const frameNumber = Math.round((bestFrameMs / 1000) * fps);

		logger.log(
			`[thumbnail] Project ${projectId}: rendering frame ${frameNumber} (${bestFrameMs}ms)`,
		);

		// 3. Bundle + render still
		const bundleLocation = await bundle({
			entryPoint: path.join(process.cwd(), "src/remotion/index.tsx"),
			webpackOverride: (cfg: any) => cfg,
		});

		const composition = await selectComposition({
			serveUrl: bundleLocation,
			id: "VideoComposition",
			inputProps: { editorState },
		});

		const outputPath = path.join(os.tmpdir(), `thumbnail-${projectId}.jpg`);

		await renderStill({
			composition,
			serveUrl: bundleLocation,
			output: outputPath,
			frame: Math.min(frameNumber, composition.durationInFrames - 1),
			inputProps: { editorState },
			imageFormat: "jpeg",
			jpegQuality: 85,
		});

		// 4. Upload to R2
		const imageBuffer = fs.readFileSync(outputPath);
		fs.unlinkSync(outputPath);

		const r2Key = `thumbnails/${user.id}/${projectId}.jpg`;
		const r2Client = getR2Client();
		await r2Client.send(
			new PutObjectCommand({
				Bucket: process.env.R2_BUCKET_NAME,
				Key: r2Key,
				Body: imageBuffer,
				ContentType: "image/jpeg",
			}),
		);

		const thumbnailUrl = `${process.env.R2_PUBLIC_URL}/${r2Key}`;

		// 5. Save thumbnail_url on the project
		await supabaseAdmin
			.from("projects")
			.update({ thumbnail_url: thumbnailUrl })
			.eq("id", projectId);

		logger.log(`[thumbnail] Generated: ${thumbnailUrl}`);
		return NextResponse.json({ thumbnailUrl });
	} catch (error) {
		logger.error("[thumbnail] Error:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Thumbnail generation failed",
			},
			{ status: 500 },
		);
	}
}

/**
 * Ask Gemini to pick the best thumbnail moment from the editor state.
 * Falls back to 15% into the timeline if AI fails.
 */
async function pickBestThumbnailFrame(
	editorState: Record<string, any>,
	durationMs: number,
): Promise<number> {
	const fallback = Math.round(durationMs * 0.15);
	try {
		const trackItemsMap =
			(editorState.trackItemsMap as Record<string, any>) ?? {};
		// Collect video clips with their display times
		const videoClips = Object.values(trackItemsMap)
			.filter((item: any) => item.type === "video")
			.map((item: any) => ({
				src: item.details?.src,
				from: item.display?.from,
				to: item.display?.to,
			}))
			.slice(0, 5); // Limit context size

		if (videoClips.length === 0) return fallback;

		const client = getGeminiClient();
		const prompt = `You are a YouTube thumbnail expert.
Given these video clips in a timeline (timestamps in milliseconds):
${JSON.stringify(videoClips, null, 2)}

Timeline total duration: ${durationMs}ms

Pick the single best moment (in milliseconds) for a YouTube thumbnail.
Choose a visually impactful moment — ideally near the start of an energetic clip.

Return ONLY valid JSON: { "timestampMs": 1500 }`;

		const result = await client.models.generateContent({
			model: "gemini-2.5-flash",
			contents: [{ role: "user", parts: [{ text: prompt }] }],
		});

		const raw = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
		const parsed = parseJsonResponse<{ timestampMs: number }>(raw);

		if (
			typeof parsed?.timestampMs === "number" &&
			parsed.timestampMs >= 0 &&
			parsed.timestampMs < durationMs
		) {
			return parsed.timestampMs;
		}
	} catch (err) {
		logger.error("[thumbnail] Gemini frame selection failed:", err);
	}
	return fallback;
}
