import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";
import type { AwsRegion } from "@remotion/lambda/client";
import type { ExportFormat } from "@/features/editor/store/use-download-state";

export interface LambdaRenderConfig {
	compositionId: string;
	inputProps: Record<string, unknown>;
	fps: number;
	width: number;
	height: number;
	durationInFrames: number;
	outName: string;
	format?: ExportFormat;
}

type CodecConfig = {
	codec: "h264" | "h265" | "vp9" | "gif";
	extension: string;
};

const FORMAT_MAP: Record<string, CodecConfig> = {
	"mp4":      { codec: "h264", extension: "mp4" },
	"mp4-hevc": { codec: "h265", extension: "mp4" },
	"webm":     { codec: "vp9",  extension: "webm" },
	"gif":      { codec: "gif",  extension: "gif" },
};

export interface LambdaRenderProgress {
	done: boolean;
	progress: number;
	outputFile?: string;
	fatalErrorEncountered: boolean;
	errors: string[];
}

/**
 * Cancel an in-flight Lambda render by writing a cancellation marker to S3.
 * Remotion's orchestrator checks for this file and stops spawning new renderers.
 */
export async function cancelLambdaRender(
	lambdaRenderId: string,
	bucketName: string,
): Promise<void> {
	const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
	const client = new S3Client({
		region: getRegion(),
		credentials: {
			accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID!,
			secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY!,
		},
	});
	// Remotion checks for this key to know it should abort
	await client.send(
		new PutObjectCommand({
			Bucket: bucketName,
			Key: `renders/${lambdaRenderId}/abort`,
			Body: "true",
		}),
	);
}

function getRegion(): AwsRegion {
	return (process.env.REMOTION_AWS_REGION ?? "us-east-1") as AwsRegion;
}

function getFunctionName(): string {
	const name = process.env.REMOTION_FUNCTION_NAME;
	if (!name) throw new Error("REMOTION_FUNCTION_NAME env var is not set");
	return name;
}

function getServeUrl(): string {
	const url = process.env.REMOTION_SERVE_URL;
	if (!url) throw new Error("REMOTION_SERVE_URL env var is not set");
	return url;
}

/**
 * Kick off a Remotion Lambda render.
 * Returns immediately — use getLambdaProgress to poll status.
 */
export async function startLambdaRender(
	config: LambdaRenderConfig,
): Promise<{ lambdaRenderId: string; bucketName: string }> {
	const { codec, extension } = FORMAT_MAP[config.format ?? "mp4"] ?? FORMAT_MAP["mp4"];

	// Build outName with correct extension
	const baseName = config.outName.replace(/\.[^.]+$/, "");
	const outName = `${baseName}.${extension}`;

	const isGif = codec === "gif";

	const { renderId, bucketName } = await renderMediaOnLambda({
		region: getRegion(),
		functionName: getFunctionName(),
		serveUrl: getServeUrl(),
		composition: config.compositionId,
		inputProps: config.inputProps,
		codec,
		...(isGif ? {} : {
			crf: codec === "h265" ? 20 : 16,
			pixelFormat: "yuv420p",
			audioBitrate: "320k",
		}),
		framesPerLambda: 80,
		timeoutInMilliseconds: 30000,
		logLevel: "error",
		downloadBehavior: { type: "play-in-browser" },
		overwrite: true,
		outName,
	});

	return { lambdaRenderId: renderId, bucketName };
}

/**
 * Check the progress of an in-flight Lambda render.
 * Safe to call from Next.js API routes — no background jobs needed.
 */
export async function getLambdaProgress(
	lambdaRenderId: string,
	bucketName: string,
): Promise<LambdaRenderProgress> {
	const progress = await getRenderProgress({
		renderId: lambdaRenderId,
		functionName: getFunctionName(),
		region: getRegion(),
		bucketName,
		// Reduce Lambda invocations on each progress poll to avoid rate limits
		s3OutputProvider: undefined,
	});

	return {
		done: progress.done,
		progress: Math.min(99, Math.floor((progress.overallProgress ?? 0) * 100)),
		outputFile: progress.outputFile ?? undefined,
		fatalErrorEncountered: progress.fatalErrorEncountered,
		errors: (progress.errors ?? []).map((e) => e.message),
	};
}
