import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js middleware - runs on every request.
 * Adds security headers. Auth is enforced per-route.
 */
export function middleware(request: NextRequest) {
	const response = NextResponse.next();

	// Security headers
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set(
		"Permissions-Policy",
		"camera=(), microphone=(), geolocation=()",
	);

	return response;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization)
		 * - favicon.ico
		 * - public folder
		 */
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
	],
};
