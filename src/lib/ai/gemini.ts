/**
 * Gemini API client wrapper
 * Provides a unified interface for Gemini AI operations
 */

import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

/**
 * Get or create Gemini client instance
 */
export function getGeminiClient(): GoogleGenAI {
	const apiKey = process.env.GEMINI_API_KEY;

	if (!apiKey) {
		throw new Error("GEMINI_API_KEY is not configured. Add it to .env.local");
	}

	if (!geminiClient) {
		geminiClient = new GoogleGenAI({ apiKey });
	}

	return geminiClient;
}

/**
 * Check if Gemini is configured
 */
export function isGeminiConfigured(): boolean {
	return !!process.env.GEMINI_API_KEY;
}

/**
 * Available Gemini models and their capabilities
 */
export const GEMINI_MODELS = {
	FLASH: "gemini-1.5-flash",
	FLASH_EXP: "gemini-2.0-flash-exp",
	PRO: "gemini-1.5-pro",
	IMAGE_GEN: "gemini-2.0-flash-preview-image-generation",
} as const;

export type GeminiModel = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS];

/**
 * Model capabilities
 */
export const MODEL_CAPABILITIES: Record<
	GeminiModel,
	{
		text: boolean;
		image: boolean;
		video: boolean;
		audio: boolean;
		imageGeneration: boolean;
	}
> = {
	[GEMINI_MODELS.FLASH]: {
		text: true,
		image: true,
		video: true,
		audio: true,
		imageGeneration: false,
	},
	[GEMINI_MODELS.FLASH_EXP]: {
		text: true,
		image: true,
		video: true,
		audio: true,
		imageGeneration: true,
	},
	[GEMINI_MODELS.PRO]: {
		text: true,
		image: true,
		video: true,
		audio: true,
		imageGeneration: false,
	},
	[GEMINI_MODELS.IMAGE_GEN]: {
		text: true,
		image: true,
		video: false,
		audio: false,
		imageGeneration: true,
	},
};

/**
 * Generate text content from a prompt
 */
export async function generateText(
	prompt: string,
	model: GeminiModel = GEMINI_MODELS.FLASH,
): Promise<string> {
	const client = getGeminiClient();

	const result = await client.models.generateContent({
		model,
		contents: [
			{
				role: "user",
				parts: [{ text: prompt }],
			},
		],
	});

	return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/**
 * Generate content with media (image, video, audio)
 */
export async function generateWithMedia(
	prompt: string,
	mediaData: string,
	mimeType: string,
	model: GeminiModel = GEMINI_MODELS.FLASH,
): Promise<string> {
	const client = getGeminiClient();

	const result = await client.models.generateContent({
		model,
		contents: [
			{
				role: "user",
				parts: [
					{
						inlineData: {
							mimeType,
							data: mediaData,
						},
					},
					{ text: prompt },
				],
			},
		],
	});

	return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

/**
 * Parse JSON from Gemini response (handles markdown fences)
 */
export function parseJsonResponse<T>(response: string): T | null {
	// Remove markdown code fences if present
	const cleaned = response
		.replace(/```json\s*/gi, "")
		.replace(/```\s*/gi, "")
		.trim();

	try {
		return JSON.parse(cleaned) as T;
	} catch {
		// Try to extract JSON object from response
		const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			try {
				return JSON.parse(jsonMatch[0]) as T;
			} catch {
				return null;
			}
		}
		return null;
	}
}

/**
 * Error types for Gemini API
 */
export class GeminiError extends Error {
	constructor(
		message: string,
		public code: GeminiErrorCode,
		public originalError?: Error,
	) {
		super(message);
		this.name = "GeminiError";
	}
}

export type GeminiErrorCode =
	| "NOT_CONFIGURED"
	| "RATE_LIMITED"
	| "SAFETY_BLOCKED"
	| "INVALID_REQUEST"
	| "NETWORK_ERROR"
	| "UNKNOWN";

/**
 * Wrap Gemini API call with error handling
 */
export async function withGeminiErrorHandling<T>(
	operation: () => Promise<T>,
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		if (error instanceof Error) {
			const message = error.message.toLowerCase();

			if (message.includes("api key") || message.includes("not configured")) {
				throw new GeminiError(
					"Gemini API key is not configured",
					"NOT_CONFIGURED",
					error,
				);
			}

			if (message.includes("rate") || message.includes("quota")) {
				throw new GeminiError(
					"Rate limit exceeded. Please try again later.",
					"RATE_LIMITED",
					error,
				);
			}

			if (message.includes("safety") || message.includes("blocked")) {
				throw new GeminiError(
					"Content was blocked for safety reasons",
					"SAFETY_BLOCKED",
					error,
				);
			}

			if (message.includes("invalid") || message.includes("bad request")) {
				throw new GeminiError(
					"Invalid request to Gemini API",
					"INVALID_REQUEST",
					error,
				);
			}

			if (message.includes("network") || message.includes("fetch")) {
				throw new GeminiError(
					"Network error communicating with Gemini",
					"NETWORK_ERROR",
					error,
				);
			}
		}

		throw new GeminiError(
			error instanceof Error ? error.message : "Unknown Gemini error",
			"UNKNOWN",
			error instanceof Error ? error : undefined,
		);
	}
}
