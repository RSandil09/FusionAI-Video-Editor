"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// global-error.tsx catches errors thrown by RootLayout itself.
// It must include its own <html> and <body> tags.
export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		if (typeof Sentry?.captureException === "function") {
			Sentry.captureException(error);
		}
	}, [error]);

	return (
		<html lang="en">
			<body
				style={{
					margin: 0,
					display: "flex",
					minHeight: "100vh",
					alignItems: "center",
					justifyContent: "center",
					flexDirection: "column",
					gap: "1rem",
					backgroundColor: "#09090b",
					color: "#fafafa",
					fontFamily: "sans-serif",
				}}
			>
				<h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
					Something went wrong
				</h2>
				<p
					style={{
						fontSize: "0.875rem",
						color: "#a1a1aa",
						maxWidth: "28rem",
						textAlign: "center",
					}}
				>
					A critical error occurred. The issue has been reported automatically.
				</p>
				{error.digest && (
					<p style={{ fontSize: "0.75rem", color: "#71717a" }}>
						Error ID: {error.digest}
					</p>
				)}
				<button
					onClick={reset}
					style={{
						padding: "0.5rem 1rem",
						borderRadius: "0.375rem",
						backgroundColor: "#ffffff",
						color: "#09090b",
						fontSize: "0.875rem",
						fontWeight: 500,
						border: "none",
						cursor: "pointer",
					}}
				>
					Try again
				</button>
			</body>
		</html>
	);
}
