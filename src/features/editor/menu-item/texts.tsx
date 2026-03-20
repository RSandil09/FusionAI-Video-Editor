import { buttonVariants } from "@/components/ui/button";
import { ADD_TEXT } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import Draggable from "@/components/shared/draggable";
import { DEFAULT_FONT } from "../constants/font";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Text preset definitions ──────────────────────────────────────────────────
const TEXT_PRESETS = [
	{
		id: "heading",
		label: "Heading",
		preview: "Heading",
		previewStyle: { fontSize: 20, fontWeight: 800, color: "#ffffff" },
		payload: {
			type: "text",
			display: { from: 0, to: 5000 },
			details: {
				text: "Heading",
				fontSize: 140,
				fontFamily: DEFAULT_FONT.postScriptName,
				fontUrl: DEFAULT_FONT.url,
				fontWeight: "800",
				color: "#ffffff",
				width: 900,
				textAlign: "center",
				wordWrap: "break-word",
				borderWidth: 0,
				borderColor: "#000000",
				boxShadow: { color: "#ffffff", x: 0, y: 0, blur: 0 },
			},
		},
	},
	{
		id: "subtitle",
		label: "Subtitle",
		preview: "Subtitle",
		previewStyle: { fontSize: 15, fontWeight: 600, color: "#d1d5db" },
		payload: {
			type: "text",
			display: { from: 0, to: 5000 },
			details: {
				text: "Subtitle text here",
				fontSize: 80,
				fontFamily: DEFAULT_FONT.postScriptName,
				fontUrl: DEFAULT_FONT.url,
				fontWeight: "600",
				color: "#d1d5db",
				width: 900,
				textAlign: "center",
				wordWrap: "break-word",
				borderWidth: 0,
				borderColor: "#000000",
				boxShadow: { color: "#ffffff", x: 0, y: 0, blur: 0 },
			},
		},
	},
	{
		id: "body",
		label: "Body",
		preview: "Body text",
		previewStyle: { fontSize: 13, fontWeight: 400, color: "#9ca3af" },
		payload: {
			type: "text",
			display: { from: 0, to: 5000 },
			details: {
				text: "Body text goes here",
				fontSize: 54,
				fontFamily: DEFAULT_FONT.postScriptName,
				fontUrl: DEFAULT_FONT.url,
				fontWeight: "400",
				color: "#e5e7eb",
				width: 900,
				textAlign: "center",
				wordWrap: "break-word",
				borderWidth: 0,
				borderColor: "#000000",
				boxShadow: { color: "#ffffff", x: 0, y: 0, blur: 0 },
			},
		},
	},
	{
		id: "caption-bold",
		label: "Bold Caption",
		preview: "BOLD CAPTION",
		previewStyle: {
			fontSize: 13,
			fontWeight: 900,
			color: "#facc15",
			letterSpacing: "0.1em",
		},
		payload: {
			type: "text",
			display: { from: 0, to: 5000 },
			details: {
				text: "BOLD CAPTION",
				fontSize: 72,
				fontFamily: DEFAULT_FONT.postScriptName,
				fontUrl: DEFAULT_FONT.url,
				fontWeight: "900",
				color: "#facc15",
				width: 900,
				textAlign: "center",
				wordWrap: "break-word",
				borderWidth: 3,
				borderColor: "#000000",
				boxShadow: { color: "#000000", x: 2, y: 2, blur: 8 },
			},
		},
	},
	{
		id: "quote",
		label: "Quote",
		preview: '"Quote"',
		previewStyle: {
			fontSize: 13,
			fontWeight: 400,
			fontStyle: "italic",
			color: "#a78bfa",
		},
		payload: {
			type: "text",
			display: { from: 0, to: 5000 },
			details: {
				text: '"Your inspiring quote here"',
				fontSize: 64,
				fontFamily: DEFAULT_FONT.postScriptName,
				fontUrl: DEFAULT_FONT.url,
				fontWeight: "400",
				fontStyle: "italic",
				color: "#a78bfa",
				width: 900,
				textAlign: "center",
				wordWrap: "break-word",
				borderWidth: 0,
				borderColor: "#000000",
				boxShadow: { color: "#7c3aed", x: 0, y: 0, blur: 12 },
			},
		},
	},
	{
		id: "lower-third",
		label: "Lower Third",
		preview: "Name · Title",
		previewStyle: {
			fontSize: 12,
			fontWeight: 600,
			color: "#ffffff",
			background: "#2563eb",
			padding: "2px 8px",
			borderRadius: 4,
		},
		payload: {
			type: "text",
			display: { from: 0, to: 5000 },
			details: {
				text: "Full Name · Job Title",
				fontSize: 50,
				fontFamily: DEFAULT_FONT.postScriptName,
				fontUrl: DEFAULT_FONT.url,
				fontWeight: "600",
				color: "#ffffff",
				backgroundColor: "#2563eb",
				width: 700,
				textAlign: "left",
				wordWrap: "break-word",
				borderWidth: 0,
				borderColor: "#000000",
				boxShadow: { color: "#000000", x: 0, y: 4, blur: 16 },
			},
		},
	},
];

export const Texts = () => {
	const isDraggingOverTimeline = useIsDraggingOverTimeline();

	const handleAdd = (preset: (typeof TEXT_PRESETS)[number]) => {
		dispatch(ADD_TEXT, {
			payload: { ...preset.payload, id: nanoid() },
			options: {},
		});
	};

	return (
		<div className="flex flex-1 flex-col h-full overflow-hidden">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
				Text
			</div>

			<ScrollArea className="flex-1">
				<div className="flex flex-col gap-2 px-4 pb-6">
					<p className="text-xs text-muted-foreground mb-1">
						Click or drag a preset to add it to the timeline.
					</p>

					{TEXT_PRESETS.map((preset) => (
						<Draggable
							key={preset.id}
							data={preset.payload}
							renderCustomPreview={
								<div
									className="w-60 h-12 rounded-md border border-border/60 bg-muted/60 flex items-center justify-center overflow-hidden"
									style={preset.previewStyle as React.CSSProperties}
								>
									{preset.preview}
								</div>
							}
							shouldDisplayPreview={!isDraggingOverTimeline}
						>
							<div
								onClick={() => handleAdd(preset)}
								className={cn(
									"w-full h-14 rounded-lg border border-border/60 bg-card hover:border-primary/50 hover:bg-accent/50 cursor-pointer transition-all duration-150 flex items-center justify-between px-4 group",
								)}
							>
								<span
									className="overflow-hidden text-ellipsis whitespace-nowrap"
									style={preset.previewStyle as React.CSSProperties}
								>
									{preset.preview}
								</span>
								<span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-none ml-2">
									{preset.label}
								</span>
							</div>
						</Draggable>
					))}
				</div>
			</ScrollArea>
		</div>
	);
};
