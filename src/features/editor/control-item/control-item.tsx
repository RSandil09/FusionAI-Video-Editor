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
import { LassoSelect } from "lucide-react";

const Container = ({ children }: { children: React.ReactNode }) => {
	const { activeIds, trackItemsMap, transitionsMap } = useStore();
	const [trackItem, setTrackItem] = useState<ITrackItem | null>(null);
	const { setTrackItem: setLayoutTrackItem } = useLayoutStore();

	useEffect(() => {
		if (activeIds.length === 1) {
			const [id] = activeIds;
			const trackItem = trackItemsMap[id];
			if (trackItem) {
				setTrackItem(trackItem);
				setLayoutTrackItem(trackItem);
			} else console.log(transitionsMap[id]);
		} else {
			setTrackItem(null);
			setLayoutTrackItem(null);
		}
	}, [activeIds, trackItemsMap]);

	return (
		<div className="flex w-[272px] flex-none border-l border-border/60 bg-muted/50 backdrop-blur-sm hidden lg:block">
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
