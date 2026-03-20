import { ScrollArea } from "@/components/ui/scroll-area";
import { IAudio, ITrackItem } from "@designcombo/types";
import Volume from "./common/volume";
import Speed from "./common/speed";
import React, { useState } from "react";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT, LAYER_REPLACE } from "@designcombo/state";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdvancedAudioEffects } from "./advanced-audio-effects";

const BasicAudio = ({
	trackItem,
	type,
}: {
	trackItem: ITrackItem & IAudio;
	type?: string;
}) => {
	const showAll = !type;
	const [properties, setProperties] = useState(trackItem);

	const handleChangeVolume = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					details: {
						volume: v,
					},
				},
			},
		});

		setProperties((prev) => {
			return {
				...prev,
				details: {
					...prev.details,
					volume: v,
				},
			};
		});
	};

	const handleChangeSpeed = (v: number) => {
		dispatch(EDIT_OBJECT, {
			payload: {
				[trackItem.id]: {
					playbackRate: v,
				},
			},
		});

		setProperties((prev) => {
			return {
				...prev,
				playbackRate: v,
			};
		});
	};

	const components = [
		{
			key: "volume",
			component: (
				<Volume
					value={properties.details.volume ?? 100}
					onChange={(v) => handleChangeVolume(v)}
				/>
			),
		},
		{
			key: "speed",
			component: (
				<Speed
					value={properties.playbackRate ?? 1}
					onChange={(v) => handleChangeSpeed(v)}
				/>
			),
		},
	];

	return (
		<div className="flex flex-1 flex-col max-h-[calc(100vh-48px)]">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
				Audio Options
			</div>

			{/* 
        On mobile/horizontal view, `showAll` is false and we just render the specific `type` (e.g., volume or speed).
        But on Desktop layout, `showAll` is true, and we need to wrap everything in a Tab interface
        so the user can actually reach the Advanced Audio Effects.
      */}
			{showAll ? (
				<Tabs defaultValue="basic" className="flex flex-col flex-1 min-h-0">
					<div className="px-4 pb-2 shrink-0">
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="basic">Basic</TabsTrigger>
							<TabsTrigger value="advanced">Advanced</TabsTrigger>
						</TabsList>
					</div>
					<TabsContent value="basic" className="flex-1 mt-0 h-full">
						<ScrollArea className="h-full">
							<div className="flex flex-col gap-2 px-4 py-4">
								{components.map((comp) => (
									<React.Fragment key={comp.key}>
										{comp.component}
									</React.Fragment>
								))}
							</div>
						</ScrollArea>
					</TabsContent>
					<TabsContent value="advanced" className="flex-1 mt-0 h-full">
						<AdvancedAudioEffects
							trackItem={trackItem as ITrackItem & IAudio}
							activeItemId={trackItem?.id || ""}
						/>
					</TabsContent>
				</Tabs>
			) : (
				<ScrollArea className="h-full">
					<div className="flex flex-col gap-2 px-4 py-4">
						{components
							.filter((comp) => comp.key === type)
							.map((comp) => (
								<React.Fragment key={comp.key}>{comp.component}</React.Fragment>
							))}
					</div>
				</ScrollArea>
			)}
		</div>
	);
};

export default BasicAudio;
