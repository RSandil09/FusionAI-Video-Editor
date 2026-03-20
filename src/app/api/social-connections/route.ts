import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { getSocialConnections } from "@/lib/db/user-social-connections";

export async function GET() {
	const user = await getUserFromRequest();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const connections = await getSocialConnections(user.id);
	return NextResponse.json(
		connections.map((c) => ({
			provider: c.provider,
			provider_username: c.provider_username,
			connected_at: c.connected_at,
		})),
	);
}
