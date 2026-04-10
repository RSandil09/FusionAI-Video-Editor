/**
 * Production-aware logger.
 *
 * - Development:  all levels pass through to console.
 * - Production:   debug/log are silenced; warn/error still emit so they
 *                 appear in Vercel's log drain and are captured by Sentry.
 *
 * Server-side (Node.js) callers use this directly.
 * Client-side callers also import this — in the browser `process.env.NODE_ENV`
 * is inlined by Next.js at build time so dead branches are tree-shaken.
 */

const isDev = process.env.NODE_ENV === "development";

function formatMessage(level: string, args: unknown[]): unknown[] {
	if (isDev) return args;
	// In production, prefix with a structured tag so log drains can filter.
	const first =
		typeof args[0] === "string"
			? `[${level.toUpperCase()}] ${args[0]}`
			: `[${level.toUpperCase()}]`;
	return [first, ...args.slice(1)];
}

export const logger = {
	/** Verbose info — silenced in production. */
	debug(...args: unknown[]) {
		if (!isDev) return;
		console.debug(...args);
	},

	/** General info — silenced in production. */
	log(...args: unknown[]) {
		if (!isDev) return;
		console.log(...args);
	},

	/** Warnings — always emitted (useful in Vercel logs). */
	warn(...args: unknown[]) {
		console.warn(...formatMessage("warn", args));
	},

	/** Errors — always emitted; Sentry will capture these automatically
	 *  because Sentry's Next.js SDK instruments console.error in production. */
	error(...args: unknown[]) {
		console.error(...formatMessage("error", args));
	},
};
