import React from "react";
import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TRANSITIONS, TRANSITION_CATEGORIES, TransitionDef } from "../data/transitions";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";

export const Transitions = () => {
	const isDraggingOverTimeline = useIsDraggingOverTimeline();

	return (
		<div className="flex flex-1 flex-col">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
				Transitions
			</div>
			<ScrollArea className="flex-1 h-[calc(100%-48px)]">
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
										/>
									))}
								</div>
							</div>
						);
					})}
				</div>
			</ScrollArea>
		</div>
	);
};

const TransitionsMenuItem = ({
	transition,
	shouldDisplayPreview,
}: {
	transition: TransitionDef;
	shouldDisplayPreview: boolean;
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
			<div>
				<div>
					<div style={previewStyle} draggable={false} className="rounded-md" />
				</div>
				<div className="flex h-6 items-center overflow-ellipsis text-nowrap text-[11px] capitalize text-muted-foreground">
					{transition.name}
				</div>
			</div>
		</Draggable>
	);
};

export default TransitionsMenuItem;
