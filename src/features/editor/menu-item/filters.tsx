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

// A neutral reference swatch — mid-tone gradient the filter will visually affect
const SWATCH_STYLE: React.CSSProperties = {
	width: "100%",
	aspectRatio: "4 / 3",
	borderRadius: "6px",
	background:
		"linear-gradient(135deg, #8a9bb0 0%, #b0a090 50%, #9aaa8a 100%)",
};

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
				"flex flex-col gap-1 cursor-pointer rounded-lg p-1.5 border-2 transition-all duration-150",
				isActive
					? "border-primary bg-primary/10"
					: "border-transparent hover:border-border/60 hover:bg-muted/40",
			)}
		>
			<div style={{ ...SWATCH_STYLE, filter: filterCss }} />
			<span
				className={cn(
					"text-[11px] text-center truncate leading-snug",
					isActive ? "text-primary font-medium" : "text-muted-foreground",
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
