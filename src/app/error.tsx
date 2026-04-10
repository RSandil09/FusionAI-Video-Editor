"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Report to Sentry when available (no-op if Sentry not configured)
		if (typeof Sentry?.captureException === "function") {
			Sentry.captureException(error);
		}
	}, [error]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
			<div className="flex flex-col items-center gap-2 text-center">
				<h2 className="text-xl font-semibold">Something went wrong</h2>
				<p className="max-w-md text-sm text-muted-foreground">
					An unexpected error occurred. The issue has been reported
					automatically.
				</p>
				{error.digest && (
					<p className="text-xs text-muted-foreground">
						Error ID: {error.digest}
					</p>
				)}
			</div>
			<button
				onClick={reset}
				className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				Try again
			</button>
		</div>
	);
}
