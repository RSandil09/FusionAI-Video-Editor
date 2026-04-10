import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { startRenderJob } from "@/lib/remotion-renderer";
import { processAudioEffectsForRender } from "@/lib/ffmpeg-audio-processor";

import { getUserFromRequest } from "@/lib/auth-helpers";
import { createRender } from "@/lib/db/renders";
import { checkRateLimit } from "@/lib/rate-limit";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
	try {
		logger.log("🔵 /api/render POST request received");

		// 1. Authenticate user
		logger.log("🔵 Authenticating user...");
		const user = await getUserFromRequest();
		if (!user) {
			logger.log("❌ Authentication failed - no user");
			return NextResponse.json(
				{ message: "Unauthorized - please log in" },
				{ status: 401 },
			);
		}
		logger.log("✅ User authenticated:", user.id);

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

		// 2. Parse and validate request
		const body = await request.json();
		logger.log("🚀 Received render request from user:", user.id);

		const { projectId, design, options } = body;

		if (!projectId) {
			return NextResponse.json(
				{ message: "projectId is required" },
				{ status: 400 },
			);
		}

		// Support both nested structure (from frontend) and flat structure (for testing)
		const projectData = design || body;
		const renderOptions = options || {};

		logger.log("📂 Processing projectData for project:", projectId);

		// Extract project data
		const {
			trackItemsMap,
			trackItemIds,
			transitionsMap,
			duration = 5000, // Default 5s if missing
		} = projectData;

		// Handle size separately to be safe
		const size = projectData.size || { width: 1920, height: 1080 };

		const fps = renderOptions.fps || projectData.fps || 30;
		const width = size?.width || 1920;
		const height = size?.height || 1080;
		const durationInFrames = Math.floor((duration / 1000) * fps);

		// Validate required fields
		if (!trackItemsMap || !trackItemIds) {
			return NextResponse.json(
				{ message: "Missing required fields: trackItemsMap and trackItemIds" },
				{ status: 400 },
			);
		}

		// 3. Create render record in database
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

		logger.log(`✅ Render job ${render.id} created in database`);

		// 3.5 Pre-process Audio Effects via FFMPEG locally
		logger.log(`🎬 [${render.id}] Pre-processing Audio Effects...`);
		const { updatedMap: processedTrackItemsMap, tempR2Keys } =
			await processAudioEffectsForRender(trackItemsMap, render.id);

		// 4. Start rendering in background
		logger.log(`🎬 Starting render job ${render.id} in background...`);
		try {
			startRenderJob(render.id, {
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
				tempR2Keys,
			});
		} catch (renderError) {
			logger.error(`❌ Failed to start render job:`, renderError);
			// Don't fail the request - render will mark itself as failed
			// Just log the error
		}

		logger.log(`✅ Render job ${render.id} started for project ${projectId}`);

		// 5. Return render ID immediately (rendering continues in background)
		return NextResponse.json(
			{
				renderId: render.id,
				status: "PENDING",
				message: "Render job started",
			},
			{ status: 200 },
		);
	} catch (error) {
		logger.error("❌ Error starting render:", error);
		return NextResponse.json(
			{
				message: "Failed to start render",
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
