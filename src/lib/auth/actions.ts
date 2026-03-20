/**
 * Firebase Authentication Actions
 * Client-side auth functions for signup, login, OAuth, etc.
 */

import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signInWithPopup,
	GoogleAuthProvider,
	signOut as firebaseSignOut,
	sendPasswordResetEmail,
	updateProfile,
	User,
} from "firebase/auth";
import { getFirebaseAuth } from "./client";

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
	email: string,
	password: string,
	displayName?: string,
): Promise<User> {
	const auth = getFirebaseAuth();

	try {
		const userCredential = await createUserWithEmailAndPassword(
			auth,
			email,
			password,
		);

		// Update display name if provided
		if (displayName && userCredential.user) {
			await updateProfile(userCredential.user, { displayName });
		}

		console.log("✅ Signed up:", userCredential.user.email);

		// Create server-side session cookie
		try {
			const idToken = await userCredential.user.getIdToken();
			console.log("🔐 Creating session cookie...");

			const response = await fetch("/api/auth/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idToken }),
			});

			if (response.ok) {
				console.log("✅ Session cookie created");
			} else {
				console.warn(
					"⚠️ Failed to create session cookie:",
					await response.text(),
				);
			}
		} catch (sessionError) {
			console.error("❌ Session cookie creation failed:", sessionError);
			// Don't fail the signup, but log the error
		}

		return userCredential.user;
	} catch (error) {
		console.error("Sign up error:", error);
		throw formatAuthError(error);
	}
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
	email: string,
	password: string,
): Promise<User> {
	const auth = getFirebaseAuth();

	try {
		const userCredential = await signInWithEmailAndPassword(
			auth,
			email,
			password,
		);

		console.log("✅ Signed in:", userCredential.user.email);

		// Create server-side session cookie
		try {
			const idToken = await userCredential.user.getIdToken();
			console.log("🔐 Creating session cookie...");

			const response = await fetch("/api/auth/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idToken }),
			});

			if (response.ok) {
				console.log("✅ Session cookie created");
			} else {
				console.warn(
					"⚠️ Failed to create session cookie:",
					await response.text(),
				);
			}
		} catch (sessionError) {
			console.error("❌ Session cookie creation failed:", sessionError);
			// Don't fail the login, but log the error
		}

		return userCredential.user;
	} catch (error) {
		console.error("Sign in error:", error);
		throw formatAuthError(error);
	}
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(): Promise<User> {
	const auth = getFirebaseAuth();
	const provider = new GoogleAuthProvider();

	// Optional: Add custom parameters
	provider.setCustomParameters({
		prompt: "select_account",
	});

	try {
		const userCredential = await signInWithPopup(auth, provider);
		console.log("✅ Signed in with Google:", userCredential.user.email);

		// Create server-side session cookie
		try {
			const idToken = await userCredential.user.getIdToken();
			console.log("🔐 Creating session cookie...");

			const response = await fetch("/api/auth/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idToken }),
			});

			if (response.ok) {
				console.log("✅ Session cookie created");
			} else {
				console.warn(
					"⚠️ Failed to create session cookie:",
					await response.text(),
				);
			}
		} catch (sessionError) {
			console.error("❌ Session cookie creation failed:", sessionError);
			// Don't fail the login, but log the error
		}

		return userCredential.user;
	} catch (error) {
		console.error("Google sign in error:", error);
		throw formatAuthError(error);
	}
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
	const auth = getFirebaseAuth();

	try {
		// Delete server-side session cookie first
		try {
			await fetch("/api/auth/session", {
				method: "DELETE",
			});
			console.log("✅ Session cookie deleted");
		} catch (sessionError) {
			console.error("❌ Failed to delete session cookie:", sessionError);
			// Continue with Firebase sign out anyway
		}

		// Then sign out from Firebase client
		await firebaseSignOut(auth);
		console.log("✅ Signed out");
	} catch (error) {
		console.error("Sign out error:", error);
		throw formatAuthError(error);
	}
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<void> {
	const auth = getFirebaseAuth();

	try {
		await sendPasswordResetEmail(auth, email);
		console.log("✅ Password reset email sent to:", email);
	} catch (error) {
		console.error("Password reset error:", error);
		throw formatAuthError(error);
	}
}

/**
 * Format Firebase auth errors into user-friendly messages
 */
function formatAuthError(error: unknown): Error {
	if (!(error instanceof Error)) {
		return new Error("An unknown error occurred");
	}

	const errorCode = (error as any).code;

	switch (errorCode) {
		case "auth/email-already-in-use":
			return new Error("This email is already registered");
		case "auth/invalid-email":
			return new Error("Invalid email address");
		case "auth/operation-not-allowed":
			return new Error("Email/password sign-in is disabled");
		case "auth/weak-password":
			return new Error("Password is too weak (minimum 6 characters)");
		case "auth/user-disabled":
			return new Error("This account has been disabled");
		case "auth/user-not-found":
			return new Error("No account found with this email");
		case "auth/wrong-password":
			return new Error("Incorrect password");
		case "auth/too-many-requests":
			return new Error("Too many failed attempts. Please try again later");
		case "auth/popup-closed-by-user":
			return new Error("Sign-in popup was closed");
		case "auth/cancelled-popup-request":
			return new Error("Sign-in cancelled");
		default:
			return new Error(error.message || "Authentication failed");
	}
}
