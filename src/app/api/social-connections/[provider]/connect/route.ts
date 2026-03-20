import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";

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
		const state = Buffer.from(JSON.stringify({ userId: user.id })).toString(
			"base64url",
		);
		const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
		return NextResponse.redirect(url);
	}

	if (provider === "instagram" || provider === "tiktok") {
		return NextResponse.json(
			{
				error: `${provider} OAuth not yet configured`,
				hint: `Add ${provider.toUpperCase()}_CLIENT_ID and callback URL to your ${provider} developer app.`,
			},
			{ status: 501 },
		);
	}

	return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
}
