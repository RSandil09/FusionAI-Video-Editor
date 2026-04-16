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
 * GET /api/social-connections/instagram/callback
 * OAuth callback for Instagram (Meta Graph API). Exchanges code for tokens and stores.
 */
export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");
	const state = searchParams.get("state");
	const error = searchParams.get("error");

	const origin = request.nextUrl.origin;
	const settingsUrl = `${origin}/settings?tab=connections`;

	if (error) {
		logger.error("Instagram OAuth error:", error);
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

	const clientId = process.env.INSTAGRAM_CLIENT_ID;
	const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		return NextResponse.redirect(`${settingsUrl}?error=server_config`);
	}

	const redirectUri = `${origin}/api/social-connections/instagram/callback`;

	// Exchange short-lived code for short-lived access token
	const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: "authorization_code",
			redirect_uri: redirectUri,
			code,
		}),
	});

	if (!tokenRes.ok) {
		const err = await tokenRes.text();
		logger.error("Instagram token exchange failed:", err);
		return NextResponse.redirect(`${settingsUrl}?error=token_exchange`);
	}

	const shortToken = await tokenRes.json();

	// Exchange short-lived token for long-lived token (60 days)
	const longTokenRes = await fetch(
		`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${shortToken.access_token}`,
	);

	let accessToken = shortToken.access_token;
	let expiresAt: string | null = null;
	if (longTokenRes.ok) {
		const longToken = await longTokenRes.json();
		accessToken = longToken.access_token;
		expiresAt = longToken.expires_in
			? new Date(Date.now() + longToken.expires_in * 1000).toISOString()
			: null;
	}

	// Fetch user info
	let providerUsername: string | null = null;
	const providerUserId: string | null = shortToken.user_id?.toString() || null;
	try {
		const userRes = await fetch(
			`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`,
		);
		if (userRes.ok) {
			const userInfo = await userRes.json();
			providerUsername = userInfo.username || null;
		}
	} catch {}

	const result = await upsertSocialConnection({
		user_id: userId,
		provider: "instagram",
		access_token: accessToken,
		refresh_token: null,
		token_expires_at: expiresAt,
		provider_user_id: providerUserId,
		provider_username: providerUsername,
	});

	if (!result.success) {
		logger.error("Instagram save_failed:", result.error);
		return NextResponse.redirect(
			`${settingsUrl}?error=save_failed&detail=${encodeURIComponent(result.error)}`,
		);
	}

	return NextResponse.redirect(`${settingsUrl}?instagram=connected`);
}
