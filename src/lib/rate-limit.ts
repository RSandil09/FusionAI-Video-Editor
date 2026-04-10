/**
 * Production-grade rate limiter.
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set (production /
 * staging), uses Upstash Redis so limits are shared across all serverless
 * instances — safe on Vercel.
 *
 * When those env vars are absent (local dev), falls back to an in-memory Map.
 * The fallback is intentionally NOT used in production; set the env vars on
 * Vercel before going live.
 *
 * Setup: https://console.upstash.com → create a Redis database → copy the
 * REST URL and token into .env.local (and Vercel environment variables).
 */

export interface RateLimitResult {
	success: boolean;
	remaining: number;
	resetIn: number; // seconds
}

// ─── Upstash path ─────────────────────────────────────────────────────────────

async function checkUpstash(
	key: string,
	limit: number,
	windowMs: number,
): Promise<RateLimitResult> {
	// Dynamic imports keep these packages out of bundles that don't need them.
	const { Redis } = await import("@upstash/redis");
	const { Ratelimit } = await import("@upstash/ratelimit");

	const redis = new Redis({
		url: process.env.UPSTASH_REDIS_REST_URL!,
		token: process.env.UPSTASH_REDIS_REST_TOKEN!,
	});

	const ratelimit = new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(limit, `${windowMs / 1000} s`),
		analytics: false,
	});

	const { success, remaining, reset } = await ratelimit.limit(key);
	const resetIn = Math.max(0, Math.ceil((reset - Date.now()) / 1000));

	return { success, remaining, resetIn };
}

// ─── In-memory fallback (dev only) ────────────────────────────────────────────

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();
const CLEANUP_INTERVAL_MS = 60_000;

function cleanup() {
	const now = Date.now();
	for (const [k, entry] of store.entries()) {
		if (entry.resetAt < now) store.delete(k);
	}
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function scheduleCleanup() {
	if (!cleanupTimer) cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL_MS);
}

function checkMemory(
	key: string,
	limit: number,
	windowMs: number,
): RateLimitResult {
	scheduleCleanup();
	const now = Date.now();
	let entry = store.get(key);

	if (!entry || entry.resetAt < now) {
		entry = { count: 1, resetAt: now + windowMs };
		store.set(key, entry);
		return { success: true, remaining: limit - 1, resetIn: windowMs / 1000 };
	}

	entry.count++;
	const remaining = Math.max(0, limit - entry.count);
	return {
		success: entry.count <= limit,
		remaining,
		resetIn: Math.max(0, Math.ceil((entry.resetAt - now) / 1000)),
	};
}

// ─── Public API (unchanged — all API routes call this) ────────────────────────

/**
 * Check rate limit. Returns { success: false } when limit is exceeded.
 * @param key       Unique identifier (e.g. IP address or userId)
 * @param limit     Max requests per window
 * @param windowMs  Window duration in milliseconds
 */
export async function checkRateLimit(
	key: string,
	limit: number,
	windowMs: number,
): Promise<RateLimitResult> {
	if (
		process.env.UPSTASH_REDIS_REST_URL &&
		process.env.UPSTASH_REDIS_REST_TOKEN
	) {
		return checkUpstash(key, limit, windowMs);
	}
	return checkMemory(key, limit, windowMs);
}

/**
 * Get client IP from request headers (Vercel / proxied deployments).
 */
export function getClientIp(request: Request): string {
	const forwarded = request.headers.get("x-forwarded-for");
	if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
	const real = request.headers.get("x-real-ip");
	if (real) return real;
	return "unknown";
}
