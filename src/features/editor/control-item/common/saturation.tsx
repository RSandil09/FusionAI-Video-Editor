import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";

const Saturation = ({
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
				Saturation
			</div>
			<div
				className="w-32"
				style={{ display: "grid", gridTemplateColumns: "1fr 80px" }}
			>
				<Input
					className="h-8 w-11 px-2 text-center text-sm"
					type="number"
					min={0}
					max={200}
					onChange={(e) => {
						const v = Number(e.target.value);
						if (v >= 0 && v <= 200) {
							setLocalValue(v);
							onChange(v);
						}
					}}
					value={localValue}
				/>
				<Slider
					id="saturation"
					value={[localValue]}
					onValueChange={(e) => setLocalValue(e[0])}
					onValueCommit={() => onChange(localValue)}
					min={0}
					max={200}
					step={1}
					aria-label="Saturation"
				/>
			</div>
		</div>
	);
};

export default Saturation;
