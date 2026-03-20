"use client";

/**
 * Login Page
 * Email/password login with Google OAuth option
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth/actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { LogoIcons } from "@/components/shared/logos";

export default function LoginPage() {
	const [loading, setLoading] = useState(false);
	const [googleLoading, setGoogleLoading] = useState(false);
	const router = useRouter();

	const handleLogin = async (email: string, password: string) => {
		setLoading(true);
		try {
			await signInWithEmail(email, password);
			toast.success("Welcome back!");
			router.push("/");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Login failed");
			throw error;
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleLogin = async () => {
		setGoogleLoading(true);
		try {
			await signInWithGoogle();
			toast.success("Signed in with Google!");
			router.push("/");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Google sign-in failed",
			);
		} finally {
			setGoogleLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4 font-sans selection:bg-primary/20">
			{/* Subtle Radial Background */}
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

			<div className="w-full max-w-[400px] relative z-10">
				{/* Header */}
				<div className="text-center mb-8">
					<LogoIcons.scenify className="w-16 h-16 text-primary mb-6 mx-auto" />
					<h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
						Welcome back
					</h1>
					<p className="text-muted-foreground text-sm">
						Enter your credentials to access your account
					</p>
				</div>

				{/* Card */}
				<div className="bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8 backdrop-blur-sm">
					{/* Auth Form */}
					<AuthForm mode="login" onSubmit={handleLogin} loading={loading} />

					{/* Forgot Password */}
					<div className="mt-4 flex justify-end">
						<Link
							href="/forgot-password"
							className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
						>
							Forgot password?
						</Link>
					</div>

					{/* Divider */}
					<div className="relative my-6">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t border-border"></div>
						</div>
						<div className="relative flex justify-center text-[10px] uppercase tracking-wider">
							<span className="px-2 bg-card text-muted-foreground">
								Or continue with
							</span>
						</div>
					</div>

					{/* Google OAuth Button */}
					<button
						onClick={handleGoogleLogin}
						disabled={googleLoading || loading}
						className="w-full h-10 px-4 bg-background border border-input rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{googleLoading ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<svg className="w-4 h-4" viewBox="0 0 24 24">
								<path
									fill="currentColor"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
								/>
								<path
									fill="currentColor"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
								/>
								<path
									fill="currentColor"
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
								/>
								<path
									fill="currentColor"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
								/>
							</svg>
						)}
						Google
					</button>

					{/* Signup Link */}
					<div className="mt-6 text-center text-sm text-muted-foreground">
						Don't have an account?{" "}
						<Link
							href="/signup"
							className="font-medium text-primary hover:text-primary/80 underline-offset-4 hover:underline"
						>
							Sign up
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
