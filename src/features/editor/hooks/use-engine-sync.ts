import { dispatch } from "@designcombo/events";
import {
	LAYER_SELECTION,
	LAYER_SELECT,
	ACTIVE_SPLIT,
} from "@designcombo/state";
import type { IDisplay, ITrim } from "@designcombo/types";
import useStore from "../store/use-store";

/**
 * Build CanvasEngine option callbacks that dispatch back into @designcombo/state.
 *
 * There are TWO separate selection events:
 *   LAYER_SELECT    ("layer:select")    — StateManager listens to this to update its
 *                                         internal activeIds, which delete/split read.
 *   LAYER_SELECTION ("layer:selection") — use-timeline-events listens to this to update
 *                                         the Zustand store's activeIds for the UI.
 * Both must be dispatched on every selection change.
 *
 * NOTE: LAYER_MOVE ("layer:move") is intentionally NOT dispatched here. The
 * @designcombo/state initListeners() does NOT handle that event, so dispatching it
 * would leave the stateManager's internal trackItemsMap stale and positions would
 * not be persisted on save. Instead we call stateManager.updateState() directly.
 */
export function buildEngineCallbacks(
	stateManager: any,
	fps: number,
	playerRef: React.RefObject<any> | null,
	engineRef: React.RefObject<any>,
) {
	return {
		onScroll: (_v: { scrollTop: number; scrollLeft: number }) => {
			// Handled directly in timeline.tsx
		},
		onResizeCanvas: (_size: { width: number; height: number }) => {
			// Handled directly in timeline.tsx
		},
		onSelectionChange: (ids: string[]) => {
			dispatch(LAYER_SELECT, { payload: { trackItemIds: ids } });
			dispatch(LAYER_SELECTION, { payload: { activeIds: ids } });
		},
		onItemMove: (id: string, display: IDisplay) => {
			// Directly update the stateManager — LAYER_MOVE dispatch does NOT work because
			// @designcombo/state's initListeners never handles "layer:move".
			const current = stateManager.getState();
			const updatedMap = {
				...current.trackItemsMap,
				[id]: { ...current.trackItemsMap[id], display },
			};
			// Use current.duration as the floor so duration only GROWS during a live
			// drag — never shrinks. Shrinking durationInFrames while Remotion's player
			// is past the new boundary throws an invariant error. Duration will be
			// recalculated correctly on resize or the next full state sync.
			const newDuration = Math.max(
				current.duration,
				...Object.values(updatedMap).map((item: any) => item.display?.to ?? 0),
			);
			stateManager.updateState(
				{ trackItemsMap: updatedMap, duration: newDuration },
				{ updateHistory: true, kind: "update" },
			);
		},
		onItemResize: (id: string, display: IDisplay, trim: ITrim) => {
			const current = stateManager.getState();
			const updatedMap = {
				...current.trackItemsMap,
				[id]: { ...current.trackItemsMap[id], display, trim },
			};
			const newDuration = Math.max(
				0,
				...Object.values(updatedMap).map((item: any) => item.display?.to ?? 0),
			);
			stateManager.updateState(
				{
					trackItemsMap: updatedMap,
					duration: newDuration || current.duration,
				},
				{ updateHistory: true, kind: "update" },
			);
		},
		onItemChangeTrack: (
			id: string,
			display: IDisplay,
			fromTrackId: string,
			toTrackId: string,
		) => {
			// Move item from source track to target track and update display timing.
			// Also removes the source track if it becomes empty after the move.
			const current = stateManager.getState();
			const newTracks = current.tracks
				.map((t: any) => {
					const propName = "items" in t ? "items" : "trackItemIds";
					const items: string[] = t[propName] ?? [];
					if (t.id === fromTrackId) {
						return {
							...t,
							[propName]: items.filter((itemId: string) => itemId !== id),
						};
					}
					if (t.id === toTrackId) {
						return { ...t, [propName]: [...items, id] };
					}
					return t;
				})
				.filter((t: any) => {
					// Remove tracks that became empty
					const items: string[] = t.items ?? t.trackItemIds ?? [];
					return items.length > 0;
				});
			const updatedMap = {
				...current.trackItemsMap,
				[id]: { ...current.trackItemsMap[id], display },
			};

			// Nullify any transitions that reference the moved item.
			// Leaving them intact causes groupTrackItems() in composition.tsx to build
			// a cross-track TransitionSeries that renders at the wrong time on the wrong
			// track. Setting kind:"none" disables the transition while preserving the
			// record for undo (the library's own pattern for disabled transitions).
			const currentTransitionsMap: Record<string, any> =
				current.transitionsMap ?? {};
			const newTransitionsMap = Object.fromEntries(
				Object.entries(currentTransitionsMap).map(([tId, t]: [string, any]) => {
					if (t.fromId === id || t.toId === id) {
						return [tId, { ...t, kind: "none" }];
					}
					return [tId, t];
				}),
			);

			const newDuration = Math.max(
				0,
				...Object.values(updatedMap).map((item: any) => item.display?.to ?? 0),
			);

			// Recompute trackItemIds so render order (z-index) reflects the new track
			// arrangement. trackItemIds order determines JSX render order in
			// composition.tsx: the LAST entry renders on top.  tracks[0] is the top
			// (visually highest) track, so its items must appear last in the array.
			// Reversing newTracks gives: bottom-track items first, top-track items last.
			const newTrackItemIds = [...newTracks]
				.reverse()
				.flatMap(
					(t: any) => (t.items ?? t.trackItemIds ?? []) as string[],
				);

			stateManager.updateState(
				{
					tracks: newTracks,
					trackItemIds: newTrackItemIds,
					trackItemsMap: updatedMap,
					transitionsMap: newTransitionsMap,
					duration: newDuration || current.duration,
				},
				{ updateHistory: true, kind: "update" },
			);
		},
		onItemSplit: (id: string, timeMs: number) => {
			dispatch(LAYER_SELECT, { payload: { trackItemIds: [id] } });
			dispatch(LAYER_SELECTION, { payload: { activeIds: [id] } });
			requestAnimationFrame(() => {
				dispatch(ACTIVE_SPLIT, { payload: {}, options: { time: timeMs } });
			});
		},
		onMarkerAdd: (_marker: any) => {
			// Sync the full marker list from the engine into the Zustand store
			// so it gets included in the next auto-save.
			const eng = engineRef.current;
			if (!eng) return;
			const allMarkers = eng.getMarkers?.() ?? [];
			useStore.getState().setMarkers(allMarkers);
		},
		onMarkerSeek: (timeMs: number) => {
			if (playerRef?.current) {
				playerRef.current.seekTo(Math.round((timeMs / 1000) * fps));
			}
		},
	};
}
