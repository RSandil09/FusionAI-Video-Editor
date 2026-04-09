import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import useStore from "../store/use-store";
import { MouseEvent, TouchEvent, useCallback, useEffect, useRef, useState } from "react";
import { timeMsToUnits, unitsToTimeMs } from "../utils/timeline";
import { TIMELINE_OFFSET_CANVAS_LEFT } from "../constants/constants";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";
const Playhead = ({ scrollLeft }: { scrollLeft: number }) => {
	const playheadRef = useRef<HTMLDivElement>(null);
	const { playerRef, fps, scale } = useStore();
	const currentFrame = useCurrentPlayerFrame(playerRef);
	const position =
		timeMsToUnits((currentFrame / fps) * 1000, scale.zoom) - scrollLeft;
	const [isDragging, setIsDragging] = useState(false);
	// Use refs for drag state so handlers don't need to be recreated on every render
	const dragStateRef = useRef({ startX: 0, startPosition: 0 });
	const timelineOffsetX = useTimelineOffsetX();

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	const handleMouseDown = useCallback(
		(
			e:
				| MouseEvent<HTMLDivElement, globalThis.MouseEvent>
				| TouchEvent<HTMLDivElement>,
		) => {
			e.preventDefault();
			const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
			dragStateRef.current = { startX: clientX, startPosition: position };
			setIsDragging(true);
		},
		[position],
	);

	const handleMouseMove = useCallback(
		(e: globalThis.MouseEvent | globalThis.TouchEvent) => {
			e.preventDefault();
			const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
			const { startX, startPosition } = dragStateRef.current;
			const delta = clientX - startX + scrollLeft;
			const newPosition = startPosition + delta;
			const time = unitsToTimeMs(newPosition, scale.zoom);
			playerRef?.current?.seekTo(Math.round((time * fps) / 1000));
		},
		[scrollLeft, scale.zoom, fps, playerRef],
	);

	const preventDefaultDrag = useCallback((e: Event) => {
		e.preventDefault();
	}, []);

	useEffect(() => {
		if (!isDragging) return;
		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		document.addEventListener("touchmove", handleMouseMove, { passive: false });
		document.addEventListener("touchend", handleMouseUp);
		document.addEventListener("dragstart", preventDefaultDrag);
		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.removeEventListener("touchmove", handleMouseMove);
			document.removeEventListener("touchend", handleMouseUp);
			document.removeEventListener("dragstart", preventDefaultDrag);
		};
	}, [isDragging, handleMouseMove, handleMouseUp, preventDefaultDrag]);

	return (
		<div
			ref={playheadRef}
			onMouseDown={handleMouseDown}
			onTouchStart={handleMouseDown}
			onDragStart={(e) => e.preventDefault()}
			style={{
				position: "absolute",
				left: timelineOffsetX + TIMELINE_OFFSET_CANVAS_LEFT + position,
				top: 50,
				width: 1,
				height: "calc(100% - 40px)",
				zIndex: 10,
				cursor: "pointer",
				touchAction: "none", // Prevent default touch actions
			}}
		>
			<div
				style={{
					borderRadius: "0 0 4px 4px",
				}}
				className="absolute top-0 h-4 w-2 -translate-x-1/2 transform bg-white text-xs font-semibold text-zinc-800"
			/>
			<div className="relative h-full">
				<div className="absolute top-0 h-full w-3 -translate-x-1/2 transform" />
				<div className="absolute top-0 h-full w-0.5 -translate-x-1/2 transform bg-white/50" />
			</div>
		</div>
	);
};

export default Playhead;
