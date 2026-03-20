import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { getR2Client } from "@/lib/r2-client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { checkRateLimit } from "@/lib/rate-limit";
import { removeBackgroundSchema, parseBody } from "@/lib/api-validation";

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST /api/remove-background
 * Remove background from an image using Replicate's rembg model
 *
 * Request: { imageUrl: string }
 * Response: { image: { url: string, originalUrl: string } }
 */
export async function POST(request: NextRequest) {
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
			`remove-background:${user.id}`,
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
		const parsed = parseBody(rawBody, removeBackgroundSchema);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error }, { status: 400 });
		}
		const { imageUrl } = parsed.data;

		console.log(
			`🎨 Removing background for user ${user.id}: ${imageUrl.slice(0, 50)}...`,
		);

		// 3. Require Replicate API token
		const replicateToken = process.env.REPLICATE_API_TOKEN;
		if (!replicateToken) {
			return NextResponse.json(
				{
					error:
						"Background removal requires REPLICATE_API_TOKEN. Get one free at replicate.com",
					suggestion: "Add REPLICATE_API_TOKEN to your .env.local file",
				},
				{ status: 503 },
			);
		}

		// 4. Resolve image URL for Replicate (must be publicly accessible)
		let resolvedImageUrl: string;
		try {
			resolvedImageUrl = resolveImageUrl(imageUrl, request);
		} catch (urlError) {
			return NextResponse.json(
				{
					error:
						urlError instanceof Error ? urlError.message : "Invalid imageUrl",
				},
				{ status: 400 },
			);
		}

		// 5. Call Replicate API to remove background
		const result = await removeBackgroundWithReplicate(
			resolvedImageUrl,
			replicateToken,
		);

		if (!result.success) {
			return NextResponse.json(
				{
					error: result.error || "Background removal failed",
					suggestion:
						"Check that the image URL is publicly accessible and try again",
				},
				{ status: 503 },
			);
		}

		const outputUrl = result.outputUrl;
		if (!outputUrl) {
			return NextResponse.json(
				{ error: "No output image received from Replicate" },
				{ status: 500 },
			);
		}

		// 6. Download the processed image
		const processedImageResponse = await fetch(outputUrl);
		if (!processedImageResponse.ok) {
			throw new Error("Failed to download processed image");
		}

		const processedImageBuffer = Buffer.from(
			await processedImageResponse.arrayBuffer(),
		);

		// 7. Upload to R2
		const fileName = `${nanoid()}.png`;
		const storageKey = `bg-removed/${user.id}/${fileName}`;

		const r2Client = getR2Client();
		await r2Client.send(
			new PutObjectCommand({
				Bucket: process.env.R2_BUCKET_NAME,
				Key: storageKey,
				Body: processedImageBuffer,
				ContentType: "image/png",
			}),
		);

		const publicUrl = `${process.env.R2_PUBLIC_URL}/${storageKey}`;

		console.log(`✅ Background removed: ${publicUrl}`);

		return NextResponse.json({
			image: {
				url: publicUrl,
				originalUrl: imageUrl,
			},
		});
	} catch (error) {
		console.error("Background removal error:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : "Background removal failed",
			},
			{ status: 500 },
		);
	}
}

/**
 * Remove background using Replicate's rembg model
 */
async function removeBackgroundWithReplicate(
	imageUrl: string,
	apiToken?: string,
): Promise<{ success: boolean; outputUrl?: string; error?: string }> {
	try {
		// Use Replicate's prediction API
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};

		if (apiToken) {
			headers["Authorization"] = `Token ${apiToken}`;
		}

		// Create prediction
		const createResponse = await fetch(
			"https://api.replicate.com/v1/predictions",
			{
				method: "POST",
				headers,
				body: JSON.stringify({
					// Using cjwbw/rembg - a popular background removal model
					version:
						"fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
					input: {
						image: imageUrl,
					},
				}),
			},
		);

		if (!createResponse.ok) {
			const errorData = await createResponse.json().catch(() => ({}));
			console.error("Replicate create prediction failed:", errorData);

			// If it's an auth error and no token provided, return failure
			if (createResponse.status === 401 || createResponse.status === 403) {
				return {
					success: false,
					error:
						"Replicate API token required. Add REPLICATE_API_TOKEN to .env.local",
				};
			}

			return {
				success: false,
				error: errorData.detail || "Failed to create prediction",
			};
		}

		const prediction = await createResponse.json();

		// Poll for completion
		let result = prediction;
		let attempts = 0;
		const maxAttempts = 60; // Max 60 seconds

		while (
			result.status !== "succeeded" &&
			result.status !== "failed" &&
			attempts < maxAttempts
		) {
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const pollResponse = await fetch(result.urls.get, { headers });
			if (!pollResponse.ok) {
				throw new Error("Failed to poll prediction status");
			}

			result = await pollResponse.json();
			attempts++;
		}

		if (result.status === "succeeded" && result.output != null) {
			// Replicate rembg returns output as string URL or array
			const outputUrl = Array.isArray(result.output)
				? result.output[0]
				: result.output;
			if (typeof outputUrl === "string") {
				return { success: true, outputUrl };
			}
		}

		return {
			success: false,
			error: result.error || "Background removal timed out or failed",
		};
	} catch (error) {
		console.error("Replicate API error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Replicate API error",
		};
	}
}

/**
 * Resolve image URL to absolute for Replicate (must be publicly fetchable)
 */
function resolveImageUrl(imageUrl: string, request: NextRequest): string {
	let url = imageUrl.trim();
	if (url.startsWith("/")) {
		let origin: string;
		try {
			origin = request.nextUrl?.origin ?? new URL(request.url).origin;
		} catch {
			const host = request.headers.get("host") || "localhost:3000";
			const proto = request.headers.get("x-forwarded-proto") || "http";
			origin = `${proto}://${host}`;
		}
		url = `${origin}${url}`;
	} else if (!url.startsWith("http://") && !url.startsWith("https://")) {
		throw new Error(
			"imageUrl must be an absolute URL or relative path (e.g. /api/image-proxy?url=...)",
		);
	}
	return url;
}
