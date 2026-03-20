import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Square, Loader2, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload-service";
import { dispatch } from "@designcombo/events";
import { ADD_AUDIO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";

export const VoiceRecorder = () => {
	const [isRecording, setIsRecording] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [duration, setDuration] = useState(0);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<BlobPart[]>([]);
	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

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
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mediaRecorder = new MediaRecorder(stream, {
				mimeType: "audio/webm",
			});

			audioChunksRef.current = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunksRef.current.push(event.data);
				}
			};

			mediaRecorder.onstop = () => {
				const audioBlob = new Blob(audioChunksRef.current, {
					type: "audio/webm",
				});
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
			setIsPlaying(false);

			timerRef.current = setInterval(() => {
				setDuration((prev) => prev + 1);
			}, 1000);
		} catch (err) {
			console.error("Error accessing microphone:", err);
			toast.error("Microphone access denied or unavailable.");
		}
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
		if (!audioUrl || audioChunksRef.current.length === 0) return;

		try {
			setIsProcessing(true);
			const audioBlob = new Blob(audioChunksRef.current, {
				type: "audio/webm",
			});
			const file = new File([audioBlob], `VoiceOver_${Date.now()}.webm`, {
				type: "audio/webm",
			});

			// Simulate a generic upload ID
			const uploadId = `upload_${Date.now()}`;

			const uploadResult = await uploadFile(file);

			if (!uploadResult?.url) {
				throw new Error("Upload returned no URL.");
			}

			// Add to timeline
			dispatch(ADD_AUDIO, {
				payload: {
					id: generateId(),
					details: { src: uploadResult.url },
					volume: 100,
				},
				options: {},
			});

			toast.success("Voice recording added to timeline!");
			setAudioUrl(null);
			setDuration(0);
		} catch (err) {
			console.error("Upload error:", err);
			toast.error("Failed to upload recording.");
		} finally {
			setIsProcessing(false);
		}
	};

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
