import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import {
	disconnectSocial,
	getSocialConnection,
	type SocialProvider,
} from "@/lib/db/user-social-connections";

const VALID_PROVIDERS: SocialProvider[] = ["youtube", "instagram", "tiktok"];

export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ provider: string }> },
) {
	const user = await getUserFromRequest();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { provider } = await params;
	if (!VALID_PROVIDERS.includes(provider as SocialProvider)) {
		return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
	}

	const ok = await disconnectSocial(user.id, provider as SocialProvider);
	if (!ok) {
		return NextResponse.json(
			{ error: "Failed to disconnect" },
			{ status: 500 },
		);
	}
	return NextResponse.json({ success: true });
}

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ provider: string }> },
) {
	const user = await getUserFromRequest();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { provider } = await params;
	if (!VALID_PROVIDERS.includes(provider as SocialProvider)) {
		return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
	}

	const conn = await getSocialConnection(user.id, provider as SocialProvider);
	return NextResponse.json({
		connected: !!conn,
		provider_username: conn?.provider_username,
	});
}
