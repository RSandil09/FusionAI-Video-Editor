import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large videos

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Fetch with timeout and retry logic
 */
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

			const isTimeout =
				(error as Error).name === "AbortError" ||
				(error as any)?.cause?.code === "UND_ERR_CONNECT_TIMEOUT";

			logger.warn(
				`Video proxy fetch attempt ${attempt}/${retries} failed:`,
				isTimeout ? "Connection timeout" : (error as Error).message,
			);

			if (attempt < retries) {
				// Wait before retrying with exponential backoff
				await new Promise((resolve) =>
					setTimeout(resolve, RETRY_DELAY_MS * attempt),
				);
			}
		}
	}

	throw lastError || new Error("Fetch failed after retries");
}

/**
 * Video Proxy API Route
 * Optimized for streaming video files with range request support
 * Requires authentication. Session cookie or Bearer token.
 *
 * Usage: /api/video-proxy?url=https://pub-xxx.r2.dev/path/to/video.mp4
 */
export async function GET(request: NextRequest) {
	// No auth check — videos are on a public R2 bucket (already accessible without
	// credentials). The URL allowlist below prevents SSRF. Auth would break the
	// Remotion player iframe and the <video crossOrigin="anonymous"> metadata fetch
	// inside @designcombo/state, both of which can't send the session cookie.
	try {
		const { searchParams } = new URL(request.url);
		const videoUrl = searchParams.get("url");

		if (!videoUrl) {
			return NextResponse.json(
				{ error: "Missing url parameter" },
				{ status: 400 },
			);
		}

		// Validate URL format
		try {
			new URL(videoUrl);
		} catch {
			return NextResponse.json(
				{ error: "Invalid URL format" },
				{ status: 400 },
			);
		}

		// Security: Only allow specific domains
		const allowedDomains = [
			".r2.dev", // Cloudflare R2
			"pexels.com", // Pexels videos
			"player.vimeo.com", // Vimeo
			"cdn.designcombo.dev", // DesignCombo CDN
			"videos.pexels.com", // Pexels video CDN
			"docs.google.com", // YouTube Audio Library (Google Drive)
			"drive.google.com", // YouTube Audio Library (Google Drive)
		];

		const isAllowedDomain = allowedDomains.some((domain) =>
			videoUrl.includes(domain),
		);
		if (!isAllowedDomain) {
			logger.warn(
				"Video proxy: blocked URL from non-allowed domain:",
				videoUrl,
			);
			return NextResponse.json(
				{ error: "URL domain not allowed" },
				{ status: 403 },
			);
		}

		// Get range header for video seeking
		const range = request.headers.get("range");

		const fetchHeaders: HeadersInit = {
			Accept: "*/*",
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		};

		if (range) {
			fetchHeaders["Range"] = range;
		}

		// Fetch with retry logic
		let response: Response;
		try {
			response = await fetchWithRetry(videoUrl, { headers: fetchHeaders });
		} catch (fetchError) {
			const errorMessage =
				(fetchError as Error).message || "Unknown fetch error";
			logger.error("Video proxy: All fetch attempts failed for:", videoUrl);
			logger.error("Error details:", errorMessage);

			// Return a more helpful error
			return NextResponse.json(
				{
					error: "Failed to connect to video source",
					details:
						"Connection timeout - the video server may be temporarily unavailable",
					suggestion:
						"Try refreshing the page or check your network connection",
				},
				{ status: 504 }, // Gateway Timeout
			);
		}

		if (!response.ok && response.status !== 206) {
			logger.error("Video proxy: HTTP error:", response.status, videoUrl);
			return NextResponse.json(
				{ error: "Failed to fetch video", status: response.status },
				{ status: response.status },
			);
		}

		// Build response headers
		const responseHeaders = new Headers();

		// Content headers
		const contentType = response.headers.get("content-type") || "video/mp4";
		responseHeaders.set("Content-Type", contentType);

		const contentLength = response.headers.get("content-length");
		if (contentLength) {
			responseHeaders.set("Content-Length", contentLength);
		}

		const contentRange = response.headers.get("content-range");
		if (contentRange) {
			responseHeaders.set("Content-Range", contentRange);
		}

		// Enable range requests
		responseHeaders.set("Accept-Ranges", "bytes");

		// Cache for performance
		responseHeaders.set("Cache-Control", "public, max-age=31536000, immutable");

		// CORS headers - restrict to same origin; browsers send Origin on cross-origin media requests
		const requestOrigin = request.headers.get("origin");
		const appUrl = process.env.NEXT_PUBLIC_APP_URL;
		if (requestOrigin && appUrl && requestOrigin === appUrl) {
			responseHeaders.set("Access-Control-Allow-Origin", requestOrigin);
		} else if (!requestOrigin) {
			// Same-origin or non-browser request (e.g. server-to-server) — allow
			responseHeaders.set("Access-Control-Allow-Origin", appUrl || "*");
		}
		// else: cross-origin from unknown domain — no ACAO header → browser will block
		responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
		responseHeaders.set(
			"Access-Control-Allow-Headers",
			"Range, Content-Type, Accept",
		);
		responseHeaders.set(
			"Access-Control-Expose-Headers",
			"Content-Length, Content-Range, Accept-Ranges",
		);

		// Stream the video
		return new NextResponse(response.body, {
			status: response.status,
			headers: responseHeaders,
		});
	} catch (error) {
		logger.error("Video proxy unexpected error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function OPTIONS(request: NextRequest) {
	const requestOrigin = request.headers.get("origin");
	const appUrl = process.env.NEXT_PUBLIC_APP_URL;
	const allowOrigin =
		requestOrigin && appUrl && requestOrigin === appUrl
			? requestOrigin
			: appUrl || "";
	return new NextResponse(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": allowOrigin,
			"Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
			"Access-Control-Allow-Headers": "Range, Content-Type, Accept",
			"Access-Control-Expose-Headers":
				"Content-Length, Content-Range, Accept-Ranges",
			"Access-Control-Max-Age": "86400",
		},
	});
}

export async function HEAD(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const videoUrl = searchParams.get("url");

		if (!videoUrl) {
			return new NextResponse(null, { status: 400 });
		}

		// Validate URL format
		try {
			new URL(videoUrl);
		} catch {
			return new NextResponse(null, { status: 400 });
		}

		const response = await fetchWithRetry(videoUrl, { method: "HEAD" });

		const responseHeaders = new Headers();

		const contentType = response.headers.get("content-type");
		if (contentType) {
			responseHeaders.set("Content-Type", contentType);
		}

		const contentLength = response.headers.get("content-length");
		if (contentLength) {
			responseHeaders.set("Content-Length", contentLength);
		}

		responseHeaders.set("Accept-Ranges", "bytes");
		const headOrigin = request.headers.get("origin");
		const headAppUrl = process.env.NEXT_PUBLIC_APP_URL;
		if (headOrigin && headAppUrl && headOrigin === headAppUrl) {
			responseHeaders.set("Access-Control-Allow-Origin", headOrigin);
		} else if (headAppUrl) {
			responseHeaders.set("Access-Control-Allow-Origin", headAppUrl);
		}
		responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
		responseHeaders.set(
			"Access-Control-Allow-Headers",
			"Range, Content-Type, Accept",
		);
		responseHeaders.set(
			"Access-Control-Expose-Headers",
			"Content-Length, Content-Range, Accept-Ranges",
		);

		return new NextResponse(null, {
			status: 200,
			headers: responseHeaders,
		});
	} catch (error) {
		logger.error("Video proxy HEAD error:", error);
		return new NextResponse(null, { status: 504 });
	}
}
