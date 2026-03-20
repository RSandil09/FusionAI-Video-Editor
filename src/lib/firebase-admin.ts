/**
 * Firebase Admin SDK initialization
 * Used for server-side authentication verification
 */

import * as admin from "firebase-admin";

// Skip initialization during build when using dummy credentials (e.g. CI)
function isDummyFirebaseConfig(): boolean {
	const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
	if (sa) {
		try {
			const parsed = JSON.parse(sa);
			if (parsed.project_id === "dummy" || !parsed.private_key) return true;
		} catch {
			// ignore
		}
	}
	return process.env.FIREBASE_PROJECT_ID === "dummy";
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
	try {
		if (isDummyFirebaseConfig()) {
			// Use a minimal valid cert so the app can build; auth will fail at runtime if used
			admin.initializeApp({
				credential: admin.credential.cert({
					projectId: "dummy",
					clientEmail: "dummy@dummy.iam.gserviceaccount.com",
					privateKey:
						"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7\n-----END PRIVATE KEY-----\n",
				}),
			});
			console.log("✅ Firebase Admin initialized (build mode)");
		} else {
		let credential;

		// Check if we have a service account JSON (from .env.local)
		if (process.env.FIREBASE_SERVICE_ACCOUNT) {
			try {
				const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
				credential = admin.credential.cert(serviceAccount);
				console.log("✅ Using FIREBASE_SERVICE_ACCOUNT JSON");
			} catch (parseError) {
				console.error(
					"❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:",
					parseError,
				);
				throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT JSON format");
			}
		}
		// Fallback to individual environment variables
		else if (
			process.env.FIREBASE_PROJECT_ID &&
			process.env.FIREBASE_CLIENT_EMAIL &&
			process.env.FIREBASE_PRIVATE_KEY
		) {
			credential = admin.credential.cert({
				projectId: process.env.FIREBASE_PROJECT_ID,
				clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
				// Replace \\n characters in the private key
				privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
			});
			console.log("✅ Using individual Firebase env vars");
		} else {
			const errorMsg =
				"Missing Firebase credentials. Set either FIREBASE_SERVICE_ACCOUNT or individual FIREBASE_* variables";
			console.error("❌", errorMsg);
			throw new Error(errorMsg);
		}

		admin.initializeApp({ credential });
		console.log("✅ Firebase Admin initialized successfully");
		}
	} catch (error) {
		console.error("❌ Firebase Admin initialization error:", error);
		// Re-throw to make it clear this is a critical error
		throw error;
	}
}

export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();
