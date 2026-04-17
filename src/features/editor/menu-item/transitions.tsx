import React from "react";
import Draggable from "@/components/shared/draggable";
import { TRANSITIONS, TRANSITION_CATEGORIES, TransitionDef } from "../data/transitions";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import { applyTransition } from "../hooks/use-engine-sync";
import useStore from "../store/use-store";

export const Transitions = () => {
	const isDraggingOverTimeline = useIsDraggingOverTimeline();

	const handleSelect = (transition: TransitionDef) => {
		const { stateManager, tracks, trackItemsMap, activeIds } =
			useStore.getState();
		if (!stateManager) return;

		// Collect every adjacent clip pair across all tracks.
		// Two clips are adjacent when the gap between display.to of the first and
		// display.from of the second is under 500 ms (handles rounding slop).
		const pairs: { fromId: string; toId: string }[] = [];
		for (const track of tracks) {
			const itemIds: string[] =
				(track as any).items ?? (track as any).trackItemIds ?? [];
			const items = itemIds
				.map((id) => trackItemsMap[id])
				.filter(Boolean)
				.sort(
					(a, b) => (a.display?.from ?? 0) - (b.display?.from ?? 0),
				);

			for (let i = 0; i < items.length - 1; i++) {
				const a = items[i];
				const b = items[i + 1];
				const gap = Math.abs(
					(b.display?.from ?? 0) - (a.display?.to ?? 0),
				);
				if (gap < 500) {
					pairs.push({ fromId: a.id, toId: b.id });
				}
			}
		}

		if (pairs.length === 0) return;

		// If clips are selected, only target boundaries that touch a selected clip.
		// Otherwise apply the transition to every adjacent boundary.
		const targets =
			activeIds.length > 0
				? pairs.filter(
						(p) =>
							activeIds.includes(p.fromId) ||
							activeIds.includes(p.toId),
					)
				: pairs;

		const toApply = targets.length > 0 ? targets : pairs;

		for (const { fromId, toId } of toApply) {
			applyTransition(stateManager, fromId, toId, transition);
		}
	};

	return (
		<div className="flex flex-1 flex-col min-h-0 overflow-hidden">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
				Transitions
			</div>
			<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
				<div className="px-4 pb-4 space-y-4">
					{TRANSITION_CATEGORIES.map((cat) => {
						const items = TRANSITIONS.filter(
							(t) => t.category === cat.id && t.kind !== "none",
						);
						if (items.length === 0) return null;
						return (
							<div key={cat.id}>
								<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-2">
									{cat.label}
								</p>
								<div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(72px,1fr))]">
									{items.map((transition) => (
										<TransitionsMenuItem
											key={transition.id}
											transition={transition}
											shouldDisplayPreview={!isDraggingOverTimeline}
											onSelect={handleSelect}
										/>
									))}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

const TransitionsMenuItem = ({
	transition,
	shouldDisplayPreview,
	onSelect,
}: {
	transition: TransitionDef;
	shouldDisplayPreview: boolean;
	onSelect: (t: TransitionDef) => void;
}) => {
	const previewStyle = React.useMemo<React.CSSProperties>(() => {
		if (transition.preview) {
			return {
				backgroundImage: `url(${transition.preview})`,
				backgroundSize: "cover",
				width: "70px",
				height: "70px",
			};
		}
		return {
			background: transition.previewColor ?? "hsl(var(--muted))",
			width: "70px",
			height: "70px",
		};
	}, [transition.preview, transition.previewColor]);

	return (
		<Draggable
			data={transition}
			renderCustomPreview={<div style={previewStyle} />}
			shouldDisplayPreview={shouldDisplayPreview}
		>
			<div
				role="button"
				tabIndex={0}
				onClick={() => onSelect(transition)}
				onKeyDown={(e) => e.key === "Enter" && onSelect(transition)}
				className="cursor-pointer"
			>
				<div>
					<div style={previewStyle} draggable={false} className="rounded-md" />
				</div>
				<div className="flex h-6 items-center text-ellipsis text-nowrap text-[11px] capitalize text-muted-foreground">
					{transition.name}
				</div>
			</div>
		</Draggable>
	);
};

export default TransitionsMenuItem;
