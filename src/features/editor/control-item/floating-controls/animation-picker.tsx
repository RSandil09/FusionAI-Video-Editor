import { X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADD_ANIMATION } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import useStore from "../../store/use-store";
import { Animation, presets } from "../../player/animated";
import React, { useRef } from "react";
import useLayoutStore from "../../store/use-layout-store";
import useClickOutside from "../../hooks/useClickOutside";
import { Easing } from "remotion";
import { PresetName } from "../../player/animated/presets";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimationDuration } from "../common/animation-duration";

export const createPresetButtons = (
	filter: (key: string) => boolean,
	type: "in" | "out" | "loop",
	activeIds: string[],
	animationType: "text" | "media",
	trackItemsMap: any,
) =>
	Object.keys(presets)
		.filter(filter)
		.map((presetKey) => {
			const preset = presets[presetKey as "scaleIn"];

			// Plain object — useMemo cannot be called inside a .map() (Rules of Hooks)
			const style = {
				backgroundImage: `url(${preset.previewUrl})`,
				backgroundSize: "cover",
				width: "60px",
				height: "60px",
				borderRadius: "8px",
			};

			if (
				animationType === "media" &&
				preset.property?.toLowerCase().includes("text")
			)
				return null;

			// Check only this tab's slot (not all three), using the outer `type` parameter.
			// The previous code used .some() over all types which shadowed the outer `type`
			// and caused cross-tab highlights (e.g. "Fade In" lit up in the Out tab too).
			const currentItem = trackItemsMap?.[activeIds[0]];
			const animations = currentItem?.animations;
			const isSelected = animations?.[type]?.name === presetKey;

			return (
				<div
					key={presetKey}
					onClick={() =>
						applyAnimation(
							presetKey as PresetName,
							type,
							activeIds,
							trackItemsMap,
						)
					}
					className={[
						"flex cursor-pointer flex-col gap-1.5 text-center text-xs items-center justify-center rounded-lg p-1.5 transition-all duration-150 border-2",
						isSelected
							? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
							: "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/40 hover:text-foreground",
					].join(" ")}
				>
					<div style={style} draggable={false} />
					<div className="truncate w-full leading-snug">{preset.name}</div>
				</div>
			);
		});

const applyAnimation = (
	presetName: PresetName,
	type: "in" | "out" | "loop",
	activeIds: string[],
	trackItemsMap: any,
) => {
	if (!activeIds.length) {
		console.warn("No active ID to apply the animation to.");
		return;
	}
	const presetAnimation: any = presets[presetName];
	const composition: Animation[] = [presetAnimation];
	if (presetName.includes("rotate") && presetName.includes("In"))
		composition.push(presets.scaleIn);
	else if (presetName.includes("shake") && presetName.includes("In")) {
		const shakeMovX = trackItemsMap[activeIds[0]].details.width / 6;
		const shakeMovY = trackItemsMap[activeIds[0]].details.height / 6;
		composition[0].from = presetName.includes("Horizontal")
			? shakeMovX
			: shakeMovY;
		composition[0].to = presetName.includes("Horizontal")
			? -shakeMovX
			: -shakeMovY;
		composition.push({
			property: "scale",
			from: 2,
			to: 1,
			durationInFrames: 30,
			ease: Easing.ease,
			previewUrl: "https://cdn.designcombo.dev/animations/ScaleIn.webp",
			name: "Scale",
		});
	} else if (presetName.includes("shake") && presetName.includes("Out")) {
		const shakeMovX = trackItemsMap[activeIds[0]].details.width / 6;
		const shakeMovY = trackItemsMap[activeIds[0]].details.height / 6;
		composition[0].from = presetName.includes("Horizontal")
			? -shakeMovX
			: -shakeMovY;
		composition[0].to = presetName.includes("Horizontal")
			? shakeMovX
			: shakeMovY;
		composition.push({
			property: "scale",
			from: 1,
			to: 2,
			durationInFrames: 30,
			ease: Easing.ease,
			previewUrl: "https://cdn.designcombo.dev/animations/ScaleOut.webp",
			name: "Scale",
		});
	}
	dispatch(ADD_ANIMATION, {
		payload: {
			id: activeIds[0],
			animations: {
				[type]: {
					name: presetName,
					composition,
				},
			},
		},
	});
};
export default function AnimationPicker({
	animationType = "media",
}: {
	animationType?: "text" | "media";
}) {
	const { activeIds, trackItemsMap } = useStore();

	const presetInButtons = createPresetButtons(
		(key) => key.includes("In"),
		"in",
		activeIds,
		animationType,
		trackItemsMap,
	);
	const presetOutButtons = createPresetButtons(
		(key) => key.includes("Out"),
		"out",
		activeIds,
		animationType,
		trackItemsMap,
	);
	const presetLoopButtons = createPresetButtons(
		(key) => key.includes("Loop"),
		"loop",
		activeIds,
		animationType,
		trackItemsMap,
	);
	const { setFloatingControl } = useLayoutStore();
	const floatingRef = useRef<HTMLDivElement>(null);

	useClickOutside(floatingRef as React.RefObject<HTMLElement>, () =>
		setFloatingControl(""),
	);
	return (
		<div
			ref={floatingRef}
			className="bg-sidebar absolute right-2 top-2 z-[200] w-60 border p-0"
		>
			<div className="handle flex cursor-grab items-center justify-between px-4 py-3">
				<p className="text-sm font-bold">Animations</p>
				<div className="h-4 w-4" onClick={() => setFloatingControl("")}>
					<X className="h-3 w-3 cursor-pointer font-extrabold text-muted-foreground" />
				</div>
			</div>

			<Tabs defaultValue="in" className="w-full px-2">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="in">In</TabsTrigger>
					<TabsTrigger value="loop">Loop</TabsTrigger>
					<TabsTrigger value="out">Out</TabsTrigger>
				</TabsList>

				<TabsContent value="in">
					<ScrollArea className="h-[400px] w-full py-2">
						<div className="grid grid-cols-3 gap-2 py-4">{presetInButtons}</div>
					</ScrollArea>
				</TabsContent>
				<TabsContent value="loop">
					<ScrollArea className="h-[400px] w-full py-2">
						<div className="grid grid-cols-3 gap-2 py-4">
							{presetLoopButtons}
						</div>
					</ScrollArea>
				</TabsContent>
				<TabsContent value="out">
					<ScrollArea className="h-[400px] w-full py-2">
						<div className="grid grid-cols-3 gap-2 py-4">
							{presetOutButtons}
						</div>
					</ScrollArea>
				</TabsContent>
			</Tabs>
			<AnimationDuration />
		</div>
	);
}
