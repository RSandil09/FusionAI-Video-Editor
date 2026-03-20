"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Loader2 } from "lucide-react";

export default function Home() {
	const router = useRouter();
	const { user, loading } = useAuth();

	useEffect(() => {
		if (!loading) {
			if (user) {
				// Redirect authenticated users to dashboard
				router.push("/dashboard");
			} else {
				// Redirect unauthenticated users to login
				router.push("/login");
			}
		}
	}, [user, loading, router]);

	// Show loading state while redirecting
	return (
		<div className="flex items-center justify-center h-screen bg-background">
			<Loader2 className="h-8 w-8 animate-spin text-primary" />
		</div>
	);
}
