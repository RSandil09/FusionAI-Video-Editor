import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import util from "util";

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
 * Downloads a File from a URL to a local temporary path
 */
async function downloadAudioToTemp(
	url: string,
	prefix = "audio",
): Promise<string> {
	const tempDir = os.tmpdir();
	const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
	const filePath = path.join(tempDir, fileName);

	const response = await fetch(url);
	if (!response.ok)
		throw new Error(`Failed to fetch audio: ${response.statusText}`);

	const arrayBuffer = await response.arrayBuffer();
	fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
	return filePath;
}

/**
 * Converts the frontend AudioEffects JSON into a valid FFMPEG audio filter string
 */
function buildFfmpegAudioFilter(effects: AudioEffectsPayload): string {
	const filters: string[] = [];

	// 1. Equalizer Five (Highpass, LowShelf, Peaking, HighShelf, Lowpass)
	// FFMPEG equalizer node: equalizer=f=freq:width_type=q:width=Q:g=gain
	// FFMPEG highpass/lowpass: highpass=f=freq / lowpass=f=freq
	if (effects.eq && effects.eq.active) {
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

	// 2. Advanced Compressor
	// FFMPEG acompressor: threshold=XdB:ratio=X:attack=X:release=X:makeup=XdB
	if (effects.compressor && effects.compressor.active) {
		const threshold = effects.compressor.threshold || -24;
		const ratio = effects.compressor.ratio || 4;
		const attack = effects.compressor.attack || 10;
		const release = effects.compressor.release || 100;
		const makeup = effects.compressor.makeup || 0;

		filters.push(
			`acompressor=threshold=${threshold}dB:ratio=${ratio}:attack=${attack}:release=${release}:makeup=${makeup}dB`,
		);
	}

	// 3. Delay
	// FFMPEG aecho: in_gain:out_gain:delays:decays
	// If delay is 500ms, and mix is 50%, we setup a basic aecho
	if (effects.delay && effects.delay.active) {
		const time = Math.max(1, effects.delay.time || 0);
		const feedback = Math.max(
			0,
			Math.min((effects.delay.feedback || 0) / 100, 0.95),
		);
		const mix = Math.max(0, Math.min((effects.delay.mix || 0) / 100, 1.0));

		if (time > 0 && mix > 0) {
			const inGain = 1.0 - mix * 0.5; // Reduce dry slightly as wet increases
			const outGain = mix;
			filters.push(`aecho=${inGain}:${outGain}:${time}:${feedback}`);
		}
	}

	// 4. Reverb (Simulated with dense delay/chorus or aecho)
	if (effects.reverb && effects.reverb.active) {
		const mix = Math.max(0, Math.min((effects.reverb.mix || 0) / 100, 1.0));
		const size = Math.max(1, effects.reverb.size || 50);

		if (mix > 0) {
			const inGain = 1.0 - mix * 0.5;
			// Size 1-100 scales roughly 10ms to 150ms delay time ranges for multiple taps
			const tap1 = Math.round(size * 1.5);
			const tap2 = Math.round(size * 2.2);
			filters.push(`aecho=${inGain}:${mix}:${tap1}|${tap2}:0.4|0.3`);
		}
	}

	return filters.join(",");
}

/**
 * Main export: Takes an array of track items, finds any audio tracks with
 * audioEffects, downloads them, processes through FFMPEG, and replaces the `src` with the processed file.
 */
export async function processAudioEffectsForRender(
	trackItemsMap: Record<string, any>,
): Promise<Record<string, any>> {
	const updatedMap = { ...trackItemsMap };

	// Collect jobs
	const processingPromises = Object.values(updatedMap)
		.filter(
			(item) =>
				item.type === "audio" ||
				(item.details?.src && item.details?.audioEffects),
		)
		.map(async (item) => {
			const details = item.details || {};
			const src = details.src;
			const effects = details.audioEffects as AudioEffectsPayload;

			// Skip if no src or no actual effects applied
			if (!src || !effects || Object.keys(effects).length === 0) return;

			try {
				console.log(`[AudioFX] Processing item ${item.id} with effects...`);

				// 1. Download original audio
				const originalFilePath = await downloadAudioToTemp(
					src,
					`original_audio_${item.id}`,
				);

				// 2. Build filter graph
				const filterStr = buildFfmpegAudioFilter(effects);

				if (!filterStr) {
					console.log(
						`[AudioFX] Filter string empty for ${item.id}, skipping FFMPEG.`,
					);
					return; // Pass through original if all effects are 0
				}

				// 3. Run FFMPEG
				const tempDir = os.tmpdir();
				const outputFileName = `processed_audio_${item.id}_${Date.now()}.mp3`;
				const outputFilePath = path.join(tempDir, outputFileName);

				// -y overwrites without asking
				const command = `ffmpeg -y -i "${originalFilePath}" -af "${filterStr}" "${outputFilePath}"`;
				console.log(`[AudioFX] Executing: ${command}`);

				await execPromise(command);

				// 4. Replace `src` in the composition map with the local pre-processed file
				// To serve local files during `bundle()`, use absolute path or file:// URI
				updatedMap[item.id].details.src = `file://${outputFilePath}`;

				console.log(
					`[AudioFX] Success! Replaced ${item.id} src with processed file.`,
				);
			} catch (error) {
				console.error(
					`[AudioFX] Failed to process audio for item ${item.id}:`,
					error,
				);
				// Fallback to the original src if FFMPEG fails, so the render doesn't crash completely
			}
		});

	await Promise.all(processingPromises);

	return updatedMap;
}
