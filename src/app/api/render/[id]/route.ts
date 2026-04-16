import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { getRender, updateRenderStatus } from "@/lib/db/renders";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { getLambdaProgress, cancelLambdaRender } from "@/lib/remotion-lambda-renderer";
import { getR2Client } from "@/lib/r2-client";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/db/supabase-admin";

/**
 * Clean up temp R2 audio keys that were stored as a comma-separated list
 * in the storage_key column during render start.
 */
async function cleanupTempAudio(storageKey: string | null) {
	if (!storageKey || !process.env.R2_BUCKET_NAME) return;
	const keys = storageKey.split(",").filter(Boolean);
	if (!keys.length) return;
	try {
		const client = getR2Client();
		await Promise.allSettled(
			keys.map((key) =>
				client.send(
					new DeleteObjectCommand({
						Bucket: process.env.R2_BUCKET_NAME,
						Key: key,
					}),
				),
			),
		);
		logger.log(`[cleanup] Deleted ${keys.length} temp audio file(s) from R2`);
	} catch (e) {
		logger.error("[cleanup] Failed to delete temp R2 audio:", e);
	}
}

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		if (!id) {
			return NextResponse.json(
				{ message: "Render ID is required" },
				{ status: 400 },
			);
		}

		const user = await getUserFromRequest();
		if (!user) {
			return NextResponse.json(
				{ message: "Unauthorized — please log in" },
				{ status: 401 },
			);
		}

		const render = await getRender(id);
		if (!render) {
			return NextResponse.json(
				{ message: "Render job not found" },
				{ status: 404 },
			);
		}

		if (render.user_id !== user.id) {
			return NextResponse.json(
				{ message: "Forbidden — you do not own this render" },
				{ status: 403 },
			);
		}

		// ── Already in a terminal state — return DB data directly ──────────────
		if (render.status === "completed") {
			return NextResponse.json({
				renderId: render.id,
				status: "COMPLETED",
				progress: 100,
				videoUrl: render.output_url,
				completedAt: render.completed_at,
			});
		}

		if (render.status === "failed") {
			return NextResponse.json({
				renderId: render.id,
				status: "FAILED",
				progress: render.progress ?? 0,
				error: render.error_message,
			});
		}

		// ── In-flight: pull live progress from Lambda ───────────────────────────
		const { lambda_render_id, lambda_bucket } = render;

		if (!lambda_render_id || !lambda_bucket) {
			// Render started before Lambda migration — return DB status as-is
			return NextResponse.json({
				renderId: render.id,
				status: render.status.toUpperCase(),
				progress: render.progress ?? 0,
			});
		}

		let lambdaProgress;
		try {
			lambdaProgress = await getLambdaProgress(lambda_render_id, lambda_bucket);
		} catch (lambdaErr: any) {
			// Rate limit — return current DB progress so frontend keeps polling
			if (lambdaErr?.name === "TooManyRequestsException" || lambdaErr?.message?.includes("Rate")) {
				return NextResponse.json({
					renderId: id,
					status: "PROCESSING",
					progress: render.progress ?? 0,
				});
			}
			throw lambdaErr;
		}

		// ── Lambda finished ─────────────────────────────────────────────────────
		if (lambdaProgress.done && lambdaProgress.outputFile) {
			await cleanupTempAudio(render.storage_key);
			await updateRenderStatus(id, {
				status: "completed",
				progress: 100,
				output_url: lambdaProgress.outputFile,
				storage_key: null,
			});
			return NextResponse.json({
				renderId: id,
				status: "COMPLETED",
				progress: 100,
				videoUrl: lambdaProgress.outputFile,
			});
		}

		// ── Lambda errored ──────────────────────────────────────────────────────
		if (lambdaProgress.fatalErrorEncountered) {
			const errMsg = lambdaProgress.errors[0] ?? "Render failed in Lambda";
			await cleanupTempAudio(render.storage_key);
			await updateRenderStatus(id, {
				status: "failed",
				error_message: errMsg,
				storage_key: null,
			});
			return NextResponse.json({
				renderId: id,
				status: "FAILED",
				progress: lambdaProgress.progress,
				error: errMsg,
			});
		}

		// ── Still rendering — update progress in DB and return ──────────────────
		const newProgress = Math.max(lambdaProgress.progress, render.progress ?? 0);
		if (newProgress !== render.progress) {
			await updateRenderStatus(id, { progress: newProgress });
		}

		return NextResponse.json({
			renderId: id,
			status: "PROCESSING",
			progress: newProgress,
		});
	} catch (error) {
		logger.error("Error checking render status:", error);
		return NextResponse.json(
			{
				message: "Failed to check render status",
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}

export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const user = await getUserFromRequest();
		if (!user) {
			return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
		}

		const render = await getRender(id);
		if (!render) {
			return NextResponse.json({ message: "Render not found" }, { status: 404 });
		}
		if (render.user_id !== user.id) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 });
		}

		// If still in-flight, tell Lambda to stop — prevents wasted AWS costs
		const isInFlight = render.status === "processing" || render.status === "pending";
		if (isInFlight && render.lambda_render_id && render.lambda_bucket) {
			try {
				await cancelLambdaRender(render.lambda_render_id, render.lambda_bucket);
				logger.log(`🛑 Lambda render ${render.lambda_render_id} cancelled`);
			} catch (cancelErr) {
				// best-effort — don't block deletion if cancel fails
				logger.error("Failed to cancel Lambda render:", cancelErr);
			}
		}

		// Clean up temp audio files from R2 if any
		if (render.storage_key) {
			await cleanupTempAudio(render.storage_key);
		}

		// Delete the render record entirely
		await supabaseAdmin.from("renders").delete().eq("id", id);

		logger.log(`🗑️ Render ${id} deleted by user ${user.id}`);
		return NextResponse.json({ success: true });
	} catch (error) {
		logger.error("Error deleting render:", error);
		return NextResponse.json(
			{ message: "Failed to delete render" },
			{ status: 500 },
		);
	}
}
