import React, { useEffect, useRef } from "react";
import { TRANSITIONS, TRANSITION_CATEGORIES, TransitionDef } from "../data/transitions";
import useStore from "../store/use-store";

interface TransitionPickerProps {
	fromId: string;
	toId: string;
	/** Viewport coordinates where the transition zone was clicked */
	anchorX: number;
	anchorY: number;
	onSelect: (transition: TransitionDef) => void;
	onClose: () => void;
}

/** Returns the kind of the current transition between fromId and toId, or null. */
function useCurrentKind(fromId: string, toId: string): string | null {
	const { transitionsMap } = useStore();
	const entry = Object.values(transitionsMap).find(
		(t: any) => t.fromId === fromId && t.toId === toId,
	) as any;
	return entry?.kind ?? null;
}

export const TransitionPicker: React.FC<TransitionPickerProps> = ({
	fromId,
	toId,
	anchorX,
	anchorY,
	onSelect,
	onClose,
}) => {
	const currentKind = useCurrentKind(fromId, toId);
	const panelRef = useRef<HTMLDivElement>(null);

	// Close on outside click
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
				onClose();
			}
		};
		// Small delay so the click that opened the picker doesn't immediately close it
		const t = setTimeout(() => document.addEventListener("mousedown", handler), 50);
		return () => {
			clearTimeout(t);
			document.removeEventListener("mousedown", handler);
		};
	}, [onClose]);

	// Close on Escape
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [onClose]);

	// Position the panel so it doesn't overflow the viewport
	const PANEL_W = 320;
	const PANEL_H = 400;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const left = Math.min(anchorX - PANEL_W / 2, vw - PANEL_W - 8);
	const top = anchorY + 16 + PANEL_H > vh ? anchorY - PANEL_H - 8 : anchorY + 16;

	return (
		<div
			ref={panelRef}
			style={{ left, top, width: PANEL_W }}
			className="fixed z-[9999] flex flex-col rounded-xl border border-border/60 bg-background shadow-2xl overflow-hidden"
		>
			{/* Header */}
			<div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
				<span className="text-xs font-semibold tracking-tight text-foreground">
					Transition
				</span>
				{currentKind && currentKind !== "none" && (
					<button
						onClick={() => {
							const none = TRANSITIONS.find((t) => t.kind === "none")!;
							onSelect(none);
						}}
						className="text-[10px] text-destructive hover:text-destructive/80 transition-colors px-2 py-0.5 rounded-md hover:bg-destructive/10"
					>
						Remove
					</button>
				)}
			</div>

			{/* Scrollable body */}
			<div className="flex-1 overflow-y-auto max-h-[360px] p-2 space-y-3">
				{TRANSITION_CATEGORIES.map((cat) => {
					const items = TRANSITIONS.filter(
						(t) => t.category === cat.id && t.kind !== "none",
					);
					if (items.length === 0) return null;
					return (
						<div key={cat.id}>
							<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest px-1 mb-1.5">
								{cat.label}
							</p>
							<div className="grid grid-cols-4 gap-1.5">
								{items.map((t) => (
									<TransitionCard
										key={t.id}
										transition={t}
										isActive={currentKind === t.kind}
										onSelect={onSelect}
									/>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

const TransitionCard: React.FC<{
	transition: TransitionDef;
	isActive: boolean;
	onSelect: (t: TransitionDef) => void;
}> = ({ transition, isActive, onSelect }) => {
	const previewStyle: React.CSSProperties = transition.preview
		? { backgroundImage: `url(${transition.preview})`, backgroundSize: "cover" }
		: { background: transition.previewColor ?? "hsl(var(--muted))" };

	return (
		<button
			onClick={() => onSelect(transition)}
			className={`flex flex-col items-center gap-1 rounded-lg p-1 transition-all hover:bg-muted/60 ${
				isActive ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
			}`}
		>
			<div
				className="w-full aspect-square rounded-md overflow-hidden"
				style={previewStyle}
			/>
			<span className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-1 w-full">
				{transition.name}
			</span>
		</button>
	);
};

export default TransitionPicker;
