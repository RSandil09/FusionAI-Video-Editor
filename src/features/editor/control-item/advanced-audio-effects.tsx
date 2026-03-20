import React, { useState } from "react";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings2, Volume2, Waves, Activity } from "lucide-react";

interface AdvancedAudioEffectsProps {
	trackItem: any;
	activeItemId: string;
}

/**
 * Replaces basic-audio.tsx with an Ableton-styled "Device Rack"
 * Features horizontal scrolling across discrete effect blocks.
 */
export const AdvancedAudioEffects = ({
	trackItem,
	activeItemId,
}: AdvancedAudioEffectsProps) => {
	const [properties, setProperties] = useState(trackItem);

	const handleEffectChange = (
		effectGroup: string,
		param: string,
		value: number | boolean,
	) => {
		const currentDetails = trackItem.details || {};
		// Ensure we preserve the defaults if this is the first time the user adjusts something
		const currentEffects = (currentDetails as any).audioEffects || {
			eq: {
				active: true,
				lowCut: 20,
				lowShelf: 0,
				bell: 0,
				highShelf: 0,
				highCut: 20000,
			},
			compressor: {
				active: true,
				threshold: -24,
				ratio: 4,
				attack: 10,
				release: 100,
				makeup: 0,
			},
			delay: { active: true, time: 0, feedback: 0, mix: 0 },
			reverb: { active: true, size: 50, damp: 50, mix: 0 },
		};

		const updatedEffects = {
			...currentEffects,
			[effectGroup]: {
				...currentEffects[effectGroup],
				[param]: value,
			},
		};

		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						...currentDetails,
						audioEffects: updatedEffects,
					},
				},
			},
		});

		setProperties((prev: any) => ({
			...prev,
			details: {
				...prev.details,
				audioEffects: updatedEffects,
			},
		}));
	};

	const getEffectVal = (group: string, param: string, fallback: any) => {
		const effects = (properties.details as any)?.audioEffects;
		if (!effects || !effects[group]) return fallback;
		return effects[group][param] ?? fallback;
	};

	// ─── Ableton-styled Parameter Knob/Slider Macro ───────────────
	const renderDial = (
		label: string,
		group: string,
		param: string,
		min: number,
		max: number,
		step: number,
		unit: string = "",
	) => {
		const val = getEffectVal(group, param, min);
		return (
			<div className="flex flex-col items-center gap-2 w-16">
				<Slider
					orientation="vertical"
					min={min}
					max={max}
					step={step}
					value={[val]}
					onValueChange={(vals) => handleEffectChange(group, param, vals[0])}
					className="h-24 w-2"
				/>
				<div className="flex flex-col items-center text-center">
					<span className="text-[10px] text-muted-foreground uppercase ">
						{label}
					</span>
					<span className="text-xs font-mono font-medium">
						{val}
						{unit}
					</span>
				</div>
			</div>
		);
	};

	// ─── Device Container Macro ───────────────
	const DeviceBlock = ({
		title,
		group,
		children,
	}: { title: string; group: string; children: React.ReactNode }) => {
		const isActive = getEffectVal(group, "active", true);
		return (
			<div
				className={`flex flex-col border rounded-md overflow-hidden bg-background shrink-0 w-max transition-opacity ${!isActive ? "opacity-50" : "opacity-100"}`}
			>
				<div className="flex items-center justify-between bg-secondary px-3 py-1.5 border-b">
					<div className="flex items-center gap-2">
						<Switch
							checked={isActive}
							onCheckedChange={(c) => handleEffectChange(group, "active", c)}
							className="scale-75 origin-left"
						/>
						<span className="text-xs font-bold uppercase tracking-wider">
							{title}
						</span>
					</div>
				</div>
				<div className="flex gap-4 p-4 items-end bg-secondary/10">
					{children}
				</div>
			</div>
		);
	};

	// ─── Compact Preview Block ───────────────
	const PreviewBlock = ({
		title,
		group,
		icon: Icon,
	}: { title: string; group: string; icon: any }) => {
		const isActive = getEffectVal(group, "active", true);
		return (
			<div
				className={`flex items-center justify-between p-3 border rounded-lg bg-background/50 transition-colors ${isActive ? "border-primary/50" : "border-border/50 opacity-60"}`}
			>
				<div className="flex items-center gap-3">
					<div
						className={`p-2 rounded-md ${isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
					>
						<Icon className="w-4 h-4" />
					</div>
					<span className="text-sm font-medium">{title}</span>
				</div>
				<Switch
					checked={isActive}
					onCheckedChange={(c) => handleEffectChange(group, "active", c)}
					className="scale-75 origin-right"
				/>
			</div>
		);
	};

	return (
		<div className="w-full flex-1 flex flex-col pt-2">
			<div className="px-4 pb-4 flex flex-col gap-3">
				<PreviewBlock title="Parametric EQ" group="eq" icon={Activity} />
				<PreviewBlock title="Compressor" group="compressor" icon={Volume2} />
				<PreviewBlock title="Delay" group="delay" icon={Waves} />
				<PreviewBlock title="DSP Reverb" group="reverb" icon={Waves} />
			</div>

			<Dialog>
				<div className="px-4 mt-auto">
					<DialogTrigger asChild>
						<Button
							className="w-full h-12 shadow-md hover:shadow-lg transition-all"
							variant="default"
						>
							<Settings2 className="w-4 h-4 mr-2" />
							Open Device Rack
						</Button>
					</DialogTrigger>
				</div>

				<DialogContent className="max-w-5xl w-[90vw] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 flex flex-col">
					<DialogHeader className="px-6 py-4 border-b bg-background/50">
						<DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
							<Settings2 className="w-5 h-5 text-primary" />
							Advanced Audio Effects Rack
						</DialogTitle>
					</DialogHeader>

					<ScrollArea className="w-full">
						<div className="flex w-max p-8 gap-6 min-h-[400px]">
							{/* EQ8 Style */}
							<DeviceBlock title="Parametric EQ" group="eq">
								{renderDial("Low Cut", "eq", "lowCut", 20, 800, 10, "hz")}
								{renderDial("Low Shelf", "eq", "lowShelf", -24, 24, 1, "db")}
								{renderDial("Bell", "eq", "bell", -24, 24, 1, "db")}
								{renderDial("Hi Shelf", "eq", "highShelf", -24, 24, 1, "db")}
								{renderDial("Hi Cut", "eq", "highCut", 2000, 20000, 100, "hz")}
							</DeviceBlock>

							{/* Compressor Style */}
							<DeviceBlock title="Dynamics" group="compressor">
								{renderDial(
									"Thresh",
									"compressor",
									"threshold",
									-60,
									0,
									1,
									"db",
								)}
								{renderDial("Ratio", "compressor", "ratio", 1, 20, 0.1, ":1")}
								{renderDial(
									"Attack",
									"compressor",
									"attack",
									0.1,
									100,
									0.1,
									"ms",
								)}
								{renderDial(
									"Release",
									"compressor",
									"release",
									1,
									1000,
									1,
									"ms",
								)}
								{renderDial("Makeup", "compressor", "makeup", -24, 24, 1, "db")}
							</DeviceBlock>

							{/* Delay Style */}
							<DeviceBlock title="Analog Delay" group="delay">
								{renderDial("Time", "delay", "time", 1, 2000, 1, "ms")}
								{renderDial("Fdbk", "delay", "feedback", 0, 95, 1, "%")}
								{renderDial("Mix", "delay", "mix", 0, 100, 1, "%")}
							</DeviceBlock>

							{/* Reverb Style */}
							<DeviceBlock title="Plate Reverb" group="reverb">
								{renderDial("Size", "reverb", "size", 1, 100, 1, "%")}
								{renderDial("Damp", "reverb", "damp", 0, 100, 1, "%")}
								{renderDial("Mix", "reverb", "mix", 0, 100, 1, "%")}
							</DeviceBlock>
						</div>
						<ScrollBar orientation="horizontal" className="h-4 p-1" />
					</ScrollArea>
				</DialogContent>
			</Dialog>
		</div>
	);
};
