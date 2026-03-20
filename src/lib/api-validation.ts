/**
 * Shared Zod schemas for API request validation
 */

import { z } from "zod";

export const transcribeSchema = z.object({
	url: z.string().min(1).max(2048),
	targetLanguage: z.string().max(10).optional().default("en"),
});

export const analyzeVideoSchema = z.object({
	videoUrl: z.string().min(1).max(2048),
	analysisType: z.enum(["scenes", "silences", "highlights"]),
	options: z
		.object({
			threshold: z.number().min(0).max(1).optional(),
			minDuration: z.number().min(0).optional(),
		})
		.optional(),
});

export const generateImageSchema = z.object({
	prompt: z.string().min(1).max(2000),
	style: z.string().max(50).optional().default("realistic"),
	aspectRatio: z.string().max(20).optional().default("16:9"),
});

export const generateVoiceSchema = z.object({
	text: z.string().min(1).max(5000),
	voiceId: z.string().min(1).max(100),
	folder: z.string().max(100).optional().default("ai-voice-generations"),
});

export const removeBackgroundSchema = z.object({
	imageUrl: z.string().url().max(2048),
});

export const urlImportSchema = z.object({
	url: z.string().url().max(2048),
});

export const pexelsQuerySchema = z.object({
	query: z.string().max(200).optional(),
	page: z.coerce.number().int().min(1).max(100).optional().default(1),
	per_page: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const giphyQuerySchema = z.object({
	q: z.string().max(100).optional(),
	limit: z.coerce.number().int().min(1).max(50).optional().default(24),
	offset: z.coerce.number().int().min(0).optional().default(0),
	type: z.enum(["stickers", "gifs"]).optional().default("stickers"),
});

/**
 * Parse and validate request body. Returns { success: true, data } or { success: false, error }
 */
export function parseBody<T>(
	body: unknown,
	schema: z.ZodSchema<T>,
): { success: true; data: T } | { success: false; error: string } {
	const result = schema.safeParse(body);
	if (result.success) {
		return { success: true, data: result.data };
	}
	const issues = result.error.issues.map((i) => i.message).join("; ");
	return { success: false, error: issues };
}
