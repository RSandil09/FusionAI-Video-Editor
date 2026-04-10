import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/db/supabase-admin";

/**
 * PATCH /api/projects/[id]
 * Save project editor state.
 * Auth is enforced via Firebase (Bearer token or session cookie).
 * DB write uses service_role Supabase client (bypasses all RLS).
 */
export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const startTime = Date.now();
	logger.log("💾 === PATCH /api/projects/[id] START ===");

	try {
		// ── Step 1: Resolve route params ──────────────────────────────────
		const { id: projectId } = await params;
		logger.log("   projectId:", projectId);

		if (!projectId) {
			return NextResponse.json(
				{ message: "Project ID is required" },
				{ status: 400 },
			);
		}

		// ── Step 2: Authenticate via Bearer token / session cookie ────────
		logger.log("   Authenticating user...");
		let user: { id: string; email: string } | null = null;
		try {
			user = await getUserFromRequest();
		} catch (authErr: any) {
			logger.error("   ❌ Auth threw exception:", authErr.message);
			return NextResponse.json(
				{ message: `Auth error: ${authErr.message}` },
				{ status: 500 },
			);
		}

		if (!user) {
			logger.error("   ❌ No user returned by getUserFromRequest");
			return NextResponse.json(
				{
					message:
						"Unauthorized — please log in. (No valid Firebase token or session cookie found.)",
				},
				{ status: 401 },
			);
		}
		logger.log("   ✓ Authenticated user:", user.id, user.email);

		// ── Step 3: Parse request body ────────────────────────────────────
		logger.log("   Parsing request body...");
		let body: any;
		try {
			body = await request.json();
		} catch (parseErr: any) {
			logger.error("   ❌ Failed to parse request body:", parseErr.message);
			return NextResponse.json(
				{ message: `Invalid JSON body: ${parseErr.message}` },
				{ status: 400 },
			);
		}

		const { editor_state, name } = body;
		logger.log("   Body keys:", Object.keys(body));
		logger.log("   editor_state type:", typeof editor_state);
		logger.log("   name:", name);

		const updatePayload: Record<string, unknown> = {};

		if (editor_state !== undefined) {
			// Validate minimum required shape before persisting — prevents corrupted state overwriting good data
			if (
				typeof editor_state !== "object" ||
				editor_state === null ||
				typeof editor_state.trackItemsMap !== "object" ||
				!Array.isArray(editor_state.trackItemIds)
			) {
				logger.error("   ❌ editor_state failed structure validation");
				return NextResponse.json(
					{
						message:
							"Invalid editor_state: must contain trackItemsMap (object) and trackItemIds (array)",
					},
					{ status: 400 },
				);
			}
			updatePayload.editor_state = editor_state;
		}

		if (name !== undefined) {
			if (typeof name !== "string" || name.trim().length === 0) {
				return NextResponse.json(
					{ message: "name must be a non-empty string" },
					{ status: 400 },
				);
			}
			updatePayload.name = name.trim();
		}

		if (Object.keys(updatePayload).length === 0) {
			return NextResponse.json(
				{
					message:
						"Nothing to update — provide editor_state or name in the request body",
				},
				{ status: 400 },
			);
		}

		// ── Step 4: Verify Supabase admin client is ready ─────────────────
		logger.log("   Checking Supabase admin client...");
		logger.log(
			"   Using key type:",
			process.env.SUPABASE_SERVICE_ROLE_KEY
				? "service_role ✓"
				: "anon (fallback)",
		);

		// ── Step 5: Verify project exists and belongs to this user (READ) ──
		logger.log("   Fetching project to verify ownership...");
		const { data: existingProject, error: readErr } = await supabaseAdmin
			.from("projects")
			.select("id, user_id, name")
			.eq("id", projectId)
			.maybeSingle();

		if (readErr) {
			logger.error(
				"   ❌ Supabase SELECT error:",
				readErr.code,
				readErr.message,
				readErr.hint,
			);
			return NextResponse.json(
				{
					message: "Database error reading project",
					error: readErr.message,
					code: readErr.code,
				},
				{ status: 500 },
			);
		}

		if (!existingProject) {
			logger.error(`   ❌ Project not found: ${projectId}`);
			return NextResponse.json(
				{ message: `Project not found: ${projectId}` },
				{ status: 404 },
			);
		}

		logger.log(
			"   Project found:",
			existingProject.id,
			"owner:",
			existingProject.user_id,
		);
		logger.log("   Requesting user:", user.id);

		// Security check — verify ownership
		if (existingProject.user_id !== user.id) {
			logger.error(
				`   ❌ Ownership mismatch: project.user_id=${existingProject.user_id} vs token.uid=${user.id}`,
			);
			return NextResponse.json(
				{
					message: "Forbidden — this project belongs to a different user",
					detail: `project.user_id does not match the Firebase UID in the token`,
				},
				{ status: 403 },
			);
		}

		// ── Step 6: Perform the UPDATE ────────────────────────────────────
		logger.log("   Updating project...", Object.keys(updatePayload));
		const { data, error: updateErr } = await supabaseAdmin
			.from("projects")
			.update(updatePayload)
			.eq("id", projectId)
			.select("id, name, updated_at");

		if (updateErr) {
			logger.error("   ❌ Supabase UPDATE error:", {
				code: updateErr.code,
				message: updateErr.message,
				details: updateErr.details,
				hint: updateErr.hint,
			});
			return NextResponse.json(
				{
					message: "Database error while saving",
					error: updateErr.message,
					code: updateErr.code,
					hint: updateErr.hint,
				},
				{ status: 500 },
			);
		}

		if (!data || data.length === 0) {
			logger.error("   ❌ UPDATE matched 0 rows despite SELECT succeeding");
			return NextResponse.json(
				{
					message:
						"Update failed — 0 rows modified. This should not happen. Check server logs.",
				},
				{ status: 500 },
			);
		}

		const updated = data[0];
		const elapsed = Date.now() - startTime;
		logger.log(
			`   ✅ Save complete in ${elapsed}ms. updated_at: ${updated.updated_at}`,
		);
		logger.log("💾 === PATCH /api/projects/[id] END ===");

		return NextResponse.json(
			{
				message: "Project saved",
				project: { id: updated.id, updated_at: updated.updated_at },
			},
			{ status: 200 },
		);
	} catch (error: any) {
		logger.error(
			"💥 UNEXPECTED error in PATCH /api/projects/[id]:",
			error.message,
			error.stack,
		);
		return NextResponse.json(
			{ message: "Unexpected server error", error: error.message },
			{ status: 500 },
		);
	}
}
