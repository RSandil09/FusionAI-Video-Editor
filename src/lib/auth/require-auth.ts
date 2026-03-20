/**
 * Require authentication for API routes.
 * Returns AuthUser or null. Caller should return 401 when null.
 */

import type { AuthUser } from "@/lib/auth-helpers";
import { getUserFromRequest } from "@/lib/auth-helpers";

export async function requireAuth(): Promise<AuthUser | null> {
	return getUserFromRequest();
}
