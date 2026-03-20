/**
 * Authentication helpers for API routes
 * Accepts Firebase session cookie OR Authorization: Bearer <id-token>
 */

import { cookies, headers } from "next/headers";
import { adminAuth } from "./firebase-admin";

export interface AuthUser {
	id: string;
	email: string;
}

/**
 * Get authenticated user from request.
 * Tries (in order):
 *   1. Authorization: Bearer <firebase-id-token>  (sent by client fetch calls)
 *   2. session cookie                              (set at login, browser sends automatically)
 */
export async function getUserFromRequest(): Promise<AuthUser | null> {
	try {
		// --- Strategy 1: Bearer token from Authorization header ---
		const headerStore = await headers();
		const authHeader = headerStore.get("authorization");

		if (authHeader?.startsWith("Bearer ")) {
			const idToken = authHeader.slice(7).trim();
			try {
				const decoded = await adminAuth.verifyIdToken(idToken);
				return {
					id: decoded.uid,
					email: decoded.email || "",
				};
			} catch {
				// Fall through to try session cookie
			}
		}

		// --- Strategy 2: Session cookie (set at login) ---
		const cookieStore = await cookies();
		const sessionCookie = cookieStore.get("session")?.value;

		if (!sessionCookie) {
			return null;
		}

		const decodedClaims = await adminAuth.verifySessionCookie(
			sessionCookie,
			true,
		);
		return {
			id: decodedClaims.uid,
			email: decodedClaims.email || "",
		};
	} catch (error) {
		console.error("❌ Auth error:", error);
		return null;
	}
}
