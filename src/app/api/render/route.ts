import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { startLambdaRender } from "@/lib/remotion-lambda-renderer";
import { processAudioEffectsForRender } from "@/lib/ffmpeg-audio-processor";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { createRender, updateRenderStatus } from "@/lib/db/renders";
import { checkRateLimit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/db/supabase-admin";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
	try {
		logger.log("🔵 /api/render POST request received");

		// 1. Authenticate
		const user = await getUserFromRequest();
		if (!user) {
			return NextResponse.json(
				{ message: "Unauthorized - please log in" },
				{ status: 401 },
			);
		}

		const rl = await checkRateLimit(
			`render:${user.id}`,
			RATE_LIMIT,
			RATE_WINDOW_MS,
		);
		if (!rl.success) {
			return NextResponse.json(
				{ message: "Rate limit exceeded. Try again later." },
				{ status: 429, headers: { "Retry-After": String(rl.resetIn) } },
			);
		}

		// 2. Validate Lambda configuration before accepting the job
		if (!process.env.REMOTION_FUNCTION_NAME || !process.env.REMOTION_SERVE_URL) {
			logger.error("❌ Lambda env vars not configured");
			return NextResponse.json(
				{
					message:
						"Render service is not configured. Set REMOTION_FUNCTION_NAME and REMOTION_SERVE_URL.",
				},
				{ status: 503 },
			);
		}

		// 3. Parse request
		const body = await request.json();
		const { projectId, design, options } = body;

		if (!projectId) {
			return NextResponse.json(
				{ message: "projectId is required" },
				{ status: 400 },
			);
		}

		const projectData = design || body;
		const renderOptions = options || {};
		const format = renderOptions.format ?? "mp4";

		const {
			trackItemsMap,
			trackItemIds,
			transitionsMap,
			duration = 5000,
		} = projectData;

		const size = projectData.size || { width: 1920, height: 1080 };
		const fps = renderOptions.fps || projectData.fps || 30;
		const width = size?.width || 1920;
		const height = size?.height || 1080;

		// Derive exact duration from track item display.to values — ground truth.
		// This prevents extra black frames caused by stale or missing duration field.
		const itemEndTimes: number[] = trackItemsMap
			? Object.values(trackItemsMap)
				.map((item: any) => item?.display?.to ?? 0)
				.filter((t: number) => t > 0)
			: [];
		const contentDurationMs =
			itemEndTimes.length > 0 ? Math.max(...itemEndTimes) : (duration ?? 5000);
		const durationInFrames = Math.max(1, Math.ceil((contentDurationMs / 1000) * fps));

		if (!trackItemsMap || !trackItemIds) {
			return NextResponse.json(
				{ message: "Missing required fields: trackItemsMap and trackItemIds" },
				{ status: 400 },
			);
		}

		// 4. Create render record
		const render = await createRender({
			user_id: user.id,
			project_id: projectId,
			status: "pending",
		});

		if (!render) {
			return NextResponse.json(
				{ message: "Failed to create render record" },
				{ status: 500 },
			);
		}

		logger.log(`✅ Render record ${render.id} created`);

		// 5. Pre-process audio effects via FFmpeg
		logger.log(`🎬 [${render.id}] Pre-processing audio effects...`);
		const { updatedMap: processedTrackItemsMap, tempR2Keys } =
			await processAudioEffectsForRender(trackItemsMap, render.id);

		// 6. Start Lambda render (non-blocking — returns immediately)
		try {
			logger.log(`🚀 [${render.id}] Starting Lambda render...`);

			const { lambdaRenderId, bucketName } = await startLambdaRender({
				compositionId: "VideoEditor",
				inputProps: {
					trackItemsMap: processedTrackItemsMap,
					trackItemIds,
					transitionsMap,
					fps,
					size: { width, height },
				},
				fps,
				width,
				height,
				durationInFrames,
				outName: `renders/${render.id}.mp4`,
				format,
			});

			// Store Lambda IDs in the render record so the polling route can use them
			await supabaseAdmin
				.from("renders")
				.update({
					status: "processing",
					progress: 5,
					lambda_render_id: lambdaRenderId,
					lambda_bucket: bucketName,
					// Store temp keys as storage_key (comma-separated) for cleanup
					storage_key: tempR2Keys.length ? tempR2Keys.join(",") : null,
				})
				.eq("id", render.id);

			logger.log(
				`✅ [${render.id}] Lambda render started: lambdaRenderId=${lambdaRenderId}`,
			);

			return NextResponse.json(
				{ renderId: render.id, status: "PROCESSING" },
				{ status: 200 },
			);
		} catch (lambdaErr) {
			const msg =
				lambdaErr instanceof Error ? lambdaErr.message : String(lambdaErr);
			logger.error(`❌ [${render.id}] Lambda start failed:`, msg);
			await updateRenderStatus(render.id, {
				status: "failed",
				error_message: `Failed to start Lambda render: ${msg}`,
			});
			return NextResponse.json(
				{ message: `Failed to start render: ${msg}` },
				{ status: 500 },
			);
		}
	} catch (error) {
		logger.error("❌ Error in /api/render POST:", error);
		return NextResponse.json(
			{
				message: "Failed to start render",
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
