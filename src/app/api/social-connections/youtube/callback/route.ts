import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { upsertSocialConnection } from "@/lib/db/user-social-connections";

function verifySignedState(state: string): { userId: string } | null {
	const secret = process.env.OAUTH_STATE_SECRET;
	if (!secret) return null;
	const dot = state.lastIndexOf(".");
	if (dot < 0) return null;
	const payload = state.slice(0, dot);
	const sig = state.slice(dot + 1);
	const expected = createHmac("sha256", secret).update(payload).digest("hex");
	try {
		if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
	} catch {
		return null;
	}
	return JSON.parse(Buffer.from(payload, "base64url").toString());
}

/**
 * GET /api/social-connections/youtube/callback
 * OAuth callback for YouTube. Exchanges code for tokens and stores.
 */
export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const state = searchParams.get("state");
	const error = searchParams.get("error");

	const origin = request.nextUrl.origin;
	const settingsUrl = `${origin}/settings?tab=connections`;

	if (error) {
		console.error("YouTube OAuth error:", error);
		return NextResponse.redirect(
			`${settingsUrl}?error=${encodeURIComponent(error)}`,
		);
	}

	if (!code || !state) {
		return NextResponse.redirect(`${settingsUrl}?error=missing_params`);
	}

	const stateData = verifySignedState(state);
	if (!stateData?.userId) {
		return NextResponse.redirect(`${settingsUrl}?error=invalid_state`);
	}
	const userId = stateData.userId;

	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		return NextResponse.redirect(`${settingsUrl}?error=server_config`);
	}

	const redirectUri = `${origin}/api/social-connections/youtube/callback`;
	const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: redirectUri,
			grant_type: "authorization_code",
		}),
	});

	if (!tokenRes.ok) {
		const err = await tokenRes.text();
		console.error("YouTube token exchange failed:", err);
		return NextResponse.redirect(`${settingsUrl}?error=token_exchange`);
	}

	const tokens = await tokenRes.json();
	const expiresAt = tokens.expires_in
		? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
		: null;

	const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
		headers: { Authorization: `Bearer ${tokens.access_token}` },
	});
	let providerUsername: string | null = null;
	if (userRes.ok) {
		const userInfo = await userRes.json();
		providerUsername = userInfo.name || userInfo.email || null;
	}

	const conn = await upsertSocialConnection({
		user_id: userId,
		provider: "youtube",
		access_token: tokens.access_token,
		refresh_token: tokens.refresh_token || null,
		token_expires_at: expiresAt,
		provider_username: providerUsername,
	});

	if (!conn) {
		return NextResponse.redirect(`${settingsUrl}?error=save_failed`);
	}

	return NextResponse.redirect(`${settingsUrl}?youtube=connected`);
}
