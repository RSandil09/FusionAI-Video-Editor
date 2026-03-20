import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Create session cookie API endpoint
 * Called after Firebase client-side login to create a server-side session
 * Rate limited to prevent brute-force attacks.
 */
export async function POST(request: Request) {
	// Rate limit: 30 attempts per minute per IP
	const ip = getClientIp(request);
	const rl = checkRateLimit(`auth-session:${ip}`, 30, 60_000);
	if (!rl.success) {
		return NextResponse.json(
			{ message: "Too many login attempts. Try again later." },
			{ status: 429, headers: { "Retry-After": String(rl.resetIn) } },
		);
	}

	try {
		console.log("🔵 /api/auth/session POST request received");

		const { idToken } = await request.json();

		if (!idToken) {
			console.error("❌ No idToken provided");
			return NextResponse.json(
				{ message: "ID token is required" },
				{ status: 400 },
			);
		}

		// Verify the ID token first
		const decodedToken = await adminAuth.verifyIdToken(idToken);
		console.log("✅ ID token verified for user:", decodedToken.uid);

		// Set session expiration to 14 days (in milliseconds)
		const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days

		// Create the session cookie
		const sessionCookie = await adminAuth.createSessionCookie(idToken, {
			expiresIn,
		});

		console.log("✅ Session cookie created");

		// Set the cookie
		const cookieStore = await cookies();
		cookieStore.set("session", sessionCookie, {
			maxAge: expiresIn / 1000, // Convert to seconds
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
		});

		console.log("✅ Session cookie set in response");

		return NextResponse.json(
			{
				success: true,
				message: "Session created successfully",
				uid: decodedToken.uid,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("❌ Session creation error:", error);
		return NextResponse.json(
			{
				message: "Failed to create session",
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}

/**
 * Delete session cookie (logout)
 */
export async function DELETE() {
	try {
		console.log("🔵 /api/auth/session DELETE request received");

		const cookieStore = await cookies();
		cookieStore.delete("session");

		console.log("✅ Session cookie deleted");

		return NextResponse.json(
			{ success: true, message: "Session deleted" },
			{ status: 200 },
		);
	} catch (error) {
		console.error("❌ Session deletion error:", error);
		return NextResponse.json(
			{
				message: "Failed to delete session",
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
