import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { getR2Client } from "@/lib/r2-client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateImageSchema, parseBody } from "@/lib/api-validation";

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST /api/generate-image
 * Generate images using Together AI (Free $5 credit = ~500 images)
 *
 * Request: { prompt: string, style?: string, aspectRatio?: string }
 * Response: { image: { url: string, width: number, height: number } }
 */
export async function POST(request: NextRequest) {
	const togetherApiKey = process.env.TOGETHER_API_KEY;

	if (!togetherApiKey) {
		return NextResponse.json(
			{
				error: "TOGETHER_API_KEY is not set",
				detail: "Get a free API key at together.ai (includes $5 free credit)",
			},
			{ status: 503 },
		);
	}

	try {
		// 1. Authenticate user
		const user = await getUserFromRequest();
		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized - please log in" },
				{ status: 401 },
			);
		}

		const rl = checkRateLimit(
			`generate-image:${user.id}`,
			RATE_LIMIT,
			RATE_WINDOW_MS,
		);
		if (!rl.success) {
			return NextResponse.json(
				{ error: "Rate limit exceeded. Try again later." },
				{ status: 429, headers: { "Retry-After": String(rl.resetIn) } },
			);
		}

		// 2. Parse and validate request body
		let rawBody: unknown;
		try {
			rawBody = await request.json();
		} catch {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}
		const parsed = parseBody(rawBody, generateImageSchema);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error }, { status: 400 });
		}
		const { prompt, style, aspectRatio } = parsed.data;

		console.log(
			`🎨 Generating image for user ${user.id}: "${prompt.slice(0, 50)}..."`,
		);

		// 3. Build enhanced prompt with style
		const stylePrompts: Record<string, string> = {
			realistic: "photorealistic, high quality, detailed, 8k uhd",
			illustration:
				"digital illustration, artistic, colorful, trending on artstation",
			"3d": "3D rendered, CGI, volumetric lighting, octane render",
			anime: "anime style, manga art, studio ghibli style",
			cartoon: "cartoon style, vibrant colors, pixar style",
			cinematic: "cinematic, movie still, dramatic lighting, anamorphic",
			minimalist: "minimalist, clean, simple, modern design",
			vintage: "vintage, retro, film grain, nostalgic",
		};

		const styleKey = style ?? "realistic";
		const styleModifier = stylePrompts[styleKey] || stylePrompts.realistic;
		const fullPrompt = `${prompt}, ${styleModifier}`;
		const negativePrompt =
			"blurry, bad quality, distorted, ugly, watermark, text";

		// 4. Get aspect ratio dimensions
		const dimensions = getAspectRatioDimensions(aspectRatio ?? "16:9");

		// 5. Call Together AI API
		const response = await fetch(
			"https://api.together.xyz/v1/images/generations",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${togetherApiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: "black-forest-labs/FLUX.1-schnell-Free",
					prompt: fullPrompt,
					negative_prompt: negativePrompt,
					width: dimensions.width,
					height: dimensions.height,
					steps: 4,
					n: 1,
					response_format: "b64_json",
				}),
			},
		);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error("Together AI error:", errorData);
			throw new Error(
				errorData.error?.message || `API error: ${response.status}`,
			);
		}

		const data = await response.json();

		if (!data.data?.[0]?.b64_json) {
			throw new Error("No image data in response");
		}

		// 6. Convert base64 to buffer
		const imageBuffer = Buffer.from(data.data[0].b64_json, "base64");

		// 7. Upload to R2
		const fileName = `${nanoid()}.png`;
		const storageKey = `ai-images/${user.id}/${fileName}`;

		const r2Client = getR2Client();
		await r2Client.send(
			new PutObjectCommand({
				Bucket: process.env.R2_BUCKET_NAME,
				Key: storageKey,
				Body: imageBuffer,
				ContentType: "image/png",
			}),
		);

		const publicUrl = `${process.env.R2_PUBLIC_URL}/${storageKey}`;

		console.log(`✅ Image generated: ${publicUrl}`);

		return NextResponse.json({
			image: {
				url: publicUrl,
				width: dimensions.width,
				height: dimensions.height,
			},
		});
	} catch (error) {
		console.error("Image generation error:", error);
		const errorMessage =
			error instanceof Error ? error.message : "Image generation failed";

		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}

/**
 * Get dimensions for common aspect ratios (optimized for FLUX)
 */
function getAspectRatioDimensions(aspectRatio: string): {
	width: number;
	height: number;
} {
	const dimensions: Record<string, { width: number; height: number }> = {
		"16:9": { width: 1024, height: 576 },
		"9:16": { width: 576, height: 1024 },
		"1:1": { width: 768, height: 768 },
		"4:3": { width: 896, height: 672 },
		"3:4": { width: 672, height: 896 },
		"21:9": { width: 1024, height: 448 },
	};
	return dimensions[aspectRatio] || dimensions["16:9"];
}
