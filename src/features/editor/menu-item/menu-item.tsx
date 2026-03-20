import useLayoutStore from "../store/use-layout-store";
import { useSmartEditStore } from "../store/use-smart-edit-store";
import { Transitions } from "./transitions";
import { Texts } from "./texts";
import { Audios } from "./audios";
import { Elements } from "./elements";
import { Images } from "./images";
import { Videos } from "./videos";
import { Captions } from "./captions";
import { VoiceOver } from "./voice-over";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { Uploads } from "./uploads";
import { AiImage } from "./ai-image";
import { AiEdit } from "./ai-edit";
import { Stickers } from "./stickers";
import { Templates } from "./templates";

const ActiveMenuItem = ({ projectId }: { projectId?: string }) => {
	const { activeMenuItem } = useLayoutStore();

	if (activeMenuItem === "transitions") {
		return <Transitions />;
	}
	if (activeMenuItem === "texts") {
		return <Texts />;
	}
	if (activeMenuItem === "shapes") {
		return <Elements />;
	}
	if (activeMenuItem === "videos") {
		return <Videos />;
	}
	if (activeMenuItem === "captions") {
		return <Captions />;
	}

	if (activeMenuItem === "audios") {
		return <Audios />;
	}

	if (activeMenuItem === "images") {
		return <Images />;
	}

	if (activeMenuItem === "voiceOver") {
		return <VoiceOver />;
	}
	if (activeMenuItem === "elements") {
		return <Elements />;
	}
	if (activeMenuItem === "uploads") {
		return <Uploads />;
	}

	if (activeMenuItem === "ai-image") {
		return <AiImage />;
	}

	if (activeMenuItem === "ai-edit") {
		return <AiEdit projectId={projectId} />;
	}

	if (activeMenuItem === "stickers") {
		return <Stickers />;
	}

	if (activeMenuItem === "templates") {
		return <Templates />;
	}

	return null;
};

export const MenuItem = ({ projectId }: { projectId?: string }) => {
	const isLargeScreen = useIsLargeScreen();
	const { activeMenuItem } = useLayoutStore();
	const { analysisResult } = useSmartEditStore();
	const hasSmartEditResults =
		activeMenuItem === "ai-edit" && analysisResult?.segments?.length;
	const panelWidth = hasSmartEditResults
		? "w-[380px]"
		: isLargeScreen
			? "w-[300px]"
			: "w-full";

	return (
		<div
			className={`${panelWidth} flex-1 flex flex-col min-w-0 bg-background/95 border-l border-border/40`}
		>
			<ActiveMenuItem projectId={projectId} />
		</div>
	);
};
