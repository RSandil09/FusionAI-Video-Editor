import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { getR2Client } from "@/lib/r2-client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateVoiceSchema, parseBody } from "@/lib/api-validation";

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST /api/generate-voice
 * Generate speech from text using Google Cloud Text-to-Speech API
 *
 * Request: { text: string, voiceId: string, folder?: string }
 * Response: { agent: { url: string, duration: number } }
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
			`generate-voice:${user.id}`,
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
		const parsed = parseBody(rawBody, generateVoiceSchema);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error }, { status: 400 });
		}
		const { text, voiceId, folder } = parsed.data;

		console.log(
			`🎙️ Generating voice for user ${user.id}: "${text.slice(0, 50)}..."`,
		);
		console.log(`   Voice ID: ${voiceId}`);

		// 3. Get access token from Firebase service account
		const accessToken = await getGoogleAccessToken();
		if (!accessToken) {
			return NextResponse.json(
				{
					error:
						"Failed to authenticate with Google Cloud. Check service account configuration.",
				},
				{ status: 500 },
			);
		}

		// 4. Parse voice ID - format is like "en-US-Neural2-A" or "en-GB-Neural2-B"
		const voiceConfig = parseVoiceId(voiceId);
		console.log(`   Parsed voice config:`, voiceConfig);

		// 5. Call Google Cloud Text-to-Speech API
		const ttsResponse = await fetch(
			"https://texttospeech.googleapis.com/v1/text:synthesize",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				signal: AbortSignal.timeout(30_000),
				body: JSON.stringify({
					input: { text },
					voice: {
						languageCode: voiceConfig.languageCode,
						name: voiceConfig.name,
						ssmlGender: voiceConfig.gender,
					},
					audioConfig: {
						audioEncoding: "MP3",
						speakingRate: 1.0,
						pitch: 0,
						effectsProfileId: ["small-bluetooth-speaker-class-device"],
					},
				}),
			},
		);

		if (!ttsResponse.ok) {
			const errorData = await ttsResponse.json().catch(() => ({}));
			console.error(
				"Google TTS API error:",
				JSON.stringify(errorData, null, 2),
			);

			// Provide helpful error messages
			const errorMessage = errorData.error?.message || "TTS API failed";
			if (
				errorMessage.includes("not enabled") ||
				errorMessage.includes("403")
			) {
				return NextResponse.json(
					{
						error:
							"Cloud Text-to-Speech API is not enabled. Enable it in Google Cloud Console.",
					},
					{ status: 503 },
				);
			}
			if (
				errorMessage.includes("voice") ||
				errorMessage.includes("not found")
			) {
				return NextResponse.json(
					{ error: `Voice "${voiceId}" not available. Try a different voice.` },
					{ status: 400 },
				);
			}

			return NextResponse.json(
				{ error: `TTS failed: ${errorMessage}` },
				{ status: 500 },
			);
		}

		const ttsData = await ttsResponse.json();
		const audioContent = ttsData.audioContent;

		if (!audioContent) {
			return NextResponse.json(
				{ error: "No audio content received from TTS API" },
				{ status: 500 },
			);
		}

		// 6. Convert base64 to buffer
		const audioBuffer = Buffer.from(audioContent, "base64");
		console.log(`   Audio size: ${audioBuffer.length} bytes`);

		// 7. Upload to R2
		const fileName = `${nanoid()}.mp3`;
		const storageKey = `${folder}/${user.id}/${fileName}`;

		const r2Client = getR2Client();
		await r2Client.send(
			new PutObjectCommand({
				Bucket: process.env.R2_BUCKET_NAME,
				Key: storageKey,
				Body: audioBuffer,
				ContentType: "audio/mpeg",
			}),
		);

		const publicUrl = `${process.env.R2_PUBLIC_URL}/${storageKey}`;

		// 8. Estimate duration (~150 words per minute)
		const wordCount = text.split(/\s+/).length;
		const estimatedDuration = Math.max(1, (wordCount / 150) * 60);

		console.log(`✅ Voice generated: ${publicUrl}`);

		return NextResponse.json({
			agent: {
				url: publicUrl,
				duration: estimatedDuration,
			},
		});
	} catch (error) {
		console.error("Voice generation error:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error ? error.message : "Voice generation failed",
			},
			{ status: 500 },
		);
	}
}

/**
 * Get Google Cloud access token using Firebase service account
 */
async function getGoogleAccessToken(): Promise<string | null> {
	try {
		const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
		if (!serviceAccountJson) {
			console.error("FIREBASE_SERVICE_ACCOUNT not configured");
			return null;
		}

		const serviceAccount = JSON.parse(serviceAccountJson);

		if (!serviceAccount.client_email || !serviceAccount.private_key) {
			console.error("Invalid service account format");
			return null;
		}

		// Create JWT for service account authentication
		const now = Math.floor(Date.now() / 1000);
		const header = { alg: "RS256", typ: "JWT" };
		const payload = {
			iss: serviceAccount.client_email,
			sub: serviceAccount.client_email,
			aud: "https://oauth2.googleapis.com/token",
			iat: now,
			exp: now + 3600,
			scope: "https://www.googleapis.com/auth/cloud-platform",
		};

		// Encode header and payload
		const encodedHeader = base64UrlEncode(JSON.stringify(header));
		const encodedPayload = base64UrlEncode(JSON.stringify(payload));

		// Sign the JWT
		const signatureInput = `${encodedHeader}.${encodedPayload}`;
		const sign = crypto.createSign("RSA-SHA256");
		sign.update(signatureInput);
		const signature = sign.sign(serviceAccount.private_key, "base64");
		const encodedSignature = signature
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");

		const jwt = `${signatureInput}.${encodedSignature}`;

		// Exchange JWT for access token
		const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
				assertion: jwt,
			}),
		});

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.json().catch(() => ({}));
			console.error("Token exchange failed:", errorData);
			return null;
		}

		const tokenData = await tokenResponse.json();
		return tokenData.access_token;
	} catch (error) {
		console.error("Failed to get access token:", error);
		return null;
	}
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(str: string): string {
	return Buffer.from(str)
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

/**
 * Parse voice ID to extract Google TTS parameters
 * Handles formats like: "en-US-Neural2-A", "en-GB-Neural2-B", etc.
 */
function parseVoiceId(voiceId: string): {
	languageCode: string;
	name: string;
	gender: string;
} {
	// Try to parse standard Google voice ID format: "en-US-Neural2-A" or "en-US-Wavenet-D"
	const match = voiceId.match(/^([a-z]{2}-[A-Z]{2})-([A-Za-z0-9]+)-([A-Z])$/);

	if (match) {
		const languageCode = match[1];
		const voiceLetter = match[3].toUpperCase();

		// Determine gender from voice letter
		// For Neural2/Wavenet: A, C, E, F, H, I = Female; B, D, G, J = Male
		const femaleLetters = ["A", "C", "E", "F", "H", "I"];
		const gender = femaleLetters.includes(voiceLetter) ? "FEMALE" : "MALE";

		return {
			languageCode,
			name: voiceId,
			gender,
		};
	}

	// Fallback: try to extract language from the beginning
	const langMatch = voiceId.match(/^([a-z]{2})-([A-Z]{2})/i);
	if (langMatch) {
		return {
			languageCode: `${langMatch[1].toLowerCase()}-${langMatch[2].toUpperCase()}`,
			name: voiceId,
			gender: "NEUTRAL",
		};
	}

	// Default fallback
	console.warn(`Could not parse voice ID: ${voiceId}, using defaults`);
	return {
		languageCode: "en-US",
		name: "en-US-Neural2-A",
		gender: "FEMALE",
	};
}
