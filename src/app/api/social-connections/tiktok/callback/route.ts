import { logger } from "@/lib/logger";
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
		if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex")))
			return null;
	} catch {
		return null;
	}
	return JSON.parse(Buffer.from(payload, "base64url").toString());
}

/**
 * GET /api/social-connections/tiktok/callback
 * OAuth callback for TikTok. Exchanges code for tokens and stores.
 */
export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const state = searchParams.get("state");
	const error = searchParams.get("error");

	const origin = request.nextUrl.origin;
	const settingsUrl = `${origin}/settings?tab=connections`;

	if (error) {
		logger.error("TikTok OAuth error:", error);
		return NextResponse.redirect(`${settingsUrl}?error=${encodeURIComponent(error)}`);
	}

	if (!code || !state) {
		return NextResponse.redirect(`${settingsUrl}?error=missing_params`);
	}

	const stateData = verifySignedState(state);
	if (!stateData?.userId) {
		return NextResponse.redirect(`${settingsUrl}?error=invalid_state`);
	}
	const userId = stateData.userId;

	const clientKey = process.env.TIKTOK_CLIENT_KEY;
	const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
	if (!clientKey || !clientSecret) {
		return NextResponse.redirect(`${settingsUrl}?error=server_config`);
	}

	const redirectUri = `${origin}/api/social-connections/tiktok/callback`;

	// Exchange code for tokens
	const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_key: clientKey,
			client_secret: clientSecret,
			code,
			grant_type: "authorization_code",
			redirect_uri: redirectUri,
		}),
	});

	if (!tokenRes.ok) {
		const err = await tokenRes.text();
		logger.error("TikTok token exchange failed:", err);
		return NextResponse.redirect(`${settingsUrl}?error=token_exchange`);
	}

	const tokens = await tokenRes.json();
	const expiresAt = tokens.expires_in
		? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
		: null;

	// Fetch user info
	let providerUsername: string | null = null;
	let providerUserId: string | null = tokens.open_id || null;
	try {
		const userRes = await fetch(
			"https://open.tiktokapis.com/v2/user/info/?fields=display_name,open_id",
			{ headers: { Authorization: `Bearer ${tokens.access_token}` } },
		);
		if (userRes.ok) {
			const userInfo = await userRes.json();
			providerUsername = userInfo.data?.user?.display_name || null;
			providerUserId = userInfo.data?.user?.open_id || providerUserId;
		}
	} catch {}

	const result = await upsertSocialConnection({
		user_id: userId,
		provider: "tiktok",
		access_token: tokens.access_token,
		refresh_token: tokens.refresh_token || null,
		token_expires_at: expiresAt,
		provider_user_id: providerUserId,
		provider_username: providerUsername,
	});

	if (!result.success) {
		logger.error("TikTok save_failed:", result.error);
		return NextResponse.redirect(
			`${settingsUrl}?error=save_failed&detail=${encodeURIComponent(result.error)}`,
		);
	}

	return NextResponse.redirect(`${settingsUrl}?tiktok=connected`);
}
