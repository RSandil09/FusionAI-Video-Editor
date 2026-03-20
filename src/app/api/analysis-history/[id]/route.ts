/**
 * DELETE /api/analysis-history/[id]
 * Delete an analysis from history
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { deleteAnalysisFromHistory } from "@/lib/db/analysis-history";

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await getUserFromRequest();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { id } = await params;
		if (!id) {
			return NextResponse.json(
				{ error: "Analysis ID is required" },
				{ status: 400 },
			);
		}

		const ok = await deleteAnalysisFromHistory(id, user.id);
		if (!ok) {
			return NextResponse.json(
				{ error: "Failed to delete analysis" },
				{ status: 500 },
			);
		}

		return NextResponse.json({ deleted: true });
	} catch (error) {
		console.error("Analysis history DELETE error:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Failed to delete" },
			{ status: 500 },
		);
	}
}
