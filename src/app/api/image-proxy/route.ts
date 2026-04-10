import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";

// Use Node runtime for better handling of large files
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds timeout

/**
 * Media Proxy API Route
 * Proxies R2 media files and adds CORS headers to fix crossOrigin issues
 * Requires authentication. Session cookie or Bearer token.
 *
 * Usage: /api/image-proxy?url=https://pub-xxx.r2.dev/path/to/media
 */
export async function GET(request: NextRequest) {
	const user = await requireAuth();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 second timeout

	try {
		const { searchParams } = new URL(request.url);
		const mediaUrl = searchParams.get("url");

		if (!mediaUrl) {
			return NextResponse.json(
				{ error: "Missing url parameter" },
				{ status: 400 },
			);
		}

		// Validate that it's an R2 URL
		if (!mediaUrl.includes(".r2.dev")) {
			logger.error("❌ Media proxy: Invalid URL (not R2):", mediaUrl);
			return NextResponse.json(
				{ error: "Invalid URL - must be R2 URL" },
				{ status: 400 },
			);
		}

		logger.log("🖼️ Media proxy request:", mediaUrl.slice(0, 100));

		// Forward Range header if present (important for video seeking)
		const range = request.headers.get("range");
		const fetchHeaders: HeadersInit = {
			Accept: "*/*",
		};
		if (range) {
			fetchHeaders["Range"] = range;
		}

		// Fetch from R2 with abort controller
		const mediaResponse = await fetch(mediaUrl, {
			headers: fetchHeaders,
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		logger.log(
			"📥 R2 response status:",
			mediaResponse.status,
			mediaResponse.statusText,
		);

		if (!mediaResponse.ok && mediaResponse.status !== 206) {
			logger.error(
				"❌ Failed to fetch from R2:",
				mediaResponse.status,
				mediaUrl,
			);
			return NextResponse.json(
				{
					error: "Failed to fetch resource from R2",
					status: mediaResponse.status,
				},
				{ status: mediaResponse.status },
			);
		}

		// Build response headers
		const responseHeaders = new Headers();

		// Essential headers for media playback
		const contentType = mediaResponse.headers.get("content-type");
		if (contentType) {
			responseHeaders.set("Content-Type", contentType);
		}

		const contentLength = mediaResponse.headers.get("content-length");
		if (contentLength) {
			responseHeaders.set("Content-Length", contentLength);
		}

		const contentRange = mediaResponse.headers.get("content-range");
		if (contentRange) {
			responseHeaders.set("Content-Range", contentRange);
		}

		// Always support range requests for video
		responseHeaders.set("Accept-Ranges", "bytes");

		// Cache control
		responseHeaders.set("Cache-Control", "public, max-age=31536000, immutable");

		// CORS headers — restrict to same origin
		const requestOrigin = request.headers.get("origin");
		const appUrl = process.env.NEXT_PUBLIC_APP_URL;
		if (requestOrigin && appUrl && requestOrigin === appUrl) {
			responseHeaders.set("Access-Control-Allow-Origin", requestOrigin);
		} else if (appUrl) {
			responseHeaders.set("Access-Control-Allow-Origin", appUrl);
		}
		responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
		responseHeaders.set("Access-Control-Allow-Headers", "Range, Content-Type");
		responseHeaders.set(
			"Access-Control-Expose-Headers",
			"Content-Length, Content-Range, Accept-Ranges",
		);

		// Stream the response
		return new NextResponse(mediaResponse.body, {
			status: mediaResponse.status,
			headers: responseHeaders,
		});
	} catch (error: any) {
		clearTimeout(timeoutId);

		if (error.name === "AbortError") {
			logger.error("Proxy timeout - request took too long");
			return NextResponse.json(
				{ error: "Request timeout - file too large or slow connection" },
				{ status: 504 },
			);
		}

		logger.error("Proxy error:", error);
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
			"Access-Control-Allow-Headers": "Range, Content-Type",
			"Access-Control-Expose-Headers":
				"Content-Length, Content-Range, Accept-Ranges",
			"Access-Control-Max-Age": "86400",
		},
	});
}

export async function HEAD(request: NextRequest) {
	const user = await requireAuth();
	if (!user) {
		return new NextResponse(null, { status: 401 });
	}

	try {
		const { searchParams } = new URL(request.url);
		const mediaUrl = searchParams.get("url");

		if (!mediaUrl || !mediaUrl.includes(".r2.dev")) {
			return new NextResponse(null, { status: 400 });
		}

		const mediaResponse = await fetch(mediaUrl, { method: "HEAD" });

		const responseHeaders = new Headers();

		if (mediaResponse.headers.get("content-type")) {
			responseHeaders.set(
				"Content-Type",
				mediaResponse.headers.get("content-type")!,
			);
		}
		if (mediaResponse.headers.get("content-length")) {
			responseHeaders.set(
				"Content-Length",
				mediaResponse.headers.get("content-length")!,
			);
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
		responseHeaders.set("Access-Control-Allow-Headers", "Range, Content-Type");
		responseHeaders.set(
			"Access-Control-Expose-Headers",
			"Content-Length, Content-Range, Accept-Ranges",
		);

		return new NextResponse(null, {
			status: 200,
			headers: responseHeaders,
		});
	} catch (error) {
		return new NextResponse(null, { status: 500 });
	}
}
