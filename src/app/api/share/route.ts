import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import {
	getSocialConnection,
	upsertSocialConnection,
} from "@/lib/db/user-social-connections";

// Large video uploads can take several minutes — use Vercel's max.
export const maxDuration = 300;

// ── SSRF guard ────────────────────────────────────────────────────────────────
/**
 * Allow only known-safe storage hosts:
 *  - Cloudflare R2 public buckets:           *.r2.dev
 *  - Remotion Lambda output bucket on S3:    s3.<region>.amazonaws.com/remotionlambda-...
 *                                            remotionlambda-<region>-<hash>.s3.<region>.amazonaws.com
 *                                            remotionlambda-<region>-<hash>.s3.amazonaws.com
 */
function validateVideoUrl(
	videoUrl: string,
): { ok: true; url: string } | { ok: false; response: NextResponse } {
	let parsed: URL;
	try {
		parsed = new URL(videoUrl);
	} catch {
		return {
			ok: false,
			response: NextResponse.json({ error: "Invalid videoUrl" }, { status: 400 }),
		};
	}

	if (parsed.protocol !== "https:") {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: "videoUrl must use https" },
				{ status: 400 },
			),
		};
	}

	const host = parsed.hostname;

	// Cloudflare R2 public buckets
	if (host.endsWith(".r2.dev")) return { ok: true, url: videoUrl };

	// Remotion Lambda S3 — virtual-hosted style: remotionlambda-...s3...amazonaws.com
	if (
		/^remotionlambda-[a-z0-9-]+\.s3(?:\.[a-z0-9-]+)?\.amazonaws\.com$/.test(host)
	) {
		return { ok: true, url: videoUrl };
	}

	// Remotion Lambda S3 — path style: s3.<region>.amazonaws.com/remotionlambda-.../...
	if (
		/^s3(?:\.[a-z0-9-]+)?\.amazonaws\.com$/.test(host) &&
		parsed.pathname.startsWith("/remotionlambda-")
	) {
		return { ok: true, url: videoUrl };
	}

	return {
		ok: false,
		response: NextResponse.json(
			{ error: "videoUrl must be an R2 or Remotion Lambda storage URL" },
			{ status: 400 },
		),
	};
}

// ── Token helpers ─────────────────────────────────────────────────────────────

/** Returns the access token, refreshing it first if it has expired. */
async function getValidToken(conn: any): Promise<string | null> {
	if (!conn.token_expires_at) return conn.access_token as string;
	const expiresAt = new Date(conn.token_expires_at).getTime();
	// If more than 60 s remain, token is still good.
	if (expiresAt > Date.now() + 60_000) return conn.access_token as string;

	// YouTube supports refresh_token grants.
	if (conn.provider === "youtube" && conn.refresh_token) {
		return refreshYouTubeToken(conn);
	}

	// TikTok / Instagram — return as-is; let the API return a proper 401.
	return conn.access_token as string;
}

async function refreshYouTubeToken(conn: any): Promise<string | null> {
	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
	if (!clientId || !clientSecret || !conn.refresh_token) return null;

	const res = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			refresh_token: conn.refresh_token,
			grant_type: "refresh_token",
		}),
	});

	if (!res.ok) {
		logger.error("YouTube token refresh failed:", await res.text());
		return null;
	}

	const tokens = await res.json();
	const newExpiry = tokens.expires_in
		? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
		: null;

	await upsertSocialConnection({
		user_id: conn.user_id,
		provider: "youtube",
		access_token: tokens.access_token,
		refresh_token: conn.refresh_token,
		token_expires_at: newExpiry,
		provider_username: conn.provider_username,
		provider_user_id: conn.provider_user_id,
	});

	return tokens.access_token;
}

// ── YouTube ───────────────────────────────────────────────────────────────────

async function shareToYouTube(
	conn: any,
	videoUrl: string,
	title: string,
	description: string,
): Promise<NextResponse> {
	const accessToken = await getValidToken(conn);
	if (!accessToken) {
		return NextResponse.json(
			{
				error:
					"YouTube access token expired and could not be refreshed. Please reconnect your account in Settings.",
			},
			{ status: 401 },
		);
	}

	// Download the video to a Buffer first.
	// We were previously streaming Response.body straight into the YouTube PUT;
	// that path silently transmits 0 bytes in some Node.js / Vercel edge cases —
	// YouTube returned 200 OK on a metadata-only stub and the video never appeared.
	// Buffering is reliable and our maxDuration is high enough to cover it.
	logger.log(`[youtube] Downloading video from storage: ${videoUrl}`);
	const videoRes = await fetch(videoUrl);
	if (!videoRes.ok || !videoRes.body) {
		return NextResponse.json(
			{
				error: `Failed to fetch video from storage (HTTP ${videoRes.status}).`,
			},
			{ status: 502 },
		);
	}
	const arrayBuf = await videoRes.arrayBuffer();
	const videoBuffer = Buffer.from(arrayBuf);
	const contentLength = String(videoBuffer.byteLength);
	logger.log(`[youtube] Buffered ${videoBuffer.byteLength} bytes`);
	if (videoBuffer.byteLength === 0) {
		return NextResponse.json(
			{ error: "Storage returned 0 bytes — the rendered video is empty." },
			{ status: 502 },
		);
	}

	const metadata = {
		snippet: {
			title: title.slice(0, 100),
			description: description.slice(0, 5000),
			tags: ["FusionAI Video Editor"],
		},
		status: { privacyStatus: "private" },
	};

	// Step 1 — initiate a resumable upload session.
	const initRes = await fetch(
		"https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
				"X-Upload-Content-Type": "video/mp4",
				"X-Upload-Content-Length": contentLength,
			},
			body: JSON.stringify(metadata),
		},
	);

	if (!initRes.ok) {
		const err = await initRes.text();
		logger.error("YouTube resumable upload init failed:", err);
		if (initRes.status === 401) {
			return NextResponse.json(
				{ error: "YouTube authorization expired. Please reconnect your account." },
				{ status: 401 },
			);
		}
		// Surface specific Google API misconfig errors so the user sees them.
		try {
			const parsed = JSON.parse(err);
			const reason: string | undefined = parsed?.error?.errors?.[0]?.reason;
			const message: string | undefined = parsed?.error?.message;
			if (reason === "accessNotConfigured") {
				return NextResponse.json(
					{
						error:
							"YouTube Data API v3 is not enabled on your Google Cloud project. Enable it in the Google Cloud Console and try again.",
					},
					{ status: 502 },
				);
			}
			if (reason === "quotaExceeded") {
				return NextResponse.json(
					{ error: "YouTube daily upload quota exceeded — try again tomorrow." },
					{ status: 502 },
				);
			}
			if (message) {
				return NextResponse.json(
					{ error: `YouTube rejected the upload: ${message}` },
					{ status: 502 },
				);
			}
		} catch {
			// fall through to generic
		}
		return NextResponse.json(
			{ error: `YouTube upload setup failed (${initRes.status})` },
			{ status: 502 },
		);
	}

	const uploadUrl = initRes.headers.get("location");
	if (!uploadUrl) {
		return NextResponse.json(
			{ error: "YouTube did not return an upload URL." },
			{ status: 502 },
		);
	}

	// Step 2 — PUT the buffered video.
	logger.log(`[youtube] PUT ${contentLength} bytes to upload session`);
	const uploadRes = await fetch(uploadUrl, {
		method: "PUT",
		headers: {
			"Content-Type": "video/mp4",
			"Content-Length": contentLength,
		},
		body: videoBuffer,
	});

	if (!uploadRes.ok) {
		const err = await uploadRes.text();
		logger.error("YouTube upload PUT failed:", err);
		return NextResponse.json(
			{ error: `YouTube upload failed (${uploadRes.status}): ${err.slice(0, 300)}` },
			{ status: 502 },
		);
	}

	const result = await uploadRes.json().catch(() => null);
	const videoId: string | undefined = result?.id;
	if (!videoId) {
		logger.error(
			"YouTube upload returned 200 but no video id:",
			JSON.stringify(result),
		);
		return NextResponse.json(
			{
				error:
					"YouTube accepted the upload but did not return a video id. Try again.",
			},
			{ status: 502 },
		);
	}
	logger.log(`[youtube] Upload complete — videoId=${videoId}`);

	return NextResponse.json({
		success: true,
		platform: "youtube",
		url: `https://www.youtube.com/watch?v=${videoId}`,
		videoId,
		// Embeddable URL the UI can render in an iframe.
		embedUrl: `https://www.youtube.com/embed/${videoId}`,
		// Privacy is "private" — surface this in the UI so the user knows.
		privacy: "private",
	});
}

// ── TikTok ────────────────────────────────────────────────────────────────────

async function shareToTikTok(
	conn: any,
	videoUrl: string,
	caption: string,
	privacyLevel: string,
): Promise<NextResponse> {
	const accessToken = await getValidToken(conn);
	if (!accessToken) {
		return NextResponse.json(
			{ error: "TikTok access token expired. Please reconnect your account." },
			{ status: 401 },
		);
	}

	// TikTok Content Posting API v2 — PULL_FROM_URL: TikTok fetches from the URL directly.
	const res = await fetch(
		"https://open.tiktokapis.com/v2/post/publish/video/init/",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json; charset=UTF-8",
			},
			body: JSON.stringify({
				post_info: {
					title: caption.slice(0, 150) || "My Video",
					privacy_level: privacyLevel || "SELF_ONLY",
					disable_duet: false,
					disable_comment: false,
					disable_stitch: false,
				},
				source_info: {
					source: "PULL_FROM_URL",
					video_url: videoUrl,
				},
			}),
		},
	);

	if (!res.ok) {
		const err = await res.text();
		logger.error("TikTok publish init failed:", err);
		if (res.status === 401) {
			return NextResponse.json(
				{ error: "TikTok authorization expired. Please reconnect your account." },
				{ status: 401 },
			);
		}
		return NextResponse.json(
			{ error: `TikTok upload failed (${res.status})` },
			{ status: 502 },
		);
	}

	const data = await res.json();
	// TikTok returns error.code === "ok" (string) on success
	if (data.error?.code && data.error.code !== "ok") {
		logger.error("TikTok publish error:", data.error);
		return NextResponse.json(
			{ error: data.error.message || "TikTok upload failed" },
			{ status: 502 },
		);
	}

	return NextResponse.json({
		success: true,
		platform: "tiktok",
		publishId: data.data?.publish_id,
	});
}

// ── Instagram ─────────────────────────────────────────────────────────────────

async function shareToInstagram(
	conn: any,
	videoUrl: string,
	caption: string,
): Promise<NextResponse> {
	const accessToken = conn.access_token as string;
	const igUserId = (conn as any).provider_user_id as string | null;

	if (!igUserId) {
		return NextResponse.json(
			{
				error:
					"Instagram user ID not found. Please disconnect and reconnect your Instagram account in Settings.",
			},
			{ status: 400 },
		);
	}

	// Step 1 — create a Reels media container (Instagram fetches from URL).
	const containerBody = new URLSearchParams({
		media_type: "REELS",
		video_url: videoUrl,
		caption: caption.slice(0, 2200),
		access_token: accessToken,
	});

	const containerRes = await fetch(
		`https://graph.instagram.com/v20.0/${igUserId}/media`,
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: containerBody,
		},
	);

	if (!containerRes.ok) {
		const err = await containerRes.json().catch(() => ({}));
		logger.error("Instagram media container creation failed:", err);
		return NextResponse.json(
			{
				error:
					(err as any)?.error?.message ||
					"Failed to create Instagram media container. Ensure you have a Creator or Business account.",
			},
			{ status: 502 },
		);
	}

	const { id: creationId } = await containerRes.json();

	// Step 2 — poll until Instagram finishes processing the video (up to 2 min).
	let statusCode = "IN_PROGRESS";
	for (let i = 0; i < 60; i++) {
		await new Promise((r) => setTimeout(r, 2000));
		const statusRes = await fetch(
			`https://graph.instagram.com/v20.0/${creationId}?fields=status_code&access_token=${accessToken}`,
		);
		if (statusRes.ok) {
			const statusData = await statusRes.json();
			statusCode = statusData.status_code as string;
			if (statusCode === "FINISHED") break;
			if (statusCode === "ERROR" || statusCode === "EXPIRED") {
				return NextResponse.json(
					{ error: `Instagram video processing failed with status: ${statusCode}` },
					{ status: 502 },
				);
			}
		}
	}

	if (statusCode !== "FINISHED") {
		return NextResponse.json(
			{ error: "Instagram video processing timed out. Try again." },
			{ status: 504 },
		);
	}

	// Step 3 — publish.
	const publishBody = new URLSearchParams({
		creation_id: creationId,
		access_token: accessToken,
	});

	const publishRes = await fetch(
		`https://graph.instagram.com/v20.0/${igUserId}/media_publish`,
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: publishBody,
		},
	);

	if (!publishRes.ok) {
		const err = await publishRes.json().catch(() => ({}));
		logger.error("Instagram media_publish failed:", err);
		return NextResponse.json(
			{
				error:
					(err as any)?.error?.message || "Failed to publish video to Instagram.",
			},
			{ status: 502 },
		);
	}

	const { id: mediaId } = await publishRes.json();

	return NextResponse.json({
		success: true,
		platform: "instagram",
		mediaId,
		// Instagram doesn't expose a direct post URL via API; link to profile instead.
		url: `https://www.instagram.com/`,
	});
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
	const user = await getUserFromRequest();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: {
		platform?: string;
		videoUrl?: string;
		title?: string;
		description?: string;
		caption?: string;
		privacyLevel?: string;
	};
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const {
		platform,
		videoUrl,
		title = "My Video",
		description = "",
		caption = "",
		privacyLevel = "SELF_ONLY",
	} = body;

	if (!platform || !videoUrl) {
		return NextResponse.json(
			{ error: "platform and videoUrl are required" },
			{ status: 400 },
		);
	}

	if (!["youtube", "instagram", "tiktok"].includes(platform)) {
		return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
	}

	const urlCheck = validateVideoUrl(videoUrl);
	if (!urlCheck.ok) return urlCheck.response;

	const conn = await getSocialConnection(
		user.id,
		platform as "youtube" | "instagram" | "tiktok",
	);
	if (!conn || !conn.access_token) {
		return NextResponse.json(
			{
				error: `Not connected to ${platform}. Connect in Settings → Connections.`,
			},
			{ status: 400 },
		);
	}

	try {
		if (platform === "youtube") {
			return shareToYouTube(conn, videoUrl, title, description);
		}
		if (platform === "tiktok") {
			return shareToTikTok(conn, videoUrl, caption || title, privacyLevel);
		}
		if (platform === "instagram") {
			return shareToInstagram(conn, videoUrl, caption || description);
		}
	} catch (err) {
		logger.error(`${platform} share unexpected error:`, err);
		return NextResponse.json(
			{
				error: `Failed to share to ${platform}`,
				detail: err instanceof Error ? err.message : String(err),
			},
			{ status: 500 },
		);
	}

	return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
}
