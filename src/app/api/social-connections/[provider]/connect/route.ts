import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes } from "crypto";
import { getUserFromRequest } from "@/lib/auth-helpers";

function buildSignedState(userId: string): string {
	const secret = process.env.OAUTH_STATE_SECRET;
	if (!secret) throw new Error("OAUTH_STATE_SECRET not set in environment");
	const nonce = randomBytes(16).toString("hex");
	const payload = Buffer.from(JSON.stringify({ userId, nonce })).toString(
		"base64url",
	);
	const sig = createHmac("sha256", secret).update(payload).digest("hex");
	return `${payload}.${sig}`;
}

/**
 * GET /api/social-connections/[provider]/connect
 * Initiates OAuth flow. Redirects to platform's authorization URL.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ provider: string }> },
) {
	const user = await getUserFromRequest();
	if (!user) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	const { provider } = await params;
	const origin = request.nextUrl.origin;

	if (provider === "youtube") {
		const clientId = process.env.GOOGLE_CLIENT_ID;
		if (!clientId) {
			return NextResponse.json(
				{
					error: "YouTube connect not configured. Add GOOGLE_CLIENT_ID to env.",
				},
				{ status: 503 },
			);
		}
		const redirectUri = `${origin}/api/social-connections/youtube/callback`;
		const scope = encodeURIComponent(
			"https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
		);
		const state = buildSignedState(user.id);
		const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
		return NextResponse.redirect(url);
	}

	if (provider === "tiktok") {
		const clientKey = process.env.TIKTOK_CLIENT_KEY;
		if (!clientKey) {
			return NextResponse.json(
				{ error: "TikTok connect not configured. Add TIKTOK_CLIENT_KEY to env." },
				{ status: 503 },
			);
		}
		const redirectUri = `${origin}/api/social-connections/tiktok/callback`;
		const scope = "user.info.basic,video.upload,video.publish";
		const state = buildSignedState(user.id);
		const url = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
		return NextResponse.redirect(url);
	}

	if (provider === "instagram") {
		const clientId = process.env.INSTAGRAM_CLIENT_ID;
		if (!clientId) {
			return NextResponse.json(
				{ error: "Instagram connect not configured. Add INSTAGRAM_CLIENT_ID to env." },
				{ status: 503 },
			);
		}
		const redirectUri = `${origin}/api/social-connections/instagram/callback`;
		const scope = "instagram_basic,instagram_content_publish";
		const state = buildSignedState(user.id);
		const url = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${state}`;
		return NextResponse.redirect(url);
	}

	return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
}
