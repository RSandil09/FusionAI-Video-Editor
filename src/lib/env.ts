/**
 * Environment variable validation
 * Validates required server-side env vars. Optional vars are not validated.
 */

import { z } from "zod";

const serverEnvSchema = z.object({
	// R2 (required for uploads, render, etc.)
	R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
	R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),
	R2_ENDPOINT: z.string().min(1, "R2_ENDPOINT is required"),
	R2_BUCKET_NAME: z.string().min(1, "R2_BUCKET_NAME is required"),
	R2_PUBLIC_URL: z.string().min(1, "R2_PUBLIC_URL is required"),

	// Firebase (required for auth)
	FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),
	FIREBASE_SERVICE_ACCOUNT: z
		.string()
		.min(10, "FIREBASE_SERVICE_ACCOUNT is required"),

	// Supabase (required for projects, assets, etc.)
	NEXT_PUBLIC_SUPABASE_URL: z
		.string()
		.min(1, "NEXT_PUBLIC_SUPABASE_URL is required"),
	NEXT_PUBLIC_SUPABASE_ANON_KEY: z
		.string()
		.min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
	SUPABASE_SERVICE_ROLE_KEY: z
		.string()
		.min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

	// DesignCombo (required for render, transcribe)
	COMBO_SK: z.string().min(1, "COMBO_SK is required for render and transcribe"),

	// Optional - no validation
	PEXELS_API_KEY: z.string().optional(),
	GEMINI_API_KEY: z.string().optional(),
	GIPHY_API_KEY: z.string().optional(),
	REPLICATE_API_TOKEN: z.string().optional(),
	NODE_ENV: z.enum(["development", "production", "test"]).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validate server environment variables.
 * Call in production or when you need to fail fast on missing config.
 * Returns parsed env or throws with clear error messages.
 */
export function validateServerEnv(): ServerEnv {
	const result = serverEnvSchema.safeParse(process.env);
	if (!result.success) {
		const issues = result.error.issues
			.map((i) => `  - ${i.path.join(".")}: ${i.message}`)
			.join("\n");
		throw new Error(`Invalid environment configuration:\n${issues}`);
	}
	return result.data;
}

/**
 * Check if required env vars are present (no throw).
 * Useful for startup checks or health endpoints.
 */
export function isServerEnvValid(): boolean {
	return serverEnvSchema.safeParse(process.env).success;
}
