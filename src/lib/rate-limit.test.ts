import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, getClientIp } from "./rate-limit";

describe("rate-limit", () => {
	describe("checkRateLimit", () => {
		it("allows first request", () => {
			const result = checkRateLimit("key1", 5, 60_000);
			expect(result.success).toBe(true);
			expect(result.remaining).toBe(4);
		});

		it("tracks multiple requests", () => {
			checkRateLimit("key2", 3, 60_000);
			checkRateLimit("key2", 3, 60_000);
			const result = checkRateLimit("key2", 3, 60_000);
			expect(result.success).toBe(true);
			expect(result.remaining).toBe(0);
		});

		it("rejects when limit exceeded", () => {
			for (let i = 0; i < 3; i++) {
				checkRateLimit("key3", 2, 60_000);
			}
			const result = checkRateLimit("key3", 2, 60_000);
			expect(result.success).toBe(false);
			expect(result.remaining).toBe(0);
		});

		it("uses separate keys", () => {
			checkRateLimit("user-a", 1, 60_000);
			const resultB = checkRateLimit("user-b", 1, 60_000);
			expect(resultB.success).toBe(true);
		});
	});

	describe("getClientIp", () => {
		it("reads x-forwarded-for", () => {
			const req = new Request("http://localhost", {
				headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
			});
			expect(getClientIp(req)).toBe("1.2.3.4");
		});

		it("reads x-real-ip", () => {
			const req = new Request("http://localhost", {
				headers: { "x-real-ip": "9.9.9.9" },
			});
			expect(getClientIp(req)).toBe("9.9.9.9");
		});

		it("returns unknown when no headers", () => {
			const req = new Request("http://localhost");
			expect(getClientIp(req)).toBe("unknown");
		});
	});
});
