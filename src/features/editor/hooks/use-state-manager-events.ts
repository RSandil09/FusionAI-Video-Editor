import { useEffect, useCallback } from "react";
import StateManager from "@designcombo/state";
import useStore from "../store/use-store";
import { IAudio, ITrackItem, IVideo } from "@designcombo/types";
import { audioDataManager } from "../player/lib/audio-data";

export const useStateManagerEvents = (stateManager: StateManager) => {
	const { setState } = useStore();

	const handleTrackItemUpdate = useCallback(() => {
		const currentState = stateManager.getState();
		const allItems = Object.values(currentState.trackItemsMap);
		const mediaItems = allItems.filter(
			(item) => item.type === "video" || item.type === "audio",
		) as (ITrackItem & (IVideo | IAudio))[];
		audioDataManager.setItems(mediaItems);
		audioDataManager.validateUpdateItems(mediaItems);
		setState({
			duration: currentState.duration,
			trackItemsMap: currentState.trackItemsMap,
		});
	}, [stateManager, setState]);

	const handleAddRemoveItems = useCallback(() => {
		const currentState = stateManager.getState();
		const mediaItems = Object.values(currentState.trackItemsMap).filter(
			(item) => item.type === "video" || item.type === "audio",
		) as (ITrackItem & (IVideo | IAudio))[];
		audioDataManager.validateUpdateItems(mediaItems);
		setState({
			trackItemsMap: currentState.trackItemsMap,
			trackItemIds: currentState.trackItemIds,
			tracks: currentState.tracks,
		});
	}, [stateManager, setState]);

	const handleUpdateItemDetails = useCallback(() => {
		const currentState = stateManager.getState();
		setState({ trackItemsMap: currentState.trackItemsMap });
	}, [stateManager, setState]);

	useEffect(() => {
		const resizeDesignSubscription = stateManager.subscribeToUpdateStateDetails(
			(newState) => setState(newState),
		);
		const scaleSubscription = stateManager.subscribeToScale((newState) =>
			setState(newState),
		);
		const tracksSubscription = stateManager.subscribeToState((newState) =>
			setState(newState),
		);
		const durationSubscription = stateManager.subscribeToDuration((newState) =>
			setState(newState),
		);
		const updateTrackItemsMap = stateManager.subscribeToUpdateTrackItem(
			handleTrackItemUpdate,
		);
		const itemsDetailsSubscription =
			stateManager.subscribeToAddOrRemoveItems(handleAddRemoveItems);
		const updateItemDetailsSubscription =
			stateManager.subscribeToUpdateItemDetails(handleUpdateItemDetails);

		// After undo/redo, push the full restored state into Zustand.
		// subscribeToHistory fires after stateSubject.next() completes inside
		// undo()/redo(), so getState() already holds the restored values.
		// This is a safety flush because `duration` is excluded from the diff
		// key set and individual subscriptions may miss it after history replay.
		const historySubscription = stateManager.subscribeToHistory(() => {
			const s = stateManager.getState();
			setState({
				tracks: s.tracks,
				trackItemIds: s.trackItemIds,
				trackItemsMap: s.trackItemsMap,
				transitionIds: s.transitionIds,
				transitionsMap: s.transitionsMap,
				duration: s.duration,
			});
		});

		return () => {
			resizeDesignSubscription.unsubscribe();
			scaleSubscription.unsubscribe();
			tracksSubscription.unsubscribe();
			durationSubscription.unsubscribe();
			updateTrackItemsMap.unsubscribe();
			itemsDetailsSubscription.unsubscribe();
			updateItemDetailsSubscription.unsubscribe();
			historySubscription.unsubscribe();
		};
	}, [
		stateManager,
		setState,
		handleTrackItemUpdate,
		handleAddRemoveItems,
		handleUpdateItemDetails,
	]);
};
