import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Square, Loader2, Play, Pause, MicOff, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload-service";
import { dispatch } from "@designcombo/events";
import { ADD_AUDIO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";

/**
 * Pick the best supported audio mimeType for MediaRecorder in the current browser.
 * Safari supports mp4/aac; Firefox/Chrome support webm/opus.
 */
function getSupportedMimeType(): string {
	const candidates = [
		"audio/webm;codecs=opus",
		"audio/webm",
		"audio/ogg;codecs=opus",
		"audio/ogg",
		"audio/mp4",
		"audio/mp4;codecs=mp4a.40.2",
	];
	for (const type of candidates) {
		if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
			return type;
		}
	}
	return ""; // Let the browser choose its own default
}

/** Resolve the true duration of an audio Blob by loading it into an Audio element. */
function getAudioDuration(blob: Blob): Promise<number> {
	return new Promise((resolve) => {
		const url = URL.createObjectURL(blob);
		const audio = new Audio();
		audio.preload = "metadata";
		audio.onloadedmetadata = () => {
			URL.revokeObjectURL(url);
			resolve(isFinite(audio.duration) ? audio.duration : 0);
		};
		audio.onerror = () => {
			URL.revokeObjectURL(url);
			resolve(0);
		};
		audio.src = url;
	});
}

type PermissionState = "unknown" | "checking" | "prompt" | "granted" | "denied" | "unavailable";

export const VoiceRecorder = () => {
	const [isRecording, setIsRecording] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [duration, setDuration] = useState(0);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [permState, setPermState] = useState<PermissionState>("checking");

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<BlobPart[]>([]);
	const audioBlobRef = useRef<Blob | null>(null);
	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
	const permListenerRef = useRef<(() => void) | null>(null);

	// ── Check initial permission state ──────────────────────────────────────────
	useEffect(() => {
		let cancelled = false;

		async function check() {
			// No mediaDevices API means non-secure context or old browser
			if (
				typeof navigator === "undefined" ||
				!navigator.mediaDevices ||
				typeof navigator.mediaDevices.getUserMedia !== "function"
			) {
				if (!cancelled) setPermState("unavailable");
				return;
			}

			// Try the permissions API first (Chrome/Edge/Firefox — Safari partial)
			if (navigator.permissions) {
				try {
					const status = await navigator.permissions.query({
						name: "microphone" as PermissionName,
					});
					if (!cancelled) setPermState(status.state as PermissionState);

					// Keep in sync if the user changes the permission while on the page
					const onChange = () => {
						if (!cancelled) setPermState(status.state as PermissionState);
					};
					status.addEventListener("change", onChange);
					permListenerRef.current = () =>
						status.removeEventListener("change", onChange);
					return;
				} catch {
					// permissions API not available (Safari) — fall through to "unknown"
				}
			}

			if (!cancelled) setPermState("unknown");
		}

		check();
		return () => {
			cancelled = true;
			permListenerRef.current?.();
		};
	}, []);

	// ── Cleanup on unmount ───────────────────────────────────────────────────────
	useEffect(() => {
		return () => {
			stopRecordingContext();
			if (audioUrl) URL.revokeObjectURL(audioUrl);
		};
	}, []);

	const stopRecordingContext = () => {
		if (timerRef.current) clearInterval(timerRef.current);
		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state === "recording"
		) {
			mediaRecorderRef.current.stop();
			mediaRecorderRef.current.stream
				.getTracks()
				.forEach((track) => track.stop());
		}
	};

	const startRecording = async () => {
		// Guard: API unavailable
		if (!navigator.mediaDevices?.getUserMedia) {
			toast.error(
				"Microphone recording is not available. Make sure the page is loaded over HTTPS.",
			);
			setPermState("unavailable");
			return;
		}

		let stream: MediaStream;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			// If we got a stream the permission is now granted
			setPermState("granted");
		} catch (err: any) {
			const name = err?.name || "";
			if (name === "NotAllowedError" || name === "PermissionDeniedError") {
				setPermState("denied");
				toast.error(
					"Microphone access was denied. Click the lock icon in your browser's address bar and allow microphone access, then try again.",
				);
			} else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
				toast.error(
					"No microphone found. Please connect a microphone and try again.",
				);
			} else if (name === "NotReadableError" || name === "TrackStartError") {
				toast.error(
					"Microphone is already in use by another app. Close the other app and try again.",
				);
			} else {
				toast.error(`Microphone error: ${err?.message || "Unknown error"}`);
			}
			return;
		}

		// Choose a MIME type the browser actually supports
		const mimeType = getSupportedMimeType();

		let mediaRecorder: MediaRecorder;
		try {
			mediaRecorder = new MediaRecorder(
				stream,
				mimeType ? { mimeType } : undefined,
			);
		} catch (err: any) {
			// Codec not supported — let browser pick its own default
			try {
				mediaRecorder = new MediaRecorder(stream);
			} catch (fallbackErr: any) {
				stream.getTracks().forEach((t) => t.stop());
				toast.error(
					"Your browser does not support audio recording. Please try Chrome or Firefox.",
				);
				return;
			}
		}

		audioChunksRef.current = [];

		mediaRecorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				audioChunksRef.current.push(event.data);
			}
		};

		mediaRecorder.onstop = () => {
			const resolvedMime = mediaRecorder.mimeType || "audio/webm";
			const audioBlob = new Blob(audioChunksRef.current, {
				type: resolvedMime,
			});
			audioBlobRef.current = audioBlob;
			const localUrl = URL.createObjectURL(audioBlob);
			setAudioUrl(localUrl);
			setIsRecording(false);
		};

		mediaRecorderRef.current = mediaRecorder;
		mediaRecorder.start();

		setIsRecording(true);
		setDuration(0);
		if (audioUrl) URL.revokeObjectURL(audioUrl);
		setAudioUrl(null);
		audioBlobRef.current = null;
		setIsPlaying(false);

		timerRef.current = setInterval(() => {
			setDuration((prev) => prev + 1);
		}, 1000);
	};

	const stopRecording = () => {
		stopRecordingContext();
	};

	const togglePlayback = () => {
		if (!audioPlayerRef.current) return;
		if (isPlaying) {
			audioPlayerRef.current.pause();
		} else {
			audioPlayerRef.current.play();
		}
		setIsPlaying(!isPlaying);
	};

	const addToTimeline = async () => {
		const blob = audioBlobRef.current;
		if (!audioUrl || !blob) return;

		try {
			setIsProcessing(true);

			// Resolve the actual audio duration before uploading
			const durationSec = await getAudioDuration(blob);

			// Derive a file extension from the MIME type
			const mime = blob.type || "audio/webm";
			const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm";

			const file = new File([blob], `VoiceOver_${Date.now()}.${ext}`, {
				type: mime,
			});

			const uploadResult = await uploadFile(file);

			if (!uploadResult?.url) {
				throw new Error("Upload returned no URL.");
			}

			// Proxy through video-proxy so @designcombo can load it with CORS headers
			const proxiedSrc = `/api/video-proxy?url=${encodeURIComponent(uploadResult.url)}`;

			dispatch(ADD_AUDIO, {
				payload: {
					id: generateId(),
					details: { src: proxiedSrc },
					...(durationSec > 0 && { duration: Math.round(durationSec * 1000) }),
					volume: 100,
				},
				options: {},
			});

			toast.success("Voice recording added to timeline!");
			setAudioUrl(null);
			audioBlobRef.current = null;
			setDuration(0);
		} catch (err) {
			console.error("Upload error:", err);
			toast.error(
				err instanceof Error ? err.message : "Failed to upload recording.",
			);
		} finally {
			setIsProcessing(false);
		}
	};

	// ── Blocked / unavailable states ─────────────────────────────────────────────
	if (permState === "unavailable") {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
				<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
					<MicOff className="w-6 h-6 text-muted-foreground" />
				</div>
				<div>
					<p className="text-sm font-semibold">Recording not available</p>
					<p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
						Microphone access requires a secure (HTTPS) connection. Make sure
						you're on the production URL, not an HTTP preview.
					</p>
				</div>
			</div>
		);
	}

	if (permState === "denied") {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
				<div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
					<ShieldAlert className="w-6 h-6 text-destructive" />
				</div>
				<div>
					<p className="text-sm font-semibold">Microphone blocked</p>
					<p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
						Click the lock icon in your browser's address bar, set Microphone to
						"Allow", then reload the page.
					</p>
				</div>
				<Button
					size="sm"
					variant="outline"
					onClick={() => {
						// Re-attempt: will either prompt or fail with NotAllowedError
						setPermState("unknown");
						startRecording();
					}}
				>
					Try again
				</Button>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<ScrollArea className="flex-1">
				<div className="flex flex-col items-center justify-center space-y-8 p-6">
					<div className="text-center">
						<h3 className="text-lg font-semibold mb-2">Voice Recorder</h3>
						<p className="text-sm text-muted-foreground">
							Record a snippet of your voice and add it directly to your video.
						</p>
					</div>

					<div className="flex flex-col items-center gap-4 w-full">
						{/* Timer Display */}
						<div
							className={`text-4xl font-mono ${isRecording ? "text-red-500 animate-pulse" : "text-foreground"}`}
						>
							{Math.floor(duration / 60)
								.toString()
								.padStart(2, "0")}
							:{(duration % 60).toString().padStart(2, "0")}
						</div>

						{/* Record / Stop Button */}
						{!isRecording && !audioUrl ? (
							<Button
								onClick={startRecording}
								className="h-20 w-20 rounded-full bg-red-600 hover:bg-red-700 hover:scale-105 transition-transform"
							>
								<Mic className="h-8 w-8 text-white" />
							</Button>
						) : isRecording ? (
							<Button
								onClick={stopRecording}
								variant="destructive"
								className="h-20 w-20 rounded-full hover:scale-105 transition-transform animate-pulse"
							>
								<Square className="h-8 w-8" fill="currentColor" />
							</Button>
						) : null}

						{/* Post-Recording Actions */}
						{audioUrl && !isRecording && (
							<div className="flex flex-col gap-4 w-full mt-4">
								<audio
									ref={audioPlayerRef}
									src={audioUrl}
									onEnded={() => setIsPlaying(false)}
									className="hidden"
								/>

								<div className="flex gap-2 justify-center w-full">
									<Button
										variant="outline"
										className="flex-1"
										onClick={startRecording}
									>
										<Mic className="mr-2 h-4 w-4" /> Retake
									</Button>
									<Button
										variant="secondary"
										className="flex-1"
										onClick={togglePlayback}
									>
										{isPlaying ? (
											<Pause className="mr-2 h-4 w-4" />
										) : (
											<Play className="mr-2 h-4 w-4" />
										)}
										{isPlaying ? "Pause" : "Listen"}
									</Button>
								</div>

								<Button
									className="w-full mt-4"
									onClick={addToTimeline}
									disabled={isProcessing}
								>
									{isProcessing ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
											Uploading...
										</>
									) : (
										"Add to Timeline"
									)}
								</Button>
							</div>
						)}
					</div>
				</div>
			</ScrollArea>
		</div>
	);
};
