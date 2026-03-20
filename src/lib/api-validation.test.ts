import { describe, it, expect } from "vitest";
import {
	parseBody,
	transcribeSchema,
	analyzeVideoSchema,
	generateImageSchema,
	generateVoiceSchema,
	removeBackgroundSchema,
	urlImportSchema,
} from "./api-validation";

describe("api-validation", () => {
	describe("parseBody", () => {
		it("returns data when valid", () => {
			const result = parseBody(
				{ url: "https://example.com/audio.mp3" },
				transcribeSchema,
			);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.url).toBe("https://example.com/audio.mp3");
				expect(result.data.targetLanguage).toBe("en");
			}
		});

		it("returns error when invalid", () => {
			const result = parseBody({ url: 123 }, transcribeSchema);
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error).toBeTruthy();
		});
	});

	describe("transcribeSchema", () => {
		it("accepts url and optional targetLanguage", () => {
			const result = transcribeSchema.safeParse({
				url: "/api/video-proxy?url=...",
				targetLanguage: "es",
			});
			expect(result.success).toBe(true);
		});
	});

	describe("analyzeVideoSchema", () => {
		it("accepts valid analysisType", () => {
			const result = analyzeVideoSchema.safeParse({
				videoUrl: "https://example.com/video.mp4",
				analysisType: "scenes",
			});
			expect(result.success).toBe(true);
		});

		it("rejects invalid analysisType", () => {
			const result = analyzeVideoSchema.safeParse({
				videoUrl: "https://example.com/video.mp4",
				analysisType: "invalid",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("generateImageSchema", () => {
		it("accepts prompt with defaults", () => {
			const result = generateImageSchema.safeParse({ prompt: "a cat" });
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.style).toBe("realistic");
				expect(result.data.aspectRatio).toBe("16:9");
			}
		});

		it("rejects empty prompt", () => {
			const result = generateImageSchema.safeParse({ prompt: "" });
			expect(result.success).toBe(false);
		});
	});

	describe("generateVoiceSchema", () => {
		it("accepts text and voiceId", () => {
			const result = generateVoiceSchema.safeParse({
				text: "Hello",
				voiceId: "en-US-Neural2-A",
			});
			expect(result.success).toBe(true);
		});

		it("rejects text over 5000 chars", () => {
			const result = generateVoiceSchema.safeParse({
				text: "x".repeat(5001),
				voiceId: "en-US-Neural2-A",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("removeBackgroundSchema", () => {
		it("accepts valid imageUrl", () => {
			const result = removeBackgroundSchema.safeParse({
				imageUrl: "https://example.com/image.png",
			});
			expect(result.success).toBe(true);
		});
	});

	describe("urlImportSchema", () => {
		it("accepts valid url", () => {
			const result = urlImportSchema.safeParse({
				url: "https://example.com/file.mp4",
			});
			expect(result.success).toBe(true);
		});
	});
});
