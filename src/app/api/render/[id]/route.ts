import { NextResponse } from "next/server";
import { getRender } from "@/lib/db/renders";
import { getUserFromRequest } from "@/lib/auth-helpers";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		// Await params (Next.js 15 requirement)
		const { id } = await params;

		if (!id) {
			return NextResponse.json(
				{ message: "Render ID is required" },
				{ status: 400 },
			);
		}

		// Authenticate user
		const user = await getUserFromRequest();
		if (!user) {
			return NextResponse.json(
				{ message: "Unauthorized — please log in" },
				{ status: 401 },
			);
		}

		// Get render from database
		const render = await getRender(id);

		if (!render) {
			console.warn(`⚠️ Render job not found: ${id}`);
			return NextResponse.json(
				{ message: "Render job not found" },
				{ status: 404 },
			);
		}

		// Verify ownership
		if (render.user_id !== user.id) {
			return NextResponse.json(
				{ message: "Forbidden — you do not own this render" },
				{ status: 403 },
			);
		}

		// Return status with UPPERCASE for frontend compatibility
		const response: Record<string, unknown> = {
			renderId: render.id,
			status: render.status.toUpperCase(), // frontend expects uppercase
			progress: render.progress ?? 0,
		};

		if (render.status === "completed" && render.output_url) {
			response.videoUrl = render.output_url;
			response.completedAt = render.completed_at;
		}

		if (render.status === "failed" && render.error_message) {
			response.error = render.error_message;
		}

		if (render.status === "processing" && render.started_at) {
			response.startedAt = render.started_at;
		}

		return NextResponse.json(response, { status: 200 });
	} catch (error) {
		console.error("Error checking render status:", error);
		return NextResponse.json(
			{
				message: "Failed to check render status",
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
