"use client";

/**
 * Firebase Authentication Context Provider
 * Provides global auth state to the entire app
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/auth/client";

interface AuthContextType {
	user: User | null;
	loading: boolean;
	isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	loading: true,
	isAuthenticated: false,
});

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
}

interface AuthProviderProps {
	children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Skip if Firebase is not configured
		if (!isFirebaseConfigured()) {
			console.warn("Firebase not configured - auth will not work");
			setLoading(false);
			return;
		}

		const auth = getFirebaseAuth();

		// Listen to auth state changes
		const unsubscribe = onAuthStateChanged(
			auth,
			async (user) => {
				console.log("Auth state changed:", user ? user.email : "No user");
				setUser(user);

				// Sync user to Supabase database
				if (user) {
					try {
						const { upsertUser } = await import("@/lib/db/users");
						await upsertUser({
							id: user.uid,
							email: user.email!,
							display_name: user.displayName,
							avatar_url: user.photoURL,
						});
					} catch (error) {
						console.error("Failed to sync user to database:", error);
					}
				}

				setLoading(false);
			},
			(error) => {
				console.error("Auth state change error:", error);
				setLoading(false);
			},
		);

		// Cleanup subscription
		return () => unsubscribe();
	}, []);

	const value: AuthContextType = {
		user,
		loading,
		isAuthenticated: !!user,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
