import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface AspectRatioProps {
	value?: boolean;
	onChange?: (locked: boolean) => void;
}

export default function AspectRatio({ value = true, onChange }: AspectRatioProps) {
	const toggleValue = value ? "locked" : "unlocked";

	const handleChange = (v: string) => {
		if (!v) return; // ToggleGroup fires empty string on deselect — ignore
		onChange?.(v === "locked");
	};

	return (
		<div className="flex gap-2">
			<div className="flex flex-1 items-center text-sm text-muted-foreground">
				Lock Ratio
			</div>
			<div className="w-32">
				<ToggleGroup
					value={toggleValue}
					size="sm"
					className="grid h-8 grid-cols-2 text-sm"
					type="single"
					onValueChange={handleChange}
					variant={"default"}
				>
					<ToggleGroupItem value="locked" aria-label="Lock aspect ratio">
						Yes
					</ToggleGroupItem>
					<ToggleGroupItem size="sm" value="unlocked" aria-label="Unlock aspect ratio">
						No
					</ToggleGroupItem>
				</ToggleGroup>
			</div>
		</div>
	);
}
