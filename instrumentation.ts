/**
 * Next.js instrumentation - runs once when the server starts.
 * Validates env vars in production to fail fast on misconfiguration.
 */

export async function register() {
	if (
		process.env.NEXT_RUNTIME === "nodejs" &&
		process.env.NODE_ENV === "production"
	) {
		const { validateServerEnv } = await import("./src/lib/env");
		try {
			validateServerEnv();
		} catch (err) {
			console.error(
				"❌ Environment validation failed:",
				err instanceof Error ? err.message : err,
			);
			throw err;
		}
	}
}
