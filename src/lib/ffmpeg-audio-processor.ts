import { logger } from "@/lib/logger";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import util from "util";
import { uploadToR2 } from "@/lib/storage/r2";

const execPromise = util.promisify(exec);

/**
 * Interface replicating the AudioEffects we added to the Types/Frontend
 */
export interface AudioEffectsPayload {
	active?: boolean;
	eq?: {
		active: boolean;
		lowCut: number;
		lowShelf: number;
		bell: number;
		highShelf: number;
		highCut: number;
	};
	compressor?: {
		active: boolean;
		threshold: number;
		ratio: number;
		attack: number;
		release: number;
		makeup: number;
	};
	delay?: { active: boolean; time: number; feedback: number; mix: number };
	reverb?: { active: boolean; size: number; damp: number; mix: number };
}

/**
 * Downloads a file from a URL to a local temporary path
 */
async function downloadAudioToTemp(
	url: string,
	prefix = "audio",
): Promise<string> {
	const tempDir = os.tmpdir();
	const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
	const filePath = path.join(tempDir, fileName);

	const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
	if (!response.ok)
		throw new Error(`Failed to fetch audio: ${response.statusText}`);

	const arrayBuffer = await response.arrayBuffer();
	fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
	return filePath;
}

/**
 * Converts the frontend AudioEffects JSON into a valid FFMPEG audio filter string.
 *
 * Key corrections vs the old version:
 *  - Compressor threshold: FFMPEG acompressor expects a LINEAR ratio (0–1), not dB.
 *    Convert with: 10^(dBval/20)
 *  - Compressor attack/release: FFMPEG expects milliseconds (same as Web Audio after *1000).
 *  - Each band is only emitted when the effect is active AND the value is non-neutral.
 */
function buildFfmpegAudioFilter(effects: AudioEffectsPayload): string {
	const filters: string[] = [];

	// 1. Five-band EQ
	if (effects.eq?.active) {
		if (effects.eq.lowCut > 20) {
			filters.push(`highpass=f=${effects.eq.lowCut}`);
		}
		if (effects.eq.lowShelf !== 0) {
			filters.push(
				`equalizer=f=320:width_type=h:width=200:g=${effects.eq.lowShelf}`,
			);
		}
		if (effects.eq.bell !== 0) {
			filters.push(
				`equalizer=f=1000:width_type=q:width=1.0:g=${effects.eq.bell}`,
			);
		}
		if (effects.eq.highShelf !== 0) {
			filters.push(
				`equalizer=f=3200:width_type=h:width=1000:g=${effects.eq.highShelf}`,
			);
		}
		if (effects.eq.highCut < 20000) {
			filters.push(`lowpass=f=${effects.eq.highCut}`);
		}
	}

	// 2. Compressor
	// FFMPEG acompressor threshold is a LINEAR amplitude ratio (0–1).
	// Web Audio / our UI stores it in dB → convert: linear = 10^(dB/20)
	if (effects.compressor?.active) {
		const thresholdDb = effects.compressor.threshold ?? -24;
		const thresholdLinear = Math.pow(10, thresholdDb / 20);
		const ratio = effects.compressor.ratio ?? 4;
		// FFMPEG attack/release are in milliseconds
		const attack = effects.compressor.attack ?? 10;
		const release = effects.compressor.release ?? 100;
		// makeup is in dB — convert to linear for FFMPEG makeup gain
		const makeupDb = effects.compressor.makeup ?? 0;
		const makeupLinear = Math.pow(10, makeupDb / 20);

		filters.push(
			`acompressor=threshold=${thresholdLinear.toFixed(6)}:ratio=${ratio}:attack=${attack}:release=${release}:makeup=${makeupLinear.toFixed(6)}`,
		);
	}

	// 3. Delay (aecho: in_gain:out_gain:delays_ms:decays)
	if (effects.delay?.active) {
		const time = Math.max(1, effects.delay.time ?? 0);
		const feedback = Math.max(
			0,
			Math.min((effects.delay.feedback ?? 0) / 100, 0.95),
		);
		const mix = Math.max(0, Math.min((effects.delay.mix ?? 0) / 100, 1.0));

		if (time > 0 && mix > 0) {
			const inGain = Math.max(0.1, 1.0 - mix * 0.5);
			const outGain = mix;
			filters.push(
				`aecho=${inGain.toFixed(3)}:${outGain.toFixed(3)}:${time}:${feedback.toFixed(3)}`,
			);
		}
	}

	// 4. Reverb (simulated with two-tap aecho)
	if (effects.reverb?.active) {
		const mix = Math.max(0, Math.min((effects.reverb.mix ?? 0) / 100, 1.0));
		const size = Math.max(1, effects.reverb.size ?? 50);

		if (mix > 0) {
			const inGain = Math.max(0.1, 1.0 - mix * 0.5);
			const tap1 = Math.round(size * 1.5);
			const tap2 = Math.round(size * 2.2);
			filters.push(
				`aecho=${inGain.toFixed(3)}:${mix.toFixed(3)}:${tap1}|${tap2}:0.4|0.3`,
			);
		}
	}

	return filters.join(",");
}

/**
 * Main export: finds audio tracks with audioEffects, processes them through FFMPEG,
 * uploads the result to R2, and replaces the src with a public R2 URL.
 *
 * Using R2 (not file://) because Puppeteer cannot access the local filesystem
 * during Remotion's headless render.
 */
export async function processAudioEffectsForRender(
	trackItemsMap: Record<string, any>,
	renderId: string,
): Promise<{ updatedMap: Record<string, any>; tempR2Keys: string[] }> {
	const updatedMap = { ...trackItemsMap };
	const tempR2Keys: string[] = [];

	const processingPromises = Object.values(updatedMap)
		.filter(
			(item) =>
				// Only process audio items — the original condition included
				// `item.details?.src` which is also truthy for video items, causing
				// their src to be replaced with an .mp3 URL and breaking video rendering.
				item.type === "audio" &&
				item.details?.audioEffects,
		)
		.map(async (item) => {
			const details = item.details ?? {};
			const src = details.src;
			const effects = details.audioEffects as AudioEffectsPayload;

			if (!src || !effects || !effects.active) return;

			// Check if any effect band is actually active
			const anyActive =
				effects.eq?.active ||
				effects.compressor?.active ||
				effects.delay?.active ||
				effects.reverb?.active;
			if (!anyActive) return;

			try {
				logger.log(`[AudioFX] Processing item ${item.id}...`);

				const originalFilePath = await downloadAudioToTemp(
					src,
					`original_audio_${item.id}`,
				);

				const filterStr = buildFfmpegAudioFilter(effects);
				if (!filterStr) {
					fs.unlinkSync(originalFilePath);
					return;
				}

				const outputFilePath = path.join(
					os.tmpdir(),
					`processed_audio_${item.id}_${Date.now()}.mp3`,
				);

				const command = `ffmpeg -y -i "${originalFilePath}" -af "${filterStr}" "${outputFilePath}"`;
				logger.log(`[AudioFX] Running: ${command}`);
				await execPromise(command);

				// Upload processed file to R2 so Puppeteer can fetch it by HTTPS URL
				const r2Key = `temp-audio/${renderId}/${item.id}.mp3`;
				const audioBuffer = fs.readFileSync(outputFilePath);
				const publicUrl = await uploadToR2(r2Key, audioBuffer, "audio/mpeg");

				tempR2Keys.push(r2Key);
				updatedMap[item.id] = {
					...updatedMap[item.id],
					details: { ...updatedMap[item.id].details, src: publicUrl },
				};

				logger.log(`[AudioFX] Replaced ${item.id} src → ${publicUrl}`);

				// Clean up local temp files
				fs.unlinkSync(originalFilePath);
				fs.unlinkSync(outputFilePath);
			} catch (error) {
				logger.error(
					`[AudioFX] Failed to process audio for item ${item.id}:`,
					error,
				);
				// Keep original src so render doesn't crash
			}
		});

	await Promise.all(processingPromises);
	return { updatedMap, tempR2Keys };
}
