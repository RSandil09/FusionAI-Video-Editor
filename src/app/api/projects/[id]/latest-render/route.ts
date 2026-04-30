import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { supabase } from "@/lib/db/supabase";

/**
 * Returns the most recent completed render for a project, scoped to the current user.
 * Used by the Publish popover so the user can publish their last export to social.
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id: projectId } = await params;

	const user = await getUserFromRequest();
	if (!user) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const { data, error } = await supabase
		.from("renders")
		.select("id, output_url, completed_at")
		.eq("project_id", projectId)
		.eq("user_id", user.id)
		.eq("status", "completed")
		.not("output_url", "is", null)
		.order("completed_at", { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		return NextResponse.json(
			{ message: "Failed to fetch latest render" },
			{ status: 500 },
		);
	}

	if (!data) {
		return NextResponse.json({ render: null });
	}

	return NextResponse.json({
		render: {
			id: data.id,
			videoUrl: data.output_url,
			completedAt: data.completed_at,
		},
	});
}
