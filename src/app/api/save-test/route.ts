import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { supabaseAdmin } from "@/lib/db/supabase-admin";

/**
 * GET /api/save-test?projectId=<id>
 * Diagnostic endpoint — tests every step of the save chain.
 * Only available in development.
 */
export async function GET(request: Request) {
	if (process.env.NODE_ENV === "production") {
		return new NextResponse(null, { status: 404 });
	}
	const { searchParams } = new URL(request.url);
	const projectId = searchParams.get("projectId");

	const results: Record<string, any> = {
		timestamp: new Date().toISOString(),
		steps: {},
	};

	// Step 1: Auth
	try {
		const user = await getUserFromRequest();
		if (user) {
			results.steps.auth = { ok: true, userId: user.id, email: user.email };
		} else {
			results.steps.auth = {
				ok: false,
				error:
					"No user returned — Bearer token or session cookie missing/invalid",
			};
		}
	} catch (e: any) {
		results.steps.auth = { ok: false, error: e.message };
	}

	// Step 2: Supabase connection
	try {
		const { error } = await supabaseAdmin
			.from("projects")
			.select("id")
			.limit(1);
		if (error) {
			results.steps.supabase_connection = {
				ok: false,
				error: error.message,
				code: error.code,
				hint: error.hint,
			};
		} else {
			results.steps.supabase_connection = {
				ok: true,
				keyType: process.env.SUPABASE_SERVICE_ROLE_KEY
					? "service_role"
					: "anon (fallback)",
			};
		}
	} catch (e: any) {
		results.steps.supabase_connection = { ok: false, error: e.message };
	}

	// Step 3: Project read (if projectId provided)
	if (projectId) {
		try {
			const { data, error } = await supabaseAdmin
				.from("projects")
				.select("id, user_id, name, editor_state")
				.eq("id", projectId)
				.maybeSingle();

			if (error) {
				results.steps.project_read = {
					ok: false,
					error: error.message,
					code: error.code,
				};
			} else if (!data) {
				results.steps.project_read = {
					ok: false,
					error: `No project found with id: ${projectId}`,
				};
			} else {
				results.steps.project_read = {
					ok: true,
					project: {
						id: data.id,
						name: data.name,
						user_id: data.user_id,
						hasEditorState: !!data.editor_state,
					},
				};
			}
		} catch (e: any) {
			results.steps.project_read = { ok: false, error: e.message };
		}

		// Step 4: Test UPDATE (dry run — just re-save the same updated_at)
		const user = results.steps.auth?.userId;
		if (user && results.steps.project_read?.ok) {
			try {
				const { data, error } = await supabaseAdmin
					.from("projects")
					.update({ updated_at: new Date().toISOString() })
					.eq("id", projectId)
					.eq("user_id", user)
					.select("id, updated_at");

				if (error) {
					results.steps.project_update_test = {
						ok: false,
						error: error.message,
						code: error.code,
						hint: error.hint,
					};
				} else if (!data || data.length === 0) {
					results.steps.project_update_test = {
						ok: false,
						error: "0 rows updated — user_id may not match project owner",
					};
				} else {
					results.steps.project_update_test = {
						ok: true,
						updated_at: data[0].updated_at,
					};
				}
			} catch (e: any) {
				results.steps.project_update_test = { ok: false, error: e.message };
			}
		}
	}

	// Summary
	const allOk = Object.values(results.steps).every((s: any) => s.ok);
	results.summary = allOk
		? "✅ All save steps OK"
		: "❌ One or more steps failed — see 'steps' for details";

	return NextResponse.json(results, { status: allOk ? 200 : 500 });
}
