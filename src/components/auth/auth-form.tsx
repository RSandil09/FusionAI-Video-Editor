"use client";

/**
 * Reusable Authentication Form Component
 * Used by both signup and login pages
 */

import { useState, FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";

interface AuthFormProps {
	mode: "signup" | "login";
	onSubmit: (
		email: string,
		password: string,
		displayName?: string,
	) => Promise<void>;
	loading: boolean;
}

export function AuthForm({ mode, onSubmit, loading }: AuthFormProps) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError("");

		// Validation
		if (!email || !password) {
			setError("Please fill in all fields");
			return;
		}

		if (mode === "signup" && !displayName) {
			setError("Please enter your name");
			return;
		}

		if (password.length < 6) {
			setError("Password must be at least 6 characters");
			return;
		}

		try {
			await onSubmit(email, password, displayName);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
			{/* Display Name (signup only) */}
			{mode === "signup" && (
				<div>
					<label
						htmlFor="displayName"
						className="block text-sm font-medium mb-1"
					>
						Name
					</label>
					<input
						id="displayName"
						type="text"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						placeholder="John Doe"
						className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						disabled={loading}
					/>
				</div>
			)}

			{/* Email */}
			<div>
				<label htmlFor="email" className="block text-sm font-medium mb-1">
					Email
				</label>
				<input
					id="email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="you@example.com"
					className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					disabled={loading}
				/>
			</div>

			{/* Password */}
			<div>
				<label htmlFor="password" className="block text-sm font-medium mb-1">
					Password
				</label>
				<div className="relative">
					<input
						id="password"
						type={showPassword ? "text" : "password"}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="••••••••"
						className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						disabled={loading}
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
						disabled={loading}
					>
						{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
					</button>
				</div>
			</div>

			{/* Error Message */}
			{error && (
				<div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
					<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
				</div>
			)}

			{/* Submit Button */}
			<button
				type="submit"
				disabled={loading}
				className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading ? (
					<span className="flex items-center justify-center">
						<svg
							className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							></circle>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						{mode === "signup" ? "Creating account..." : "Signing in..."}
					</span>
				) : mode === "signup" ? (
					"Create account"
				) : (
					"Sign in"
				)}
			</button>
		</form>
	);
}
