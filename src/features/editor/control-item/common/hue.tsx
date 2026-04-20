import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";

const Hue = ({
	value,
	onChange,
}: {
	value: number;
	onChange: (v: number) => void;
}) => {
	const [localValue, setLocalValue] = useState(value);

	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	return (
		<div className="flex gap-2">
			<div className="flex flex-1 items-center text-sm text-muted-foreground">
				Hue
			</div>
			<div
				className="w-32"
				style={{ display: "grid", gridTemplateColumns: "1fr 80px" }}
			>
				<Input
					className="h-8 w-11 px-2 text-center text-sm"
					type="number"
					min={0}
					max={360}
					onChange={(e) => {
						const v = Number(e.target.value);
						if (v >= 0 && v <= 360) {
							setLocalValue(v);
							onChange(v);
						}
					}}
					value={localValue}
				/>
				<Slider
					id="hue"
					value={[localValue]}
					onValueChange={(e) => setLocalValue(e[0])}
					onValueCommit={() => onChange(localValue)}
					min={0}
					max={360}
					step={1}
					aria-label="Hue"
				/>
			</div>
		</div>
	);
};

export default Hue;
