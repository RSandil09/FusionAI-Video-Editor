import React, { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Trash2, Shuffle } from "lucide-react";
import { TRANSITIONS, TransitionDef } from "../data/transitions";
import useStore from "../store/use-store";
import { applyTransition, updateTransition } from "../hooks/use-engine-sync";

// Human-readable labels for direction values used by our transition kinds.
const DIRECTION_LABELS: Record<string, string> = {
	left: "←",
	right: "→",
	up: "↑",
	down: "↓",
	"from-left": "←",
	"from-right": "→",
	"from-top": "↑",
	"from-bottom": "↓",
	"from-top-left": "↖",
	"from-top-right": "↗",
	"from-bottom-left": "↙",
	"from-bottom-right": "↘",
	horizontal: "↔",
	vertical: "↕",
};

const EASING_OPTIONS = [
	{ value: "ease", label: "Ease" },
	{ value: "linear", label: "Linear" },
	{ value: "ease-in", label: "Ease In" },
	{ value: "ease-out", label: "Ease Out" },
	{ value: "ease-in-out", label: "Ease In-Out" },
];

const BasicTransition: React.FC<{ transitionId: string }> = ({ transitionId }) => {
	const { transitionsMap, stateManager, setActiveTransitionId } = useStore();
	const transition = transitionsMap[transitionId] as any;

	const [duration, setDuration] = useState((transition?.duration ?? 500) / 1000);

	useEffect(() => {
		if (transition) setDuration((transition.duration ?? 500) / 1000);
	}, [transition?.duration]);

	if (!transition || transition.kind === "none") return null;

	// All TransitionDefs with this kind (including all directional variants)
	const matchingDefs = TRANSITIONS.filter(
		(t) => t.kind === transition.kind && t.kind !== "none",
	);
	// The currently active def (matching kind + direction)
	const currentDef =
		matchingDefs.find(
			(t) => (t.direction ?? "") === (transition.direction ?? ""),
		) ?? matchingDefs[0];

	// Only show direction grid when there are multiple directional variants
	const hasDirections = matchingDefs.length > 1 && matchingDefs.some((t) => t.direction);

	// Preview swatch style (mirrors TransitionCard in picker)
	const swatchStyle: React.CSSProperties = currentDef?.preview
		? { backgroundImage: `url(${currentDef.preview})`, backgroundSize: "cover" }
		: { background: currentDef?.previewColor ?? "hsl(var(--muted))" };

	const handleDurationCommit = (val: number) => {
		if (!stateManager) return;
		updateTransition(stateManager, transitionId, { duration: Math.round(val * 1000) });
	};

	const handleDirectionSelect = (def: TransitionDef) => {
		if (!stateManager) return;
		// Re-apply with the new direction (applyTransition replaces existing entry)
		applyTransition(stateManager, transition.fromId, transition.toId, def);
	};

	const handleRemove = () => {
		if (!stateManager) return;
		const none = TRANSITIONS.find((t) => t.kind === "none")!;
		applyTransition(stateManager, transition.fromId, transition.toId, none);
		setActiveTransitionId(null);
	};

	return (
		<div className="flex flex-1 flex-col">
			{/* Header */}
			<div className="flex h-12 flex-none items-center justify-between px-4 border-b border-border/50">
				<span className="text-sm font-medium text-foreground">Transition</span>
				<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
					{currentDef?.name ?? transition.kind}
				</span>
			</div>

			<div className="flex-1 overflow-hidden">
			<ScrollArea className="h-full">
				<div className="flex flex-col gap-5 px-4 py-4">
					{/* Preview swatch */}
					<div className="flex justify-center">
						<div
							className="w-16 h-16 rounded-xl border border-border/60 shadow-sm"
							style={swatchStyle}
						/>
					</div>

					{/* Duration slider */}
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<Label className="text-xs font-semibold text-primary">Duration</Label>
							<span className="text-xs text-muted-foreground tabular-nums">
								{duration.toFixed(2)}s
							</span>
						</div>
						<Slider
							min={0.1}
							max={3.0}
							step={0.05}
							value={[duration]}
							onValueChange={([v]) => setDuration(v)}
							onValueCommit={([v]) => handleDurationCommit(v)}
							aria-label="Transition duration"
						/>
						<div className="flex justify-between text-[10px] text-muted-foreground/60">
							<span>0.1s</span>
							<span>3.0s</span>
						</div>
					</div>

					{/* Direction grid — only for directional transitions */}
					{hasDirections && (
						<div className="flex flex-col gap-2">
							<Label className="text-xs font-semibold text-primary">Direction</Label>
							<div className="grid grid-cols-4 gap-1.5">
								{matchingDefs.map((def) => {
									const isActive =
										(def.direction ?? "") === (transition.direction ?? "");
									const label = def.direction
										? (DIRECTION_LABELS[def.direction] ?? def.direction)
										: def.name;
									return (
										<button
											key={def.id}
											title={def.name}
											onClick={() => handleDirectionSelect(def)}
											className={`flex items-center justify-center h-8 rounded-md text-sm font-medium transition-all ${
												isActive
													? "bg-primary/20 ring-1 ring-primary text-primary"
													: "bg-muted/60 text-muted-foreground hover:bg-muted"
											}`}
										>
											{label}
										</button>
									);
								})}
							</div>
						</div>
					)}

					{/* Change transition button */}
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs font-semibold text-primary">Type</Label>
						<button
							onClick={() => {
								// Close the right panel's selection so clicking the timeline badge
								// re-opens the picker naturally
								setActiveTransitionId(null);
							}}
							className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted/70 text-xs text-muted-foreground transition-colors"
						>
							<Shuffle size={12} />
							<span>Click badge on timeline to change</span>
						</button>
					</div>

					{/* Remove */}
					<div className="pt-1">
						<Button
							variant="destructive"
							size="sm"
							className="w-full"
							onClick={handleRemove}
						>
							<Trash2 size={13} className="mr-2" />
							Remove Transition
						</Button>
					</div>
				</div>
			</ScrollArea>
			</div>
		</div>
	);
};

export default BasicTransition;
