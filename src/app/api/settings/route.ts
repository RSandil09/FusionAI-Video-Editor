import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { getUserSettings, upsertUserSettings } from "@/lib/db/user-settings";

export async function GET() {
	const user = await getUserFromRequest();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const settings = await getUserSettings(user.id);
	return NextResponse.json(
		settings || {
			user_id: user.id,
			onboarding_completed: false,
			onboarding_skipped: false,
			theme: "system",
			email_notifications: true,
			render_complete_notifications: true,
			default_export_quality: "high",
			default_export_format: "mp4",
		},
	);
}

export async function PATCH(request: NextRequest) {
	const user = await getUserFromRequest();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const allowed = [
		"onboarding_completed",
		"onboarding_skipped",
		"theme",
		"email_notifications",
		"render_complete_notifications",
		"default_export_quality",
		"default_export_format",
	];
	const updates: Record<string, unknown> = {};
	for (const key of allowed) {
		if (body[key] !== undefined) updates[key] = body[key];
	}

	const result = await upsertUserSettings(user.id, updates);
	if (!result) {
		return NextResponse.json(
			{ error: "Failed to update settings" },
			{ status: 500 },
		);
	}
	return NextResponse.json(result);
}
