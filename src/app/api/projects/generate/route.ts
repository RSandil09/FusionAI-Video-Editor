import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { createProject } from "@/lib/db/projects";
import { supabaseAdmin } from "@/lib/db/supabase-admin";
import { autoArrangeAssets, AssetInput } from "@/lib/ai/auto-arrange";
import { parseUserIntent, DEFAULT_INTENT, ParsedIntent } from "@/lib/ai/parse-intent";
import { checkRateLimit } from "@/lib/rate-limit";

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST /api/projects/generate
 *
 * Creates a new project and uses AI to auto-arrange the uploaded assets
 * into a ready-to-edit timeline. When `userPrompt` is supplied the AI
 * pipeline adapts its editing decisions to match the user's intent
 * (highlight extraction, silence removal, caption style, duration cap, etc.).
 *
 * Request body:
 * {
 *   name: string,
 *   orientation: "portrait" | "landscape",
 *   fps?: 30 | 60,
 *   userPrompt?: string,          ← free-text editing instruction
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

    const rl = await checkRateLimit(
      `generate:${user.id}`,
      RATE_LIMIT,
      RATE_WINDOW_MS,
    );
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
      userPrompt?: string;
      assets?: AssetInput[];
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      name,
      orientation = "portrait",
      fps = 30,
      userPrompt = "",
      assets = [],
    } = body;

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
      return NextResponse.json(
        { error: "assets must be an array" },
        { status: 400 },
      );
    }

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

    // 3. Determine canvas size
    const size =
      orientation === "portrait"
        ? { width: 1080, height: 1920 }
        : { width: 1920, height: 1080 };

    // 4. Parse user intent (text-only Gemini call — fast, ~1-2s)
    //    This runs before any video processing so the intent is available
    //    to every downstream AI call in autoArrangeAssets.
    let intent: ParsedIntent = DEFAULT_INTENT;
    const trimmedPrompt = (userPrompt ?? "").trim();

    if (trimmedPrompt.length > 0) {
      logger.log(`[generate] Parsing user intent: "${trimmedPrompt.slice(0, 80)}…"`);
      try {
        const totalDurationMs = assets.reduce(
          (sum, a) => sum + (a.durationMs ?? 0),
          0,
        );
        const assetNames = assets
          .map((a) => a.name ?? "")
          .filter(Boolean);

        intent = await parseUserIntent(trimmedPrompt, assetNames, totalDurationMs);
        logger.log(
          `[generate] Intent parsed — mode: ${intent.mode}, highlights: ${intent.keepOnlyHighlights}, ` +
            `silence: ${intent.removeSilence}, platform: ${intent.targetPlatform}`,
        );
      } catch (err) {
        // Non-fatal: fall back to default intent
        logger.error("[generate] Intent parsing failed, continuing with defaults:", err);
        intent = { ...DEFAULT_INTENT, userPrompt: trimmedPrompt };
      }
    }

    // 5. Create the project record in DB (gives us an ID to return)
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

    logger.log(`[generate] Project created: ${project.id} for user ${user.id}`);

    // 6. Run AI auto-arrange (slow step — Gemini video analysis)
    //    Intent is passed so the pipeline adapts scene scoring, transcript
    //    prompting, highlight detection, and caption styling to the user's goal.
    logger.log(
      `[generate] Running auto-arrange for ${assets.length} asset(s) with mode="${intent.mode}"…`,
    );

    let editorState: Awaited<ReturnType<typeof autoArrangeAssets>>;
    try {
      editorState = await autoArrangeAssets(assets, fps, size, intent);
    } catch (err) {
      logger.error("[generate] autoArrangeAssets failed:", err);
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

    const arrangedState = editorState as Record<string, unknown>;
    logger.log(
      `[generate] Auto-arrange complete. Duration: ${arrangedState.duration}ms, ` +
        `items: ${(arrangedState.trackItemIds as unknown[]).length}`,
    );

    // 7. Save editor_state
    const { error: updateErr } = await supabaseAdmin
      .from("projects")
      .update({ editor_state: editorState as any })
      .eq("id", project.id);

    if (updateErr) {
      logger.error("[generate] Failed to save editor_state:", updateErr);
    }

    // 8. Return projectId — client redirects to /editor/:id
    return NextResponse.json({ projectId: project.id }, { status: 200 });
  } catch (error) {
    logger.error("[generate] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
