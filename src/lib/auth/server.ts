/**
 * Clean Firebase Admin Authentication
 * No mock tokens, no hacks - proper server-side auth
 */

import * as admin from "firebase-admin";

const isProd = process.env.NODE_ENV === "production";

/**
 * Initialize Firebase Admin SDK (singleton with proper app reuse)
 */
export function getFirebaseAdmin(): admin.app.App {
	// Check if app already exists (handles Next.js hot-reload)
	const apps = admin.apps;
	if (apps.length > 0 && apps[0]) {
		if (!isProd) console.log("♻️ Reusing existing Firebase Admin app");
		return apps[0];
	}

	try {
		// Parse service account from environment
		const serviceAccount = JSON.parse(
			process.env.FIREBASE_SERVICE_ACCOUNT || "{}",
		);

		if (!serviceAccount.project_id) {
			throw new Error("FIREBASE_SERVICE_ACCOUNT is not properly configured");
		}

		const app = admin.initializeApp({
			credential: admin.credential.cert(serviceAccount),
			projectId: process.env.FIREBASE_PROJECT_ID,
		});

		if (!isProd) console.log("✅ Firebase Admin initialized");
		return app;
	} catch (error) {
		console.error("❌ Firebase Admin initialization failed:", error);
		throw new Error(
			`Firebase Admin init failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Get Firebase Auth instance
 */
export function getAuth(): admin.auth.Auth {
	return admin.auth(getFirebaseAdmin());
}

/**
 * Verify Firebase ID token and extract user ID
 * Returns user ID on success, throws Error on failure
 *
 * @param idToken - Firebase ID token from client
 * @returns userId
 * @throws Error if token is invalid/expired
 */
export async function verifyIdToken(idToken: string): Promise<string> {
	try {
		const decodedToken = await getAuth().verifyIdToken(idToken, true); // checkRevoked = true
		return decodedToken.uid;
	} catch (error) {
		if (!isProd) {
			console.error(
				"❌ Token verification failed:",
				error instanceof Error ? error.message : error,
			);
		}

		if (error instanceof Error) {
			// Check for common Firebase Auth errors
			if (error.message.includes("expired")) {
				throw new Error(
					"Token has expired. Please refresh the page and try again.",
				);
			} else if (error.message.includes("revoked")) {
				throw new Error("Token has been revoked. Please log in again.");
			} else if (error.message.includes("invalid")) {
				throw new Error("Invalid token. Please log in again.");
			} else {
				throw new Error(`Authentication failed: ${error.message}`);
			}
		}

		throw new Error("Authentication failed");
	}
}

/**
 * Extract user ID from Authorization header
 * Expected format: "Bearer <firebase-id-token>"
 *
 * @param authHeader - Authorization header value
 * @returns userId
 * @throws Error if header is missing/malformed or token is invalid
 */
export async function getUserFromAuthHeader(
	authHeader: string | null,
): Promise<string> {
	if (!authHeader) {
		throw new Error("No authorization header provided. Please log in.");
	}

	const parts = authHeader.split(" ");
	if (parts.length !== 2 || parts[0] !== "Bearer") {
		throw new Error("Invalid authorization format. Expected 'Bearer <token>'");
	}

	const token = parts[1];
	if (!token || token.length < 10) {
		throw new Error("Empty or invalid token");
	}

	return verifyIdToken(token);
}
