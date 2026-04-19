import React from "react";
import {
	IAudio,
	ICaption,
	IImage,
	IText,
	ITrackItem,
	ITrackItemAndDetails,
	IVideo,
} from "@designcombo/types";
import { useEffect, useState } from "react";
import BasicText from "./basic-text";
import BasicImage from "./basic-image";
import BasicVideo from "./basic-video";
import BasicAudio from "./basic-audio";
import { AdvancedAudioEffects } from "./advanced-audio-effects";
import useStore from "../store/use-store";
import useLayoutStore from "../store/use-layout-store";
import BasicCaption from "./basic-caption";
import BasicTransition from "./basic-transition";
import { LassoSelect } from "lucide-react";

const Container = ({ children }: { children: React.ReactNode }) => {
	const { activeIds, trackItemsMap, activeTransitionId } = useStore();
	const [trackItem, setTrackItem] = useState<ITrackItem | null>(null);
	const { setTrackItem: setLayoutTrackItem } = useLayoutStore();

	useEffect(() => {
		// When a transition is active, don't overwrite trackItem — the panel will
		// render BasicTransition instead (checked in ControlItem).
		if (activeTransitionId) return;

		if (activeIds.length === 1) {
			const [id] = activeIds;
			const item = trackItemsMap[id];
			if (item) {
				setTrackItem(item);
				setLayoutTrackItem(item);
			}
		} else {
			setTrackItem(null);
			setLayoutTrackItem(null);
		}
	}, [activeIds, trackItemsMap, activeTransitionId]);

	// Clear the cached trackItem when a transition is selected so the panel
	// doesn't flicker between the previous item and the transition panel.
	useEffect(() => {
		if (activeTransitionId) {
			setTrackItem(null);
			setLayoutTrackItem(null);
		}
	}, [activeTransitionId]);

	return (
		<div className="hidden lg:flex flex-col w-[272px] flex-none h-[calc(100vh-44px)] border-l border-border/60 bg-muted/50 backdrop-blur-sm overflow-hidden">
			{React.cloneElement(children as React.ReactElement<any>, {
				trackItem,
			})}
		</div>
	);
};

const ActiveControlItem = ({
	trackItem,
}: {
	trackItem?: ITrackItemAndDetails;
}) => {
	const { typeControlItem } = useLayoutStore();
	const { activeTransitionId } = useStore();

	// Transition panel takes precedence over track item panel
	if (activeTransitionId) {
		return <BasicTransition transitionId={activeTransitionId} />;
	}

	if (!trackItem) {
		return (
			<div className="pb-32 flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground h-[calc(100vh-58px)]">
				<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
					<LassoSelect className="h-6 w-6" />
				</div>
				<span className="text-sm">No item selected</span>
				<span className="text-xs text-muted-foreground/70">
					Select an element to edit
				</span>
			</div>
		);
	}
	return (
		<>
			{
				{
					text: <BasicText trackItem={trackItem as ITrackItem & IText} />,
					caption: (
						<BasicCaption trackItem={trackItem as ITrackItem & ICaption} />
					),
					image: <BasicImage trackItem={trackItem as ITrackItem & IImage} />,
					video: <BasicVideo trackItem={trackItem as ITrackItem & IVideo} />,
					audio:
						typeControlItem === "audioEffects" ? (
							<AdvancedAudioEffects
								trackItem={trackItem as ITrackItem & IAudio}
								activeItemId={trackItem.id}
							/>
						) : (
							<BasicAudio trackItem={trackItem as ITrackItem & IAudio} />
						),
				}[trackItem.type as "text"]
			}
		</>
	);
};

export const ControlItem = () => {
	return (
		<Container>
			<ActiveControlItem />
		</Container>
	);
};
