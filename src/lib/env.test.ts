import { describe, it, expect, afterEach, vi } from "vitest";

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

describe("isServerEnvValid", () => {
	it("returns true when all required vars are present", async () => {
		vi.stubEnv("R2_ACCESS_KEY_ID", "key");
		vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
		vi.stubEnv("R2_ENDPOINT", "https://r2.example.com");
		vi.stubEnv("R2_BUCKET_NAME", "bucket");
		vi.stubEnv("R2_PUBLIC_URL", "https://pub.r2.dev");
		vi.stubEnv("FIREBASE_PROJECT_ID", "proj");
		vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", '{"type":"service_account"}');
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
		vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
		vi.stubEnv("COMBO_SK", "combo-secret");

		const { isServerEnvValid } = await import("./env");
		expect(isServerEnvValid()).toBe(true);
	});

	it("returns false when a required var is missing", async () => {
		// Clear all required vars
		vi.stubEnv("R2_ACCESS_KEY_ID", "");
		vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
		vi.stubEnv("R2_ENDPOINT", "");
		vi.stubEnv("R2_BUCKET_NAME", "");
		vi.stubEnv("R2_PUBLIC_URL", "");
		vi.stubEnv("FIREBASE_PROJECT_ID", "");
		vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", "");
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
		vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
		vi.stubEnv("COMBO_SK", "");

		const { isServerEnvValid } = await import("./env");
		expect(isServerEnvValid()).toBe(false);
	});
});

describe("validateServerEnv", () => {
	it("throws with a readable message when vars are missing", async () => {
		vi.stubEnv("R2_ACCESS_KEY_ID", "");
		vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
		vi.stubEnv("R2_ENDPOINT", "");
		vi.stubEnv("R2_BUCKET_NAME", "");
		vi.stubEnv("R2_PUBLIC_URL", "");
		vi.stubEnv("FIREBASE_PROJECT_ID", "");
		vi.stubEnv("FIREBASE_SERVICE_ACCOUNT", "");
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
		vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
		vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
		vi.stubEnv("COMBO_SK", "");

		const { validateServerEnv } = await import("./env");
		expect(() => validateServerEnv()).toThrow(
			"Invalid environment configuration",
		);
	});
});
