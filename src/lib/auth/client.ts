/**
 * Clean Firebase Client Authentication
 * Proper initialization with clear error messages
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

let firebaseApp: FirebaseApp | undefined;
let firebaseAuth: Auth | undefined;

/**
 * Firebase client configuration from environment variables
 */
const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Check if Firebase client configuration is available
 */
export function isFirebaseConfigured(): boolean {
	return !!(
		firebaseConfig.apiKey &&
		firebaseConfig.authDomain &&
		firebaseConfig.projectId
	);
}

/**
 * Initialize Firebase client app (singleton)
 */
export function getFirebaseApp(): FirebaseApp {
	if (firebaseApp) {
		return firebaseApp;
	}

	if (!isFirebaseConfigured()) {
		throw new Error(
			"Firebase client is not configured. Add NEXT_PUBLIC_FIREBASE_* environment variables to .env.local",
		);
	}

	// Initialize only if not already initialized
	const apps = getApps();
	if (apps.length > 0) {
		firebaseApp = apps[0];
	} else {
		firebaseApp = initializeApp(firebaseConfig);
	}

	console.log("✅ Firebase client initialized");
	return firebaseApp;
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth(): Auth {
	if (firebaseAuth) {
		return firebaseAuth;
	}

	const app = getFirebaseApp();
	firebaseAuth = getAuth(app);
	return firebaseAuth;
}

/**
 * Get current Firebase ID token
 * CRITICAL: Always waits for auth to be ready and forces token refresh
 * @returns ID token or null if not authenticated
 * Get the current user's Firebase ID token
 * ALWAYS forces a refresh to ensure the token is fresh
 * Retries on failure to handle race conditions
 *
 * @param retryCount - Internal retry counter (don't pass this manually)
 * @returns Firebase ID token or null if not authenticated
 */
export async function getIdToken(retryCount = 0): Promise<string | null> {
	if (!isFirebaseConfigured()) {
		console.warn("⚠️ Firebase not configured - cannot get ID token");
		return null;
	}

	const auth = getFirebaseAuth();

	// Wait for auth to initialize (max 5 seconds) if currentUser is not immediately available
	if (!auth.currentUser) {
		console.log("⏳ Waiting for auth to initialize...");
		await new Promise<void>((resolve) => {
			const unsubscribe = auth.onAuthStateChanged((user) => {
				unsubscribe();
				resolve();
			});
			// Timeout after 5 seconds
			setTimeout(() => {
				unsubscribe();
				resolve();
			}, 5000);
		});
	}

	const user = auth.currentUser;

	if (!user) {
		console.warn("⚠️ No user logged in - cannot get ID token");
		return null;
	}

	try {
		console.log("🔑 Getting fresh Firebase ID token for:", user.email);
		console.log("   Attempt:", retryCount + 1);

		// CRITICAL: Always force refresh to ensure token is valid
		const token = await user.getIdToken(true);

		// Validate token length (Firebase tokens are typically 800-1200 characters)
		if (!token || token.length < 100) {
			console.error(
				"❌ Token appears invalid (too short):",
				token?.length || 0,
			);
			throw new Error("Invalid token received");
		}

		// Parse token to check expiration (JWT has 3 parts: header.payload.signature)
		try {
			const payload = JSON.parse(atob(token.split(".")[1]));
			const expiresAt = new Date(payload.exp * 1000);
			const now = new Date();
			const minutesUntilExpiry =
				(expiresAt.getTime() - now.getTime()) / 1000 / 60;

			console.log("✅ Got fresh Firebase ID token");
			console.log("   Token length:", token.length);
			console.log("   Expires at:", expiresAt.toISOString());
			console.log(
				"   Time until expiry:",
				Math.round(minutesUntilExpiry),
				"minutes",
			);

			// Warn if token expires soon
			if (minutesUntilExpiry < 5) {
				console.warn(
					"⚠️ Token expires in less than 5 minutes - consider refreshing",
				);
			}
		} catch (parseError) {
			// Token parsing failed, but token might still be valid
			console.warn("⚠️ Could not parse token expiration, but continuing");
		}

		return token;
	} catch (error) {
		console.error("❌ Failed to get ID token:");
		console.error("   Error:", error);

		// Retry logic for transient failures
		if (retryCount < 2) {
			console.log("🔄 Retrying token fetch...");
			await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms
			return getIdToken(retryCount + 1);
		}

		console.error(
			"💥 Failed to get ID token after",
			retryCount + 1,
			"attempts",
		);
		return null;
	}
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
	if (!isFirebaseConfigured()) {
		return false;
	}

	const auth = getFirebaseAuth();
	return !!auth.currentUser;
}
/**
 * Get current user (synchronous)
 */
export function getCurrentUser(): Promise<any> {
	if (!isFirebaseConfigured()) {
		return Promise.resolve(null);
	}

	const auth = getFirebaseAuth();

	return new Promise((resolve) => {
		// If user already available, return immediately
		if (auth.currentUser) {
			resolve(auth.currentUser);
			return;
		}

		// Wait for auth state to initialize
		const unsubscribe = auth.onAuthStateChanged((user) => {
			unsubscribe();
			resolve(user);
		});

		// Timeout after 3 seconds
		setTimeout(() => {
			unsubscribe();
			resolve(null);
		}, 3000);
	});
}
