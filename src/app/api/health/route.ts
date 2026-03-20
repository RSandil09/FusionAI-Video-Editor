import { NextResponse } from "next/server";
import { isServerEnvValid } from "@/lib/env";

/**
 * GET /api/health
 * Health check for load balancers, monitoring, and deployments.
 * Returns 200 if env is valid, 503 if misconfigured.
 */
export async function GET() {
	const envOk = isServerEnvValid();
	const status = envOk ? "ok" : "degraded";
	const statusCode = envOk ? 200 : 503;

	return NextResponse.json(
		{
			status,
			timestamp: new Date().toISOString(),
			env: envOk ? "valid" : "invalid",
		},
		{ status: statusCode },
	);
}
