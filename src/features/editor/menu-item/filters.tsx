import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT } from "@designcombo/state";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	FILTER_PRESETS,
	FILTER_CATEGORIES,
	FILTER_DEFAULTS,
	buildFilterCss,
	type FilterPreset,
} from "../data/filters";
import useStore from "../store/use-store";
import { cn } from "@/lib/utils";

const PREVIEW_SRC = "/images/images.jpg";

const FilterCard = ({
	preset,
	isActive,
	onSelect,
}: {
	preset: FilterPreset;
	isActive: boolean;
	onSelect: (p: FilterPreset) => void;
}) => {
	const filterCss = buildFilterCss(preset.values);

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={() => onSelect(preset)}
			onKeyDown={(e) => e.key === "Enter" && onSelect(preset)}
			className={cn(
				"flex flex-col gap-1.5 cursor-pointer rounded-lg p-1 transition-all duration-150 select-none group",
				isActive
					? "ring-2 ring-primary ring-offset-1 ring-offset-background"
					: "ring-1 ring-transparent hover:ring-border/50",
			)}
		>
			{/* Thumbnail */}
			<div className="relative overflow-hidden rounded-[5px] aspect-square bg-muted/30">
				<img
					src={PREVIEW_SRC}
					alt={preset.name}
					draggable={false}
					className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
					style={{ filter: filterCss, display: "block" }}
				/>
				{/* Active checkmark badge */}
				{isActive && (
					<div className="absolute bottom-1 right-1 bg-primary rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
						<svg
							className="w-2.5 h-2.5 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={3}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</div>
				)}
			</div>

			{/* Label */}
			<span
				className={cn(
					"text-[10px] text-center truncate leading-none pb-0.5 px-0.5",
					isActive ? "text-primary font-semibold" : "text-muted-foreground",
				)}
			>
				{preset.name}
			</span>
		</div>
	);
};

export const Filters = () => {
	const { activeIds, trackItemsMap } = useStore();

	const activeItem = activeIds[0] ? (trackItemsMap[activeIds[0]] as any) : null;
	const details = activeItem?.details ?? {};

	// Determine which preset is currently active (all values must match)
	const activePresetId = (() => {
		for (const preset of FILTER_PRESETS) {
			const merged = { ...FILTER_DEFAULTS, ...preset.values };
			const match = (Object.keys(merged) as (keyof typeof merged)[]).every(
				(key) => {
					const current = details[key] ?? FILTER_DEFAULTS[key];
					return current === merged[key];
				},
			);
			if (match) return preset.id;
		}
		return null;
	})();

	const applyPreset = (preset: FilterPreset) => {
		if (!activeIds.length) return;

		// Build the payload: set each property to the preset value,
		// and reset any property not in the preset back to its neutral default.
		const payload: Record<string, number> = {};
		(Object.keys(FILTER_DEFAULTS) as (keyof typeof FILTER_DEFAULTS)[]).forEach(
			(key) => {
				payload[key] =
					preset.values[key] !== undefined
						? (preset.values[key] as number)
						: FILTER_DEFAULTS[key];
			},
		);

		dispatch(EDIT_OBJECT, {
			payload: {
				[activeIds[0]]: { details: payload },
			},
		});
	};

	const hasSelection = activeIds.length > 0;

	return (
		<div className="flex flex-1 flex-col min-h-0 overflow-hidden">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
				Filters
			</div>

			{!hasSelection && (
				<div className="flex flex-1 items-center justify-center px-6 text-center">
					<p className="text-xs text-muted-foreground leading-relaxed">
						Select a video or image on the timeline to apply a filter.
					</p>
				</div>
			)}

			{hasSelection && (
				<ScrollArea className="flex-1">
					<div className="px-4 pb-4 space-y-4">
						{FILTER_CATEGORIES.map((cat) => {
							const items = FILTER_PRESETS.filter(
								(p) => p.category === cat.id,
							);
							if (items.length === 0) return null;
							return (
								<div key={cat.id}>
									<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-2">
										{cat.label}
									</p>
									<div className="grid grid-cols-3 gap-1.5">
										{items.map((preset) => (
											<FilterCard
												key={preset.id}
												preset={preset}
												isActive={activePresetId === preset.id}
												onSelect={applyPreset}
											/>
										))}
									</div>
								</div>
							);
						})}
					</div>
				</ScrollArea>
			)}
		</div>
	);
};
