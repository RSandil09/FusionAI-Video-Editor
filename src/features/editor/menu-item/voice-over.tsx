import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ADD_AUDIO } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const VOICES = [
	{ id: "en-US-Neural2-A", label: "Emma (US Female)" },
	{ id: "en-US-Neural2-D", label: "James (US Male)" },
	{ id: "en-GB-Neural2-A", label: "Sophie (UK Female)" },
	{ id: "en-GB-Neural2-B", label: "Oliver (UK Male)" },
	{ id: "en-AU-Neural2-A", label: "Charlotte (AU Female)" },
	{ id: "en-AU-Neural2-B", label: "Liam (AU Male)" },
];

export const VoiceOver = () => {
	const [voiceId, setVoiceId] = useState<string>(VOICES[0].id);
	const [textValue, setTextValue] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const createVoiceOver = async () => {
		if (!textValue.trim()) {
			setError("Please enter a script.");
			return;
		}
		setError(null);
		setLoading(true);
		try {
			const res = await fetch("/api/generate-voice", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					voiceId,
					text: textValue,
					folder: "voice-overs",
				}),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.error || "Voice generation failed.");
			}

			const { agent } = await res.json();
			if (!agent?.url) throw new Error("No audio URL returned.");

			dispatch(ADD_AUDIO, {
				payload: {
					details: {
						src: agent.url,
						volume: 100,
					},
					name: "Voice Over",
				},
				options: {},
			});
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to generate voice.",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex h-full flex-col">
			<ScrollArea>
				<div className="mb-8 flex flex-1 flex-col">
					<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
						Generate AI voice over
					</div>
					<div className="flex flex-col gap-4 px-4">
						<div className="flex flex-col gap-2">
							<Textarea
								placeholder="Type your script here..."
								className="text-[10px] min-h-[120px]"
								value={textValue}
								onChange={(e) => setTextValue(e.target.value)}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<p className="text-sm font-medium">Speaker voice</p>
							<Select value={voiceId} onValueChange={setVoiceId}>
								<SelectTrigger className="text-xs">
									<SelectValue placeholder="Select a voice" />
								</SelectTrigger>
								<SelectContent>
									{VOICES.map((v) => (
										<SelectItem key={v.id} value={v.id} className="text-xs">
											{v.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{error && <p className="text-xs text-destructive">{error}</p>}
					</div>
				</div>
			</ScrollArea>
			<div className="relative bottom-4 mt-8 h-10 w-full px-4">
				<Button
					onClick={createVoiceOver}
					size="sm"
					className="w-full"
					disabled={loading}
				>
					{loading ? "Generating..." : "Generate Voice"}
				</Button>
			</div>
		</div>
	);
};
