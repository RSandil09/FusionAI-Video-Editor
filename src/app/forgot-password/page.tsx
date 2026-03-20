"use client";

/**
 * Forgot Password Page
 * Send password reset email
 */

import { useState, FormEvent } from "react";
import Link from "next/link";
import { sendPasswordReset } from "@/lib/auth/actions";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { LogoIcons } from "@/components/shared/logos";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		if (!email) {
			toast.error("Please enter your email");
			return;
		}

		setLoading(true);
		try {
			await sendPasswordReset(email);
			setSent(true);
			toast.success("Password reset email sent!");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to send email",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-background px-4 font-sans selection:bg-primary/20">
			{/* Subtle Radial Background */}
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

			<div className="w-full max-w-[400px] relative z-10">
				{/* Header */}
				<div className="text-center mb-8">
					<LogoIcons.scenify className="w-16 h-16 mb-6 mx-auto" />
					<h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
						Reset Password
					</h1>
					<p className="text-muted-foreground text-sm">
						{sent
							? "Check your email for reset instructions"
							: "Enter your email to receive a password reset link"}
					</p>
				</div>

				{/* Card */}
				<div className="bg-card border border-border rounded-xl shadow-sm p-6 sm:p-8 backdrop-blur-sm">
					{!sent ? (
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-1.5">
								<label
									htmlFor="email"
									className="block text-sm font-medium text-foreground"
								>
									Email
								</label>
								<input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="you@example.com"
									className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors disabled:opacity-50"
									disabled={loading}
								/>
							</div>

							<button
								type="submit"
								disabled={loading}
								className="w-full h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
								{loading ? "Sending..." : "Send reset link"}
							</button>
						</form>
					) : (
						<div className="space-y-4">
							<div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
								<p className="text-sm text-foreground">
									We've sent a password reset link to <strong>{email}</strong>.
									Please check your inbox and spam folder.
								</p>
							</div>

							<button
								onClick={() => {
									setSent(false);
									setEmail("");
								}}
								className="w-full h-10 px-4 bg-background border border-input rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-all duration-200"
							>
								Send to a different email
							</button>
						</div>
					)}

					{/* Back to Login */}
					<div className="mt-6 text-center text-sm text-muted-foreground">
						<Link
							href="/login"
							className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary/80 underline-offset-4 hover:underline"
						>
							<ArrowLeft className="w-3.5 h-3.5" />
							Back to login
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
