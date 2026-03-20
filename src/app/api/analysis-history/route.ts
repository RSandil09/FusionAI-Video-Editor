/**
 * Analysis History API
 * GET: List analysis history for a project
 * POST: Save a new analysis to history
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import {
	saveAnalysisToHistory,
	getAnalysisHistory,
	type AnalysisResultForDb,
} from "@/lib/db/analysis-history";
import { supabaseAdmin } from "@/lib/db/supabase-admin";

/**
 * GET /api/analysis-history?projectId=xxx&limit=20&type=scenes
 */
export async function GET(request: NextRequest) {
	try {
		const user = await getUserFromRequest();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const projectId = searchParams.get("projectId");
		const limit = parseInt(searchParams.get("limit") || "20", 10);
		const type = searchParams.get("type") || undefined;

		if (!projectId) {
			return NextResponse.json(
				{ error: "projectId is required" },
				{ status: 400 },
			);
		}

		// Verify project exists and user owns it
		const { data: project, error: projectErr } = await supabaseAdmin
			.from("projects")
			.select("id, user_id")
			.eq("id", projectId)
			.maybeSingle();

		if (projectErr || !project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}
		if (project.user_id !== user.id) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const history = await getAnalysisHistory(projectId, {
			limit: Math.min(limit, 50),
			type,
		});

		return NextResponse.json({ history });
	} catch (error) {
		console.error("Analysis history GET error:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to fetch history",
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/analysis-history
 * Body: { projectId, analysis: { type, segments, videoUrl, videoName? } }
 */
export async function POST(request: NextRequest) {
	try {
		const user = await getUserFromRequest();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const { projectId, analysis } = body as {
			projectId: string;
			analysis: AnalysisResultForDb;
		};

		if (!projectId || !analysis) {
			return NextResponse.json(
				{ error: "projectId and analysis are required" },
				{ status: 400 },
			);
		}
		if (
			!analysis.type ||
			!Array.isArray(analysis.segments) ||
			!analysis.videoUrl
		) {
			return NextResponse.json(
				{ error: "analysis must have type, segments (array), and videoUrl" },
				{ status: 400 },
			);
		}

		// Verify project exists and user owns it
		const { data: project, error: projectErr } = await supabaseAdmin
			.from("projects")
			.select("id, user_id")
			.eq("id", projectId)
			.maybeSingle();

		if (projectErr || !project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 });
		}
		if (project.user_id !== user.id) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const saved = await saveAnalysisToHistory(projectId, user.id, analysis);
		if (!saved) {
			return NextResponse.json(
				{ error: "Failed to save analysis" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ saved });
	} catch (error) {
		console.error("Analysis history POST error:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : "Failed to save analysis",
			},
			{ status: 500 },
		);
	}
}
