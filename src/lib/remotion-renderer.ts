import { bundle } from "@remotion/bundler/dist/bundle";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { getR2Client } from "@/lib/r2-client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { updateRenderStatus } from "@/lib/db/renders";
import path from "path";
import fs from "fs";
import os from "os";

export interface RenderConfig {
	compositionId: string;
	inputProps: any;
	fps: number;
	width: number;
	height: number;
	durationInFrames: number;
}

const LOG_FILE = path.join(process.cwd(), "render.log");

function logToFile(message: string) {
	const timestamp = new Date().toISOString();
	const logLine = `[${timestamp}] ${message}\n`;
	try {
		fs.appendFileSync(LOG_FILE, logLine);
	} catch (e) {
		console.error("Failed to write to log file:", e);
	}
	console.log(message);
}

/**
 * Render a video using Remotion's server-side renderer
 */
export async function renderVideo(
	renderId: string,
	config: RenderConfig,
): Promise<string> {
	console.log(`[${renderId}] renderVideo called. CWD: ${process.cwd()}`);
	try {
		logToFile(
			`[${renderId}] Starting render job. Config: ${JSON.stringify(config.compositionId)}`,
		);

		// Update job to processing with initial progress
		await updateRenderStatus(renderId, { status: "processing", progress: 1 });

		// Step 1: Bundling
		logToFile(`[${renderId}] Bundling Remotion project...`);
		await updateRenderStatus(renderId, { progress: 5 });

		// Point to your Remotion entry point
		const bundleLocation = await bundle({
			entryPoint: path.join(process.cwd(), "src/remotion/index.tsx"),
			webpackOverride: (config: any) => config,
		});

		logToFile(`[${renderId}] Bundle created at: ${bundleLocation}`);
		await updateRenderStatus(renderId, { progress: 20 });

		// Step 2: Select the composition
		logToFile(`[${renderId}] Selecting composition: ${config.compositionId}`);

		const composition = await selectComposition({
			serveUrl: bundleLocation,
			id: config.compositionId,
			inputProps: config.inputProps,
		});

		logToFile(
			`[${renderId}] Composition selected: ${composition.width}x${composition.height}`,
		);
		await updateRenderStatus(renderId, { progress: 30 });

		// Step 3: Prepare output file
		const outputFileName = `${renderId}.mp4`;
		const outputPath = path.join(os.tmpdir(), outputFileName);

		// Step 4: Render the video
		logToFile(`[${renderId}] Rendering video to ${outputPath}...`);

		await renderMedia({
			composition,
			serveUrl: bundleLocation,
			codec: "h264",
			outputLocation: outputPath,
			inputProps: config.inputProps,
			// Allow 3 minutes for video/media to load from R2 (default is 28–30s)
			timeoutInMilliseconds: 180000,
			onProgress: async ({ progress }) => {
				// Progress from 30% to 90%
				const renderProgress = 30 + Math.floor(progress * 60);
				await updateRenderStatus(renderId, { progress: renderProgress });
			},
		});

		logToFile(`[${renderId}] Rendering finished`);
		await updateRenderStatus(renderId, { progress: 90 });

		// Step 5: Upload to R2
		logToFile(`[${renderId}] Uploading to R2...`);

		const videoBuffer = fs.readFileSync(outputPath);
		const r2Client = getR2Client();

		const filePath = `renders/${renderId}.mp4`;

		await r2Client.send(
			new PutObjectCommand({
				Bucket: process.env.R2_BUCKET_NAME,
				Key: filePath,
				Body: videoBuffer,
				ContentType: "video/mp4",
			}),
		);

		// Construct public URL
		const publicUrl = `${process.env.R2_PUBLIC_URL}/${filePath}`;
		logToFile(`[${renderId}] Upload complete: ${publicUrl}`);

		// Cleanup temporary file
		fs.unlinkSync(outputPath);

		// Mark as completed in database
		await updateRenderStatus(renderId, {
			status: "completed",
			progress: 100,
			output_url: publicUrl,
		});

		logToFile(`[${renderId}] Job completed successfully`);

		return publicUrl;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;

		logToFile(`[${renderId}] Render failed: ${errorMessage}`);
		console.error(`[${renderId}] Render failed:`, errorMessage);

		// Mark as failed in database
		await updateRenderStatus(renderId, {
			status: "failed",
			error_message: errorMessage,
			error_stack: errorStack,
		});

		throw error;
	}
}

/**
 * Start a render job in the background
 */
export function startRenderJob(renderId: string, config: RenderConfig): void {
	console.log(`[${renderId}] startRenderJob initiated`);
	// Run render in background (non-blocking)
	renderVideo(renderId, config).catch((error) => {
		console.error(`Background render ${renderId} failed with error:`, error);
		logToFile(
			`[${renderId}] CRITICAL FAIL: ${error instanceof Error ? error.stack : error}`,
		);
	});
}
