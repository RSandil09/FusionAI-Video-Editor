import { Button } from "@/components/ui/button";
import { dispatch } from "@designcombo/events";
import {
	ACTIVE_SPLIT,
	LAYER_CLONE,
	LAYER_DELETE,
	LAYER_SELECT,
	TIMELINE_SCALE_CHANGED,
} from "@designcombo/state";
import { PLAYER_PAUSE, PLAYER_PLAY } from "../constants/events";
import {
	frameToTimeString,
	getSafeCurrentFrame,
	timeToString,
} from "../utils/time";
import useStore from "../store/use-store";
import {
	Copy,
	Hand,
	MapPin,
	MousePointer2,
	Scissors,
	SquareSplitHorizontal,
	Trash,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import {
	getFitZoomLevel,
	getNextZoomLevel,
	getPreviousZoomLevel,
	getZoomByIndex,
} from "../utils/timeline";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";
import useUpdateAnsestors from "../hooks/use-update-ansestors";
import { ITimelineScaleState } from "@designcombo/types";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
import type { ToolMode } from "./engine/types";
import { cn } from "@/lib/utils";

const IconPlayerPlayFilled = ({ size }: { size: number }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		viewBox="0 0 24 24"
		fill="currentColor"
	>
		<path stroke="none" d="M0 0h24v24H0z" fill="none" />
		<path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" />
	</svg>
);

const IconPlayerPauseFilled = ({ size }: { size: number }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		viewBox="0 0 24 24"
		fill="currentColor"
	>
		<path stroke="none" d="M0 0h24v24H0z" fill="none" />
		<path d="M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
		<path d="M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
	</svg>
);
const IconPlayerSkipBack = ({ size }: { size: number }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path stroke="none" d="M0 0h24v24H0z" fill="none" />
		<path d="M20 5v14l-12 -7z" />
		<path d="M4 5l0 14" />
	</svg>
);

const IconPlayerSkipForward = ({ size }: { size: number }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path stroke="none" d="M0 0h24v24H0z" fill="none" />
		<path d="M4 5v14l12 -7z" />
		<path d="M20 5l0 14" />
	</svg>
);
const TOOL_BUTTONS: {
	mode: ToolMode;
	icon: React.ReactNode;
	title: string;
	key: string;
}[] = [
	{
		mode: "select",
		icon: <MousePointer2 size={13} />,
		title: "Select (V)",
		key: "V",
	},
	{ mode: "razor", icon: <Scissors size={13} />, title: "Razor (B)", key: "B" },
	{ mode: "hand", icon: <Hand size={13} />, title: "Pan (H)", key: "H" },
	{ mode: "marker", icon: <MapPin size={13} />, title: "Marker (M)", key: "M" },
];

const Header = () => {
	const [playing, setPlaying] = useState(false);
	const [toolMode, setToolModeState] = useState<ToolMode>("select");
	const { duration, fps, scale, playerRef, activeIds, timeline } = useStore();

	const handleToolMode = (mode: ToolMode) => {
		setToolModeState(mode);
		(timeline as any)?.setToolMode?.(mode);
	};

	// Keyboard shortcuts for tool modes
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			)
				return;
			const tool = TOOL_BUTTONS.find((t) => t.key === e.key.toUpperCase());
			if (tool) handleToolMode(tool.mode);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [timeline]);

	const handleSkipBack = () => {
		playerRef?.current?.seekTo(0);
	};

	const handleSkipForward = () => {
		if (playerRef?.current) {
			playerRef.current.seekTo(Math.round((duration / 1000) * fps));
		}
	};
	const isLargeScreen = useIsLargeScreen();
	useUpdateAnsestors({ playing, playerRef });

	const currentFrame = useCurrentPlayerFrame(playerRef);

	const doActiveDelete = () => {
		// Pass trackItemIds explicitly — StateManager's delete handler uses
		// payload.trackItemIds when present, otherwise falls back to its internal
		// activeIds which may be stale. Passing them directly is always reliable.
		dispatch(LAYER_DELETE, { payload: { trackItemIds: activeIds } });
	};

	const doActiveSplit = () => {
		if (activeIds.length === 1) {
			dispatch(LAYER_SELECT, { payload: { trackItemIds: activeIds } });
		}
		// Capture time now, but let StateManager process the selection first
		const timeMs = (getSafeCurrentFrame(playerRef) / fps) * 1000;
		requestAnimationFrame(() => {
			dispatch(ACTIVE_SPLIT, {
				payload: {},
				options: { time: timeMs },
			});
		});
	};

	const changeScale = (newScale: ITimelineScaleState) => {
		if (!newScale || typeof newScale.zoom !== "number") {
			console.warn("Invalid scale object passed to changeScale");
			return;
		}
		// Check if timeline is initialized before changing scale
		if (!timeline) {
			console.warn("Timeline not initialized yet, cannot change scale");
			return;
		}
		dispatch(TIMELINE_SCALE_CHANGED, {
			payload: {
				scale: newScale,
			},
		});
	};

	const handlePlay = () => {
		dispatch(PLAYER_PLAY);
	};

	const handlePause = () => {
		dispatch(PLAYER_PAUSE);
	};

	useEffect(() => {
		const player = playerRef?.current;
		if (!player) return;
		const onPlay = () => setPlaying(true);
		const onPause = () => setPlaying(false);
		player.addEventListener("play", onPlay);
		player.addEventListener("pause", onPause);
		return () => {
			player.removeEventListener("play", onPlay);
			player.removeEventListener("pause", onPause);
		};
	}, [playerRef]);

	return (
		<div
			style={{
				position: "relative",
				height: "50px",
				flex: "none",
			}}
		>
			<div
				style={{
					position: "absolute",
					height: 50,
					width: "100%",
					display: "flex",
					alignItems: "center",
				}}
			>
				<div
					style={{
						height: 36,
						width: "100%",
						display: "grid",
						gridTemplateColumns: isLargeScreen
							? "1fr 260px 1fr"
							: "1fr 1fr 1fr",
						alignItems: "center",
					}}
				>
					<div className="flex px-2 gap-0.5 items-center">
						{/* Tool mode switcher */}
						<div className="flex gap-0.5">
							{TOOL_BUTTONS.map((t) => (
								<Button
									key={t.mode}
									title={t.title}
									onClick={() => handleToolMode(t.mode)}
									variant="ghost"
									size="icon"
									className={cn(
										"h-7 w-7 rounded",
										toolMode === t.mode
											? "bg-primary/20 text-primary border border-primary/40"
											: "hover:bg-muted/60",
									)}
								>
									{t.icon}
								</Button>
							))}
						</div>

						{/* Divider */}
						<div className="w-px h-5 bg-border/50 mx-1" />

						{/* Edit actions — icon only, compact */}
						<Button
							disabled={!activeIds.length}
							onClick={doActiveDelete}
							variant="ghost"
							size="icon"
							title="Delete (Del)"
							className="h-7 w-7 rounded hover:bg-destructive/20 hover:text-destructive disabled:opacity-30"
						>
							<Trash size={13} />
						</Button>
						<Button
							disabled={!activeIds.length}
							onClick={doActiveSplit}
							variant="ghost"
							size="icon"
							title="Split at playhead"
							className="h-7 w-7 rounded hover:bg-muted/60 disabled:opacity-30"
						>
							<SquareSplitHorizontal size={13} />
						</Button>
						<Button
							disabled={!activeIds.length}
							onClick={() => dispatch(LAYER_CLONE)}
							variant="ghost"
							size="icon"
							title="Clone"
							className="h-7 w-7 rounded hover:bg-muted/60 disabled:opacity-30"
						>
							<Copy size={13} />
						</Button>
					</div>
					<div className="flex items-center justify-center">
						<div>
							<Button
								className="hidden lg:inline-flex"
								onClick={handleSkipBack}
								variant={"ghost"}
								size={"icon"}
							>
								<IconPlayerSkipBack size={14} />
							</Button>
							<Button
								onClick={() => {
									if (playing) {
										return handlePause();
									}
									handlePlay();
								}}
								variant={"ghost"}
								size={"icon"}
							>
								{playing ? (
									<IconPlayerPauseFilled size={14} />
								) : (
									<IconPlayerPlayFilled size={14} />
								)}
							</Button>
							<Button
								className="hidden lg:inline-flex"
								onClick={handleSkipForward}
								variant={"ghost"}
								size={"icon"}
							>
								<IconPlayerSkipForward size={14} />
							</Button>
						</div>
						<div
							className="text-xs font-light flex"
							style={{
								alignItems: "center",
								gridTemplateColumns: "54px 4px 54px",
								paddingTop: "2px",
								justifyContent: "center",
							}}
						>
							<div
								className="font-medium text-zinc-200"
								style={{
									display: "flex",
									justifyContent: "center",
								}}
								data-current-time={currentFrame / fps}
								id="video-current-time"
							>
								{frameToTimeString({ frame: currentFrame }, { fps })}
							</div>
							<span className="px-1">|</span>
							<div
								className="text-muted-foreground hidden lg:block"
								style={{
									display: "flex",
									justifyContent: "center",
								}}
							>
								{timeToString({ time: duration })}
							</div>
						</div>
					</div>

					<ZoomControl
						scale={scale}
						onChangeTimelineScale={changeScale}
						duration={duration}
						disabled={!timeline}
					/>
				</div>
			</div>
		</div>
	);
};

const ZoomControl = ({
	scale,
	onChangeTimelineScale,
	duration,
	disabled = false,
}: {
	scale: ITimelineScaleState;
	onChangeTimelineScale: (scale: ITimelineScaleState) => void;
	duration: number;
	disabled?: boolean;
}) => {
	const safeIndex = scale?.index ?? 6;
	const safeZoom = scale?.zoom ?? 1;
	const [localValue, setLocalValue] = useState(safeIndex);
	const timelineOffsetX = useTimelineOffsetX();

	useEffect(() => {
		if (scale?.index !== undefined) {
			setLocalValue(scale.index);
		}
	}, [scale?.index]);

	const onZoomOutClick = () => {
		if (disabled) return;
		const previousZoom = getPreviousZoomLevel(scale);
		if (previousZoom) {
			onChangeTimelineScale(previousZoom);
		}
	};

	const onZoomInClick = () => {
		if (disabled) return;
		const nextZoom = getNextZoomLevel(scale);
		if (nextZoom) {
			onChangeTimelineScale(nextZoom);
		}
	};

	const onZoomFitClick = () => {
		if (disabled) return;
		const fitZoom = getFitZoomLevel(duration, safeZoom, timelineOffsetX);
		if (fitZoom) {
			onChangeTimelineScale(fitZoom);
		}
	};

	return (
		<div className="flex items-center justify-end">
			<div className="flex lg:border-l pl-4 pr-2">
				<Button
					size={"icon"}
					variant={"ghost"}
					onClick={onZoomOutClick}
					disabled={disabled}
				>
					<ZoomOut size={16} />
				</Button>
				<Slider
					className="w-28 hidden lg:flex"
					value={[localValue]}
					min={0}
					max={12}
					step={1}
					disabled={disabled}
					onValueChange={(e) => {
						setLocalValue(e[0]); // Update local state
					}}
					onValueCommit={() => {
						if (disabled) return;
						const zoom = getZoomByIndex(localValue);
						onChangeTimelineScale(zoom); // Propagate value to parent when user commits change
					}}
				/>
				<Button
					size={"icon"}
					variant={"ghost"}
					onClick={onZoomInClick}
					disabled={disabled}
				>
					<ZoomIn size={16} />
				</Button>
				<Button
					onClick={onZoomFitClick}
					variant={"ghost"}
					size={"icon"}
					disabled={disabled}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						viewBox="0 0 24 24"
					>
						<path
							fill="currentColor"
							d="M20 8V6h-2q-.425 0-.712-.288T17 5t.288-.712T18 4h2q.825 0 1.413.588T22 6v2q0 .425-.288.713T21 9t-.712-.288T20 8M2 8V6q0-.825.588-1.412T4 4h2q.425 0 .713.288T7 5t-.288.713T6 6H4v2q0 .425-.288.713T3 9t-.712-.288T2 8m18 12h-2q-.425 0-.712-.288T17 19t.288-.712T18 18h2v-2q0-.425.288-.712T21 15t.713.288T22 16v2q0 .825-.587 1.413T20 20M4 20q-.825 0-1.412-.587T2 18v-2q0-.425.288-.712T3 15t.713.288T4 16v2h2q.425 0 .713.288T7 19t-.288.713T6 20zm2-6v-4q0-.825.588-1.412T8 8h8q.825 0 1.413.588T18 10v4q0 .825-.587 1.413T16 16H8q-.825 0-1.412-.587T6 14"
						/>
					</svg>
				</Button>
			</div>
		</div>
	);
};

export default Header;
