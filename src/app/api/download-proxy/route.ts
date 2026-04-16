import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";

// Trusted origins we'll proxy — Lambda S3 bucket and any Remotion CDN
const ALLOWED_ORIGINS = [
	"amazonaws.com",
	"cloudfront.net",
];

function isTrustedUrl(url: string): boolean {
	try {
		const { hostname } = new URL(url);
		return ALLOWED_ORIGINS.some(
			(origin) => hostname === origin || hostname.endsWith(`.${origin}`),
		);
	} catch {
		return false;
	}
}

export async function GET(request: NextRequest) {
	const user = await getUserFromRequest();
	if (!user) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const fileUrl = request.nextUrl.searchParams.get("url");
	const filename = request.nextUrl.searchParams.get("filename") ?? "export.mp4";

	if (!fileUrl) {
		return NextResponse.json({ message: "url param is required" }, { status: 400 });
	}

	if (!isTrustedUrl(fileUrl)) {
		return NextResponse.json({ message: "URL not allowed" }, { status: 403 });
	}

	const upstream = await fetch(fileUrl);

	if (!upstream.ok || !upstream.body) {
		return NextResponse.json(
			{ message: "Failed to fetch file from storage" },
			{ status: 502 },
		);
	}

	const contentType =
		upstream.headers.get("content-type") ?? "application/octet-stream";
	const contentLength = upstream.headers.get("content-length");

	const headers: Record<string, string> = {
		"Content-Type": contentType,
		"Content-Disposition": `attachment; filename="${filename}"`,
		"Cache-Control": "private, max-age=3600",
	};
	if (contentLength) headers["Content-Length"] = contentLength;

	return new NextResponse(upstream.body, { headers });
}
