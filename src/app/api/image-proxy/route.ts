import { NextRequest, NextResponse } from "next/server";

// Edge runtime — no cold starts, globally distributed, ideal for a passthrough redirect.
// The previous Node.js runtime + requireAuth() caused two problems:
//   1. Node runtime has 1–3 s cold start vs ~10 ms for Edge.
//   2. requireAuth() checked the session cookie, which Lambda and Remotion's
//      <Img crossOrigin="anonymous"> cannot send — causing 401 failures during render.
// Images are on a public R2 bucket, so no auth is required at the origin level.
export const runtime = "edge";

/**
 * Image / Media Proxy API Route
 *
 * Issues a 307 Temporary Redirect to the R2 URL instead of streaming bytes
 * through Vercel origin. This eliminates Fast Origin Transfer costs — the
 * browser fetches images directly from Cloudflare R2, which serves them with
 * CORS headers (Access-Control-Allow-Origin: *) for crossOrigin="anonymous"
 * requests from the Remotion player.
 *
 * The redirect response is edge-cached (Cache-Control: immutable) so repeat
 * loads of the same image URL never reach the origin function.
 *
 * Usage: /api/image-proxy?url=https://pub-xxx.r2.dev/path/to/image.jpg
 */

function validateUrl(raw: string | null): { url: string } | { error: string; status: number } {
	if (!raw) return { error: "Missing url parameter", status: 400 };

	// Only redirect to R2 public buckets — prevents SSRF to arbitrary hosts.
	if (!raw.includes(".r2.dev")) {
		return { error: "Only R2 URLs are supported", status: 400 };
	}

	try {
		new URL(raw);
	} catch {
		return { error: "Invalid URL format", status: 400 };
	}

	return { url: raw };
}

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const result = validateUrl(searchParams.get("url"));

	if ("error" in result) {
		return NextResponse.json({ error: result.error }, { status: result.status });
	}

	// 307 preserves the HTTP method. R2 public buckets respond with
	// Access-Control-Allow-Origin: * for GET requests, satisfying Remotion's
	// crossOrigin="anonymous" requirement on <Img> elements.
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
