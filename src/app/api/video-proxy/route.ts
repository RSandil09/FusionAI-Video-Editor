import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Video Proxy API Route
 *
 * Issues a 307 Temporary Redirect to the original media URL instead of
 * streaming bytes through Vercel origin. This eliminates Fast Origin Transfer
 * costs entirely — the browser fetches directly from R2/CDN.
 *
 * 307 (vs 302) preserves the HTTP method and the Range header through the
 * redirect, so video seeking works correctly: the browser sends range requests
 * directly to R2, which natively supports byte-range serving.
 *
 * The redirect response itself is cached at Vercel's edge CDN
 * (Cache-Control: public, max-age=31536000), so repeat loads of the same URL
 * never reach the origin function at all.
 *
 * Usage: /api/video-proxy?url=https://pub-xxx.r2.dev/path/to/video.mp4
 */

// SSRF allowlist — only redirect to known-safe domains.
const ALLOWED_DOMAINS = [
	".r2.dev", // Cloudflare R2 public buckets
	"pexels.com", // Pexels stock videos
	"player.vimeo.com", // Vimeo embeds
	"cdn.designcombo.dev", // DesignCombo CDN
	"videos.pexels.com", // Pexels video CDN
	"docs.google.com", // Google Drive / YouTube Audio Library
	"drive.google.com", // Google Drive
];

function isAllowed(url: string): boolean {
	return ALLOWED_DOMAINS.some((domain) => url.includes(domain));
}

function validateUrl(raw: string | null): { url: string } | { error: string; status: number } {
	if (!raw) return { error: "Missing url parameter", status: 400 };
	try {
		new URL(raw);
	} catch {
		return { error: "Invalid URL format", status: 400 };
	}
	if (!isAllowed(raw)) return { error: "URL domain not allowed", status: 403 };
	return { url: raw };
}

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const result = validateUrl(searchParams.get("url"));

	if ("error" in result) {
		return NextResponse.json({ error: result.error }, { status: result.status });
	}

	// 307 preserves method + Range header — browsers and the Remotion player
	// follow this redirect transparently. R2 public buckets support CORS (ACAO: *)
	// and byte-range requests natively, so seeking continues to work after redirect.
	return NextResponse.redirect(result.url, {
		status: 307,
		headers: {
			// Cache the redirect at Vercel edge — repeat requests never hit origin.
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
}

export async function HEAD(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const result = validateUrl(searchParams.get("url"));

	if ("error" in result) {
		return new NextResponse(null, { status: result.status });
	}

	return NextResponse.redirect(result.url, {
		status: 307,
		headers: { "Cache-Control": "public, max-age=31536000, immutable" },
	});
}

export async function OPTIONS(request: NextRequest) {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL || "*";
	const origin = request.headers.get("origin");
	return new NextResponse(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": origin ?? appUrl,
			"Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
			"Access-Control-Allow-Headers": "Range, Content-Type, Accept",
			"Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
			"Access-Control-Max-Age": "86400",
		},
	});
}
