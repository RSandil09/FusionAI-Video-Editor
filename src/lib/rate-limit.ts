/**
 * In-memory rate limiter for API routes.
 * Use for single-instance deployments. For serverless/multi-instance, use Upstash Redis.
 */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

const CLEANUP_INTERVAL_MS = 60_000; // 1 min

function cleanup() {
	const now = Date.now();
	for (const [key, entry] of store.entries()) {
		if (entry.resetAt < now) store.delete(key);
	}
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function scheduleCleanup() {
	if (!cleanupTimer) {
		cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL_MS);
	}
}

export interface RateLimitResult {
	success: boolean;
	remaining: number;
	resetIn: number;
}

/**
 * Check rate limit. Returns { success: false } when limit exceeded.
 * @param key - Unique identifier (e.g. IP, userId)
 * @param limit - Max requests per window
 * @param windowMs - Window duration in ms
 */
export function checkRateLimit(
	key: string,
	limit: number,
	windowMs: number,
): RateLimitResult {
	scheduleCleanup();
	const now = Date.now();
	let entry = store.get(key);

	if (!entry) {
		store.set(key, { count: 1, resetAt: now + windowMs });
		return { success: true, remaining: limit - 1, resetIn: windowMs };
	}

	if (entry.resetAt < now) {
		entry = { count: 1, resetAt: now + windowMs };
		store.set(key, entry);
		return { success: true, remaining: limit - 1, resetIn: windowMs };
	}

	entry.count++;
	const remaining = Math.max(0, limit - entry.count);
	const success = entry.count <= limit;

	return {
		success,
		remaining,
		resetIn: Math.max(0, Math.ceil((entry.resetAt - now) / 1000)),
	};
}

/**
 * Get client IP from request headers (Vercel, etc.)
 */
export function getClientIp(request: Request): string {
	const forwarded = request.headers.get("x-forwarded-for");
	if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
	const real = request.headers.get("x-real-ip");
	if (real) return real;
	return "unknown";
}
