import { NextRequest, NextResponse } from "next/server";

/**
 * Video Stream API Route
 *
 * Streams video bytes directly from R2/CDN back to the caller.
 * Used exclusively by the timeline thumbnail generator (prepareAssets,
 * extractVideoThumbnail) which needs a same-origin response so that:
 *   - fetch() can read the response body without CORS restrictions
 *   - <video crossOrigin="anonymous"> can capture frames to canvas
 *
 * The main /api/video-proxy route issues a 307 redirect (no FOT cost,
 * optimal for browser playback). But thumbnail generation calls
 * getFileFromUrl() which downloads the full file — that path requires the
 * proxy to actually stream bytes, not redirect, otherwise the browser makes
 * a cross-origin request to R2 and CORS headers on the bucket are required.
 *
 * Range requests are proxied transparently so the browser's <video> element
 * can seek before capturing the thumbnail frame.
 *
 * Usage: /api/video-stream?url=https://pub-xxx.r2.dev/path/to/video.mp4
 */

// Edge runtime: globally distributed, no cold starts, ~10 ms startup.
export const runtime = "edge";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const FETCH_TIMEOUT_MS = 25000;

async function fetchWithRetry(
	url: string,
	options: RequestInit,
	retries = MAX_RETRIES,
): Promise<Response> {
	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= retries; attempt++) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal,
			});
			clearTimeout(timeoutId);
			return response;
		} catch (error) {
			clearTimeout(timeoutId);
			lastError = error as Error;
			if (attempt < retries) {
				await new Promise((resolve) =>
					setTimeout(resolve, RETRY_DELAY_MS * attempt),
				);
			}
		}
	}

	throw lastError ?? new Error("Fetch failed after retries");
}

// SSRF allowlist — same as video-proxy.
const ALLOWED_DOMAINS = [
	".r2.dev",
	"pexels.com",
	"player.vimeo.com",
	"cdn.designcombo.dev",
	"videos.pexels.com",
	"docs.google.com",
	"drive.google.com",
];

function isAllowed(url: string): boolean {
	return ALLOWED_DOMAINS.some((d) => url.includes(d));
}

function validateUrl(
	raw: string | null,
): { url: string } | { error: string; status: number } {
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

	const range = request.headers.get("range");

	const fetchHeaders: HeadersInit = {
		Accept: "*/*",
		Connection: "keep-alive",
	};
	if (range) fetchHeaders["Range"] = range;

	let upstream: Response;
	try {
		upstream = await fetchWithRetry(result.url, { headers: fetchHeaders });
	} catch {
		return NextResponse.json(
			{ error: "Failed to connect to video source" },
			{ status: 504 },
		);
	}

	if (!upstream.ok && upstream.status !== 206) {
		return NextResponse.json(
			{ error: "Failed to fetch video", status: upstream.status },
			{ status: upstream.status },
		);
	}

	const headers = new Headers();

	const ct = upstream.headers.get("content-type") || "video/mp4";
	headers.set("Content-Type", ct);

	const cl = upstream.headers.get("content-length");
	if (cl) headers.set("Content-Length", cl);

	const cr = upstream.headers.get("content-range");
	if (cr) headers.set("Content-Range", cr);

	headers.set("Accept-Ranges", "bytes");
	// Cache at edge — repeated thumbnail loads for the same video skip the origin.
	headers.set("Cache-Control", "public, max-age=31536000, immutable");
	headers.set("Vary", "Range");
	// Wide-open CORS: this route is only called from the same origin (thumbnail
	// generator), but the header is harmless and avoids any edge case.
	headers.set("Access-Control-Allow-Origin", "*");
	headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
	headers.set("Access-Control-Allow-Headers", "Range, Content-Type, Accept");
	headers.set(
		"Access-Control-Expose-Headers",
		"Content-Length, Content-Range, Accept-Ranges",
	);

	return new NextResponse(upstream.body, {
		status: upstream.status,
		headers,
	});
}

export async function HEAD(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const result = validateUrl(searchParams.get("url"));

	if ("error" in result) {
		return new NextResponse(null, { status: result.status });
	}

	let upstream: Response;
	try {
		upstream = await fetchWithRetry(result.url, { method: "HEAD" });
	} catch {
		return new NextResponse(null, { status: 504 });
	}

	const headers = new Headers();
	const ct = upstream.headers.get("content-type");
	if (ct) headers.set("Content-Type", ct);
	const cl = upstream.headers.get("content-length");
	if (cl) headers.set("Content-Length", cl);
	headers.set("Accept-Ranges", "bytes");
	headers.set("Access-Control-Allow-Origin", "*");

	return new NextResponse(null, { status: 200, headers });
}

export async function OPTIONS(request: NextRequest) {
	const origin = request.headers.get("origin");
	return new NextResponse(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": origin ?? "*",
			"Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
			"Access-Control-Allow-Headers": "Range, Content-Type, Accept",
			"Access-Control-Expose-Headers":
				"Content-Length, Content-Range, Accept-Ranges",
			"Access-Control-Max-Age": "86400",
		},
	});
}
