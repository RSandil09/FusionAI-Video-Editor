"use client";
import Timeline from "./timeline";
import useStore from "./store/use-store";
import Navbar from "./navbar";
import useTimelineEvents from "./hooks/use-timeline-events";
import Scene from "./scene";
import { SceneRef } from "./scene/scene.types";
import StateManager, { DESIGN_LOAD } from "@designcombo/state";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ImperativePanelHandle } from "react-resizable-panels";
import { getCompactFontData, loadFonts } from "./utils/fonts";
import { SECONDARY_FONT, SECONDARY_FONT_URL } from "./constants/constants";
import MenuList from "./menu-list";
import { MenuItem } from "./menu-item";
import { ControlItem } from "./control-item";
import CropModal from "./crop-modal/crop-modal";
import useDataState from "./store/use-data-state";
import { FONTS } from "./data/fonts";
import FloatingControl from "./control-item/floating-controls/floating-control";
import { useSceneStore } from "@/store/use-scene-store";
import { dispatch } from "@designcombo/events";
import MenuListHorizontal from "./menu-list-horizontal";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { ITrackItem } from "@designcombo/types";
import useLayoutStore from "./store/use-layout-store";
import ControlItemHorizontal from "./control-item-horizontal";
import {
	createEmptyEditorState,
	validateEditorState,
} from "./utils/empty-state";
import { useStateManagerEvents } from "./hooks/use-state-manager-events";
import { getIdToken } from "@/lib/auth/client";

const stateManager = new StateManager({
	size: {
		width: 1080,
		height: 1920,
	},
});
// Make the singleton available to any component via the Zustand store.
// Called at module-init time (outside React) so it's ready before first render.
useStore.getState().setStateManager(stateManager);

interface EditorProps {
	initialState?: any;
	projectId?: string;
	projectName?: string;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const Editor = ({
	initialState,
	projectId,
	projectName: initialProjectName,
}: EditorProps) => {
	const [projectName, setProjectName] = useState<string>(
		initialProjectName || "Untitled video",
	);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
	const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { scene } = useSceneStore();
	const timelinePanelRef = useRef<ImperativePanelHandle>(null);
	const sceneRef = useRef<SceneRef>(null);
	const { timeline, playerRef } = useStore();
	const { activeIds, trackItemsMap, transitionsMap } = useStore();
	const [loaded, setLoaded] = useState(false);
	const [trackItem, setTrackItem] = useState<ITrackItem | null>(null);
	const {
		setTrackItem: setLayoutTrackItem,
		setFloatingControl,
		setLabelControlItem,
		setTypeControlItem,
	} = useLayoutStore();
	const isLargeScreen = useIsLargeScreen();

	useTimelineEvents();
	useStateManagerEvents(stateManager);

	const { setCompactFonts, setFonts } = useDataState();

	// Load editor state from initialState prop or create empty state
	useEffect(() => {
		try {
			let editorState;

			if (initialState && typeof initialState === "object") {
				// Merge saved DB state with defaults.
				// stateManager.toJSON() may not include `id`, `fps`, or `tracks`
				// (they are structural fields added by createEmptyEditorState, not
				//  persisted by the designcombo StateManager). Merging ensures
				//  validateEditorState passes while still restoring all track data.
				const defaults = createEmptyEditorState();
				const saved = initialState as any;
				const merged = {
					...defaults,
					...saved,
					size: saved.size || defaults.size,
					trackItemIds: saved.trackItemIds || [],
					trackItemsMap: saved.trackItemsMap || {},
					transitionsMap: saved.transitionsMap || {},
					tracks: saved.tracks || defaults.tracks,
					fps: saved.fps || defaults.fps,
					id: saved.id || defaults.id,
				};

				// Recompute trackItemIds from the live tracks array so any project
				// saved with stale z-order (before the drag fix) is corrected on load.
				// tracks[0] = top track = renders last = highest z-index → reverse then flatten.
				// Only recompute when tracks actually have items so empty projects are unaffected.
				const recomputedIds = [...(merged.tracks as any[])]
					.reverse()
					.flatMap((t: any) => (t.items ?? t.trackItemIds ?? []) as string[]);
				if (recomputedIds.length > 0) {
					merged.trackItemIds = recomputedIds;
				}

				// ── URL normalization ──────────────────────────────────────────────
				// Walk every track item and ensure media src values are stored as raw
				// URLs (not wrapped in old/broken proxy paths). The player items
				// (image.tsx, video.tsx) apply the correct proxy wrapper at render time.
				// This fixes projects saved before the ensureProxiedUrl bug was fixed —
				// they may have stored bare https://pub-xxx.r2.dev URLs that bypassed
				// the proxy, or stale proxy-wrapped URLs that no longer match the route.
				const normalizedMap: Record<string, any> = {};
				for (const [id, item] of Object.entries(merged.trackItemsMap as Record<string, any>)) {
					const src: string | undefined = item?.details?.src;
					if (!src) {
						normalizedMap[id] = item;
						continue;
					}
					let normalizedSrc = src;
					// Strip broken image-proxy wrappers that used the old authenticated
					// Node route — the URL inside is the canonical R2 URL.
					const imageProxyMatch = src.match(/\/api\/image-proxy\?url=(.+)/);
					if (imageProxyMatch) {
						try {
							normalizedSrc = decodeURIComponent(imageProxyMatch[1]);
						} catch {
							normalizedSrc = src;
						}
					}
					// Strip video-proxy wrappers the same way.
					const videoProxyMatch = src.match(/\/api\/video-proxy\?url=(.+)/);
					if (videoProxyMatch) {
						try {
							normalizedSrc = decodeURIComponent(videoProxyMatch[1]);
						} catch {
							normalizedSrc = src;
						}
					}
					normalizedMap[id] = normalizedSrc === src
						? item
						: { ...item, details: { ...item.details, src: normalizedSrc } };
				}
				merged.trackItemsMap = normalizedMap;
				// ── end URL normalization ──────────────────────────────────────────

				if (validateEditorState(merged)) {
					editorState = merged;
				} else {
					console.warn(
						"⚠️ Validation failed even after merge — using empty state",
					);
					editorState = createEmptyEditorState();
				}
			} else {
				editorState = createEmptyEditorState();
			}

			dispatch(DESIGN_LOAD, { payload: editorState });

			if (stateManager) {
				stateManager.updateState(editorState as any);
			}

			// Restore Zustand-only state persisted alongside the editor state.
			// Filter out orphaned track IDs (tracks that no longer exist in the state).
			const {
				setMarkers,
				setLockedTrackIds,
				setMutedTrackIds,
				setSoloTrackIds,
			} = useStore.getState();
			const s = editorState as any;
			const existingTrackIds = new Set<string>(
				(s.tracks ?? []).map((t: any) => t.id as string),
			);
			const filterTrackIds = (ids: string[]) =>
				ids.filter((id) => existingTrackIds.has(id));
			if (Array.isArray(s.markers)) setMarkers(s.markers);
			if (Array.isArray(s.lockedTrackIds))
				setLockedTrackIds(filterTrackIds(s.lockedTrackIds));
			if (Array.isArray(s.mutedTrackIds))
				setMutedTrackIds(filterTrackIds(s.mutedTrackIds));
			if (Array.isArray(s.soloTrackIds))
				setSoloTrackIds(filterTrackIds(s.soloTrackIds));

			// ── Parallel media prefetch ────────────────────────────────────────────
			// Fire HEAD requests for every media item in the background immediately
			// after DESIGN_LOAD. This warms the browser's connection to R2/CDN and
			// populates DNS + TCP state before the Remotion player requests the actual
			// bytes, shaving the perceived first-frame latency on large projects.
			// Errors are intentionally swallowed — prefetch failures are non-fatal.
			const items = Object.values((s.trackItemsMap ?? {}) as Record<string, any>);
			const mediaSrcs = items
				.map((item: any) => item?.details?.src as string | undefined)
				.filter((src): src is string => typeof src === "string" && src.startsWith("http"));

			// Deduplicate and cap at 10 concurrent prefetches to avoid hammering R2
			// on large projects while still warming the most-needed connections.
			const uniqueSrcs = [...new Set(mediaSrcs)].slice(0, 10);
			if (uniqueSrcs.length > 0) {
				Promise.allSettled(
					uniqueSrcs.map((src) =>
						fetch(src, { method: "HEAD", cache: "force-cache" }).catch(() => null),
					),
				);
			}
			// ── end parallel media prefetch ────────────────────────────────────────
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			console.error("❌ Failed to load editor state:", msg);
			try {
				const emptyState = createEmptyEditorState();
				dispatch(DESIGN_LOAD, { payload: emptyState });
				stateManager.updateState(emptyState as any);
			} catch (fallbackError) {
				console.error("❌ Fallback also failed:", fallbackError);
			}
		}
	}, [initialState]);

	useEffect(() => {
		setCompactFonts(getCompactFontData(FONTS));
		setFonts(FONTS);
	}, []);

	useEffect(() => {
		loadFonts([
			{
				name: SECONDARY_FONT,
				url: SECONDARY_FONT_URL,
			},
		]);
	}, []);

	// ── Auto-save: fires 3 s after the last change (tracks OR markers/locks) ─────
	useEffect(() => {
		if (!projectId) return;

		// Shared debounced save — reads latest state at call time
		const scheduleSave = () => {
			if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
			autoSaveTimerRef.current = setTimeout(async () => {
				try {
					const editorState = stateManager.toJSON();
					if (!editorState) return;

					const token = await getIdToken();
					if (!token) {
						console.warn(
							"Auto-save skipped: no auth token (session may have expired)",
						);
						setSaveStatus("error");
						return;
					}

					// Merge Zustand-only fields that stateManager.toJSON() doesn't include
					const { markers, lockedTrackIds, mutedTrackIds, soloTrackIds } =
						useStore.getState();
					const fullState = {
						...editorState,
						markers,
						lockedTrackIds,
						mutedTrackIds,
						soloTrackIds,
					};

					setSaveStatus("saving");
					const res = await fetch(`/api/projects/${projectId}`, {
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({ editor_state: fullState }),
					});

					if (res.ok) {
						setSaveStatus("saved");
					} else {
						console.warn("Auto-save failed:", res.status);
						setSaveStatus("error");
					}
				} catch (e) {
					console.warn("Auto-save error:", e);
					setSaveStatus("error");
					setTimeout(() => setSaveStatus("idle"), 3000);
				}
			}, 3000);
		};

		// 1. Save when StateManager tracks/items change
		const stateSubscription = stateManager.subscribeToState(scheduleSave);

		// 2. Save when any Zustand-only state changes (markers, locks, mute, solo)
		const zustandUnsub = useStore.subscribe((next, prev) => {
			if (
				next.markers !== prev.markers ||
				next.lockedTrackIds !== prev.lockedTrackIds ||
				next.mutedTrackIds !== prev.mutedTrackIds ||
				next.soloTrackIds !== prev.soloTrackIds
			) {
				scheduleSave();
			}
		});

		return () => {
			stateSubscription.unsubscribe();
			zustandUnsub();
			if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
		};
	}, [projectId]);

	useEffect(() => {
		const screenHeight = window.innerHeight;
		const desiredHeight = 300;
		const percentage = (desiredHeight / screenHeight) * 100;
		timelinePanelRef.current?.resize(percentage);
	}, []);

	const handleTimelineResize = () => {
		const timelineContainer = document.getElementById("timeline-container");
		if (!timelineContainer) return;

		timeline?.resize(
			{
				height: timelineContainer.clientHeight - 90,
				width: timelineContainer.clientWidth - 40,
			},
			{
				force: true,
			},
		);

		// Trigger zoom recalculation when timeline is resized
		setTimeout(() => {
			sceneRef.current?.recalculateZoom();
		}, 100);
	};

	useEffect(() => {
		const onResize = () => handleTimelineResize();
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, [timeline]);

	useEffect(() => {
		if (activeIds.length === 1) {
			const [id] = activeIds;
			const trackItem = trackItemsMap[id];
			if (trackItem) {
				setTrackItem(trackItem);
				setLayoutTrackItem(trackItem);
			} else {
			}
		} else {
			setTrackItem(null);
			setLayoutTrackItem(null);
		}
	}, [activeIds, trackItemsMap]);

	useEffect(() => {
		setFloatingControl("");
		setLabelControlItem("");
		setTypeControlItem("");
	}, [isLargeScreen]);

	useEffect(() => {
		setLoaded(true);
	}, []);

	return (
		<div className="flex h-screen w-screen flex-col bg-background">
			{!projectId && (
				<div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-bold animate-pulse rounded-b-xl">
					⚠️ Developer Mode: No Project ID provided. Saving will not work. Please
					open a project from the Dashboard.
				</div>
			)}
			<Navbar
				projectName={projectName}
				user={null}
				stateManager={stateManager}
				setProjectName={setProjectName}
				projectId={projectId}
				saveStatus={saveStatus}
			/>
			<div className="flex flex-1 overflow-hidden">
				{isLargeScreen && (
					<div className="bg-muted/50 flex flex-none border-r border-border/80 h-[calc(100vh-44px)] backdrop-blur-sm">
						<MenuList />
						<MenuItem projectId={projectId} />
					</div>
				)}
				<ResizablePanelGroup style={{ flex: 1 }} direction="vertical">
					<ResizablePanel className="relative" defaultSize={70}>
						<FloatingControl />
						<div className="flex h-full flex-1">
							{/* Sidebar only on large screens - conditionally mounted */}

							<div
								style={{
									width: "100%",
									height: "100%",
									position: "relative",
									flex: 1,
									overflow: "hidden",
								}}
							>
								<CropModal />
								<Scene ref={sceneRef} stateManager={stateManager} />
							</div>
						</div>
					</ResizablePanel>
					<ResizableHandle />
					<ResizablePanel
						className="min-h-[50px]"
						ref={timelinePanelRef}
						defaultSize={30}
						onResize={handleTimelineResize}
					>
						{playerRef && <Timeline stateManager={stateManager} />}
					</ResizablePanel>
					{!isLargeScreen && !trackItem && loaded && <MenuListHorizontal />}
					{!isLargeScreen && trackItem && <ControlItemHorizontal />}
				</ResizablePanelGroup>
				<ControlItem />
			</div>
		</div>
	);
};

export default Editor;
