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

interface CurrentTransition {
	kind: string;
	direction?: string;
}

/** Returns the kind + direction of the current transition between fromId → toId. */
function useCurrentTransition(fromId: string, toId: string): CurrentTransition | null {
	const { transitionsMap } = useStore();
	const entry = Object.values(transitionsMap).find(
		(t: any) => t.fromId === fromId && t.toId === toId,
	) as any;
	if (!entry?.kind || entry.kind === "none") return null;
	return { kind: entry.kind, direction: entry.direction ?? undefined };
}

/** True when this TransitionDef matches the currently applied transition. */
function isTransitionActive(t: TransitionDef, current: CurrentTransition | null): boolean {
	if (!current) return false;
	if (t.kind !== current.kind) return false;
	// For directional variants both must match; for non-directional just kind is enough.
	if (t.direction || current.direction) {
		return (t.direction ?? "") === (current.direction ?? "");
	}
	return true;
}

export const TransitionPicker: React.FC<TransitionPickerProps> = ({
	fromId,
	toId,
	anchorX,
	anchorY,
	onSelect,
	onClose,
}) => {
	const current = useCurrentTransition(fromId, toId);
	const panelRef = useRef<HTMLDivElement>(null);
	const bodyRef = useRef<HTMLDivElement>(null);

	// Close on outside click
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
				onClose();
			}
		};
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

	// Scroll the active card into view when the picker first opens
	useEffect(() => {
		if (!bodyRef.current || !current) return;
		const activeEl = bodyRef.current.querySelector("[data-active='true']") as HTMLElement | null;
		if (activeEl) {
			activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
		}
	}, []);  // only on mount

	// Position the panel so it doesn't overflow the viewport
	const PANEL_W = 320;
	const PANEL_H = 420;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const left = Math.min(Math.max(8, anchorX - PANEL_W / 2), vw - PANEL_W - 8);
	const top = anchorY + 16 + PANEL_H > vh ? anchorY - PANEL_H - 8 : anchorY + 16;

	// Find the currently active TransitionDef for the header label
	const activeDef = current
		? TRANSITIONS.find((t) => isTransitionActive(t, current))
		: null;

	return (
		<div
			ref={panelRef}
			style={{ left, top, width: PANEL_W }}
			className="fixed z-[9999] flex flex-col rounded-xl border border-border/60 bg-background shadow-2xl overflow-hidden"
		>
			{/* Header */}
			<div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold tracking-tight text-foreground">
						Transition
					</span>
					{activeDef && (
						<span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary/15 text-primary">
							{activeDef.name}
						</span>
					)}
				</div>
				{current && (
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
			<div ref={bodyRef} className="flex-1 overflow-y-auto max-h-[380px] p-2 space-y-3">
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
								{items.map((t) => {
									const active = isTransitionActive(t, current);
									return (
										<TransitionCard
											key={t.id}
											transition={t}
											isActive={active}
											onSelect={onSelect}
										/>
									);
								})}
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
			data-active={isActive ? "true" : undefined}
			onClick={() => onSelect(transition)}
			className={`relative flex flex-col items-center gap-1 rounded-lg p-1 transition-all ${
				isActive
					? "bg-primary/20 ring-2 ring-primary ring-offset-1 ring-offset-background"
					: "hover:bg-muted/60"
			}`}
		>
			{/* Preview thumbnail */}
			<div
				className="w-full aspect-square rounded-md overflow-hidden"
				style={previewStyle}
			/>

			{/* Checkmark badge — only when active */}
			{isActive && (
				<span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-primary shadow-sm">
					<svg
						width="8"
						height="8"
						viewBox="0 0 8 8"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M1.5 4L3 5.5L6.5 2"
							stroke="white"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</span>
			)}

			{/* Name label */}
			<span
				className={`text-[10px] text-center leading-tight line-clamp-1 w-full ${
					isActive ? "text-primary font-semibold" : "text-muted-foreground"
				}`}
			>
				{transition.name}
			</span>
		</button>
	);
};

export default TransitionPicker;
