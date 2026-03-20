"use client";

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		// Wait for auth to load
		if (loading) return;

		// Redirect to login if not authenticated
		if (!user) {
			console.log("Not authenticated - redirecting to /login");
			router.push("/login");
		}
	}, [user, loading, router]);

	// Show loading state
	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
					<p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
				</div>
			</div>
		);
	}

	// Don't render children if not authenticated
	if (!user) {
		return null;
	}

	// Render protected content
	return <>{children}</>;
}
