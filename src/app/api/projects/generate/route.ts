import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { createProject } from "@/lib/db/projects";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { autoArrangeAssets, AssetInput } from "@/lib/ai/auto-arrange";
import { checkRateLimit } from "@/lib/rate-limit";

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST /api/projects/generate
 *
 * Creates a new project and uses AI to auto-arrange the uploaded assets
 * into a ready-to-edit timeline.
 *
 * Request body:
 * {
 *   name: string,
 *   orientation: "portrait" | "landscape",
 *   fps?: 30 | 60,
 *   assets: Array<{
 *     url: string,
 *     type: "video" | "image" | "audio",
 *     durationMs?: number,
 *     width?: number,
 *     height?: number,
 *     name?: string
 *   }>
 * }
 *
 * Response:
 * { projectId: string }
 */
export async function POST(request: NextRequest) {
	try {
		// 1. Auth
		const user = await getUserFromRequest();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const rl = checkRateLimit(`generate:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
		if (!rl.success) {
			return NextResponse.json(
				{ error: "Rate limit exceeded. Try again later." },
				{ status: 429, headers: { "Retry-After": String(rl.resetIn) } },
			);
		}

		// 2. Parse + validate body
		let body: {
			name?: string;
			orientation?: "portrait" | "landscape";
			fps?: number;
			assets?: AssetInput[];
		};
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const { name, orientation = "portrait", fps = 30, assets = [] } = body;

		if (!name || typeof name !== "string" || name.trim().length === 0) {
			return NextResponse.json(
				{ error: "name is required and must be a non-empty string" },
				{ status: 400 },
			);
		}

		const validOrientations = ["portrait", "landscape"];
		if (!validOrientations.includes(orientation)) {
			return NextResponse.json(
				{ error: "orientation must be 'portrait' or 'landscape'" },
				{ status: 400 },
			);
		}

		if (!Array.isArray(assets)) {
			return NextResponse.json({ error: "assets must be an array" }, { status: 400 });
		}

		// Validate each asset
		for (const asset of assets) {
			if (!asset.url || typeof asset.url !== "string") {
				return NextResponse.json(
					{ error: "Each asset must have a valid url string" },
					{ status: 400 },
				);
			}
			if (!["video", "image", "audio"].includes(asset.type)) {
				return NextResponse.json(
					{ error: `Invalid asset type: ${asset.type}` },
					{ status: 400 },
				);
			}
		}

		// 3. Determine canvas size from orientation
		const size =
			orientation === "portrait"
				? { width: 1080, height: 1920 }
				: { width: 1920, height: 1080 };

		// 4. Create the project record in DB first (so we have an ID to return quickly)
		const project = await createProject({
			user_id: user.id,
			name: name.trim(),
			resolution_width: size.width,
			resolution_height: size.height,
			frame_rate: fps,
		});

		if (!project) {
			return NextResponse.json(
				{ error: "Failed to create project" },
				{ status: 500 },
			);
		}

		console.log(`[generate] Project created: ${project.id} for user ${user.id}`);

		// 5. Run AI auto-arrange (this is the slow step — video analysis via Gemini)
		//    We do this after creating the project so the client gets the projectId
		//    immediately. The editor_state is saved asynchronously.
		//
		//    NOTE: Because Next.js App Router routes are stateless, we run this
		//    synchronously within the request. The client shows a loading screen
		//    until this resolves. Typical time: 5–30s depending on video sizes.

		console.log(`[generate] Running auto-arrange for ${assets.length} asset(s)...`);

		let editorState: Awaited<ReturnType<typeof autoArrangeAssets>>;
		try {
			editorState = await autoArrangeAssets(assets, fps, size);
		} catch (err) {
			console.error("[generate] autoArrangeAssets failed:", err);
			// Fall back to an empty timeline so the project is still usable
			editorState = {
				duration: 5000,
				fps,
				size,
				tracks: [],
				trackItemIds: [],
				transitionIds: [],
				transitionsMap: {},
				trackItemsMap: {},
			};
		}

		const arrangedState = editorState as Record<string, any>;
		console.log(
			`[generate] Auto-arrange complete. Duration: ${arrangedState.duration}ms, ` +
			`Items: ${(arrangedState.trackItemIds as unknown[]).length}`,
		);

		// 6. Save editor_state to the project
		const { error: updateErr } = await supabaseAdmin
			.from("projects")
			.update({ editor_state: editorState as any })
			.eq("id", project.id);

		if (updateErr) {
			console.error("[generate] Failed to save editor_state:", updateErr);
			// Project still exists — editor will open with empty state
		}

		// 7. Return projectId — client redirects to /editor/:id
		return NextResponse.json({ projectId: project.id }, { status: 200 });
	} catch (error) {
		console.error("[generate] Unexpected error:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Server error" },
			{ status: 500 },
		);
	}
}
