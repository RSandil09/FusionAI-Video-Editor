import React, { useEffect, useRef, useState } from "react";
import { Audio as RemotionAudio } from "remotion";

/**
 * A wrapper around Remotion's <Audio> that intercepts the HTMLAudioElement
 * and routes it through Web Audio API for EQ, Compression, Delay, and Reverb.
 *
 * Note: These Web Audio API effects will ONLY apply in the browser preview.
 * For server-side rendering, an FFMPEG filter string must process the original file.
 */

let globalAudioContext: AudioContext | null = null;
const getAudioContext = () => {
	if (typeof window === "undefined") return null;
	if (!globalAudioContext) {
		// @ts-ignore - Safari fallback
		const AudioCtx = window.AudioContext || window.webkitAudioContext;
		globalAudioContext = new AudioCtx();
	}
	return globalAudioContext;
};
export const AudioWithEffects = ({
	src,
	startFrom,
	endAt,
	volume,
	playbackRate,
	effects,
	durationInSeconds,
}: {
	src: string;
	startFrom?: number;
	endAt?: number;
	volume: number;
	playbackRate: number;
	effects?: any;
	/** Pre-computed duration so Remotion skips its internal network fetch */
	durationInSeconds?: number;
}) => {
	const audioRef = useRef<HTMLAudioElement | null>(null);

	// Audio Node refs
	const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

	// Advanced EQ Nodes (5-Band)
	const lowCutRef = useRef<BiquadFilterNode | null>(null);
	const lowShelfRef = useRef<BiquadFilterNode | null>(null);
	const bellRef = useRef<BiquadFilterNode | null>(null);
	const highShelfRef = useRef<BiquadFilterNode | null>(null);
	const highCutRef = useRef<BiquadFilterNode | null>(null);

	// Compressor
	const compRef = useRef<DynamicsCompressorNode | null>(null);
	const makeupGainRef = useRef<GainNode | null>(null);

	// Delay Nodes
	const delayNodeRef = useRef<DelayNode | null>(null);
	const feedbackNodeRef = useRef<GainNode | null>(null);
	const delayMixRef = useRef<GainNode | null>(null);

	// Reverb Nodes (Simulated)
	const reverbTap1Ref = useRef<DelayNode | null>(null);
	const reverbTap2Ref = useRef<DelayNode | null>(null);
	const reverbDamp1Ref = useRef<BiquadFilterNode | null>(null);
	const reverbMixRef = useRef<GainNode | null>(null);

	useEffect(() => {
		// We only want to set up Web Audio Context if we actually have effects to apply
		if (!effects || Object.keys(effects).length === 0) return;

		const targetElement = audioRef.current;
		if (!targetElement) return;

		const ctx = getAudioContext();
		if (!ctx) return;

		// Cross-origin tracking is required for some storage providers
		targetElement.crossOrigin = "anonymous";

		// Avoid reconnecting the same media element twice
		if (!sourceNodeRef.current) {
			try {
				sourceNodeRef.current = ctx.createMediaElementSource(targetElement);
			} catch (e) {
				// Can throw if already connected
				console.warn("Media element already connected to an audio context");
				return;
			}

			// === Initialize EQ5 ===
			lowCutRef.current = ctx.createBiquadFilter();
			lowCutRef.current.type = "highpass";

			lowShelfRef.current = ctx.createBiquadFilter();
			lowShelfRef.current.type = "lowshelf";

			bellRef.current = ctx.createBiquadFilter();
			bellRef.current.type = "peaking";
			bellRef.current.Q.value = 1.0;

			highShelfRef.current = ctx.createBiquadFilter();
			highShelfRef.current.type = "highshelf";

			highCutRef.current = ctx.createBiquadFilter();
			highCutRef.current.type = "lowpass";

			// === Initialize Compressor ===
			compRef.current = ctx.createDynamicsCompressor();
			makeupGainRef.current = ctx.createGain();

			// === Initialize Delay ===
			delayNodeRef.current = ctx.createDelay(2.0);
			feedbackNodeRef.current = ctx.createGain();
			delayMixRef.current = ctx.createGain();

			// === Initialize Faux-Reverb ===
			reverbTap1Ref.current = ctx.createDelay(1.0);
			reverbTap2Ref.current = ctx.createDelay(1.0);
			reverbDamp1Ref.current = ctx.createBiquadFilter();
			reverbDamp1Ref.current.type = "lowpass";
			reverbMixRef.current = ctx.createGain();

			// Audio Graph Connection:

			// 1. Core Chain
			sourceNodeRef.current.connect(lowCutRef.current);
			lowCutRef.current.connect(lowShelfRef.current);
			lowShelfRef.current.connect(bellRef.current);
			bellRef.current.connect(highShelfRef.current);
			highShelfRef.current.connect(highCutRef.current);
			highCutRef.current.connect(compRef.current);
			compRef.current.connect(makeupGainRef.current);

			// MAIN DRY SEND
			makeupGainRef.current.connect(ctx.destination);

			// 2. Delay Network (Parallel from Makeup Gain)
			makeupGainRef.current.connect(delayNodeRef.current);
			delayNodeRef.current.connect(feedbackNodeRef.current);
			feedbackNodeRef.current.connect(delayNodeRef.current);
			delayNodeRef.current.connect(delayMixRef.current);
			delayMixRef.current.connect(ctx.destination);

			// 3. Reverb Network (Parallel from Makeup Gain)
			makeupGainRef.current.connect(reverbTap1Ref.current);
			reverbTap1Ref.current.connect(reverbDamp1Ref.current);
			reverbDamp1Ref.current.connect(reverbTap2Ref.current);
			reverbTap2Ref.current.connect(reverbMixRef.current);
			reverbMixRef.current.connect(ctx.destination);
		}

		// Apply active effect values ---------------------------------------

		// 1. Equalizer Five
		if (effects?.eq && effects.eq.active) {
			if (lowCutRef.current)
				lowCutRef.current.frequency.value = effects.eq.lowCut || 20;
			if (lowShelfRef.current)
				lowShelfRef.current.gain.value = effects.eq.lowShelf || 0;
			if (bellRef.current) bellRef.current.gain.value = effects.eq.bell || 0;
			if (highShelfRef.current)
				highShelfRef.current.gain.value = effects.eq.highShelf || 0;
			if (highCutRef.current)
				highCutRef.current.frequency.value = effects.eq.highCut || 20000;
		} else {
			// Bypass EQ
			if (lowShelfRef.current) lowShelfRef.current.gain.value = 0;
			if (bellRef.current) bellRef.current.gain.value = 0;
			if (highShelfRef.current) highShelfRef.current.gain.value = 0;
			if (lowCutRef.current) lowCutRef.current.frequency.value = 10;
			if (highCutRef.current) highCutRef.current.frequency.value = 22000;
		}

		// 2. Compressor
		if (effects?.compressor && compRef.current && makeupGainRef.current) {
			if (effects.compressor.active) {
				compRef.current.threshold.value = effects.compressor.threshold ?? -24;
				compRef.current.ratio.value = effects.compressor.ratio ?? 4;
				compRef.current.attack.value = (effects.compressor.attack ?? 10) / 1000;
				compRef.current.release.value =
					(effects.compressor.release ?? 100) / 1000;

				// Convert dB makeup to linear gain multiplier
				const linearGain = Math.pow(10, (effects.compressor.makeup || 0) / 20);
				makeupGainRef.current.gain.value = linearGain;
			} else {
				compRef.current.threshold.value = 0;
				compRef.current.ratio.value = 1;
				makeupGainRef.current.gain.value = 1;
			}
		}

		// 3. Delay
		if (
			effects?.delay &&
			delayNodeRef.current &&
			feedbackNodeRef.current &&
			delayMixRef.current
		) {
			if (effects.delay.active) {
				const t = (effects.delay.time || 1) / 1000;
				delayNodeRef.current.delayTime.value = Math.min(t, 2.0);
				feedbackNodeRef.current.gain.value = Math.min(
					(effects.delay.feedback || 0) / 100,
					0.95,
				);
				delayMixRef.current.gain.value = (effects.delay.mix || 0) / 100;
			} else {
				delayMixRef.current.gain.value = 0;
			}
		}

		// 4. Reverb (Simulated)
		if (
			effects?.reverb &&
			reverbTap1Ref.current &&
			reverbTap2Ref.current &&
			reverbDamp1Ref.current &&
			reverbMixRef.current
		) {
			if (effects.reverb.active) {
				// Scale size % (1-100) to actual delay tap times (10ms - ~150ms)
				const size = Math.max(1, effects.reverb.size || 50);
				reverbTap1Ref.current.delayTime.value = size * 0.0015;
				reverbTap2Ref.current.delayTime.value = size * 0.0022; // Slightly offset for stereo width feel

				// Scale damp (0-100) to Lowpass Filter frequency (10kHz down to 100Hz)
				const damp = effects.reverb.damp || 50;
				reverbDamp1Ref.current.frequency.value = 10000 - damp * 90;

				reverbMixRef.current.gain.value = (effects.reverb.mix || 0) / 100;
			} else {
				reverbMixRef.current.gain.value = 0;
			}
		}

		// Resume context if suspended (Browser autoplay policies)
		if (ctx && ctx.state === "suspended") {
			ctx.resume();
		}

		return () => {
			// Cleanup not required unless the component unmounts
			// And we want to keep the context alive while playing
		};
	}, [src, effects]);

	// Only attach the ref when Web Audio effects are actually active.
	// Remotion's AudioForRendering sets needsToRenderAudioTag = (ref || loop),
	// which triggers delayRender("Loading <Audio> duration...") and forces a
	// network fetch to measure the audio file. Without a ref, Remotion skips
	// this fetch entirely and audio is still composed by Lambda's audio pipeline.
	const hasActiveEffects =
		effects &&
		effects.active &&
		(effects.eq?.active ||
			effects.compressor?.active ||
			effects.delay?.active ||
			effects.reverb?.active);

	return (
		<RemotionAudio
			ref={hasActiveEffects ? (audioRef as any) : undefined}
			startFrom={startFrom}
			endAt={endAt}
			playbackRate={playbackRate}
			src={src}
			volume={volume}
			crossOrigin="anonymous"
			{...(durationInSeconds !== undefined ? { durationInSeconds } : {})}
		/>
	);
};
