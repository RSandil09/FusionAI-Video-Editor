import { IImage, IText, ITrackItem } from "@designcombo/types";

export const calculateCropStyles = (
	details: IImage["details"],
	crop: IImage["details"]["crop"],
) => ({
	width: details.width || "100%",
	height: details.height || "auto",
	top: -crop.y || 0,
	left: -crop.x || 0,
	position: "absolute",
	borderRadius: `${Math.min(crop.width, crop.height) * ((details.borderRadius || 0) / 100)}px`,
});

export const calculateMediaStyles = (
	details: ITrackItem["details"],
	crop: ITrackItem["details"]["crop"],
) => {
	return {
		pointerEvents: "none",
		boxShadow: [
			`0 0 0 ${details.borderWidth}px ${details.borderColor}`,
			details.boxShadow
				? `${details.boxShadow.x}px ${details.boxShadow.y}px ${details.boxShadow.blur}px ${details.boxShadow.color}`
				: "",
		]
			.filter(Boolean)
			.join(", "),
		...calculateCropStyles(details, crop),
		overflow: "hidden",
	} as React.CSSProperties;
};

export const calculateTextStyles = (
	details: IText["details"],
): React.CSSProperties => ({
	position: "relative",
	textDecoration: details.textDecoration || "none",
	WebkitTextStroke: `${details.borderWidth}px ${details.borderColor}`, // Outline/stroke color and thickness
	paintOrder: "stroke fill", // Order of painting
	textShadow: details.boxShadow
		? `${details.boxShadow.x}px ${details.boxShadow.y}px ${details.boxShadow.blur}px ${details.boxShadow.color}`
		: "",
	fontFamily: details.fontFamily || "Arial",
	fontWeight: details.fontWeight || "normal",
	lineHeight: details.lineHeight || "normal",
	letterSpacing: details.letterSpacing || "normal",
	wordSpacing: details.wordSpacing || "normal",
	wordWrap: details.wordWrap || "",
	wordBreak: details.wordBreak || "normal",
	textTransform: details.textTransform || "none",
	fontSize: details.fontSize || "16px",
	textAlign: details.textAlign || "left",
	color: details.color || "#000000",
	backgroundColor: details.backgroundColor || "transparent",
	borderRadius: `${Math.min(details.width, details.height) * ((details.borderRadius || 0) / 100)}px`,
});

function buildFilter(details: ITrackItem["details"]): string {
	const brightness = details.brightness ?? 100;
	const blur = details.blur ?? 0;
	if (brightness === 100 && blur === 0) return "none";
	const parts: string[] = [];
	if (brightness !== 100) parts.push(`brightness(${brightness}%)`);
	if (blur !== 0) parts.push(`blur(${blur}px)`);
	return parts.join(" ") || "none";
}

function buildTransform(details: ITrackItem["details"]): string {
	const existing = details.transform || "";
	const rotate = details.rotate;
	if (!rotate || rotate === "0deg" || rotate === "0") return existing || "none";
	// If transform already contains rotate, honour it; otherwise append
	if (existing && existing !== "none") {
		if (existing.includes("rotate")) return existing;
		return `${existing} rotate(${rotate})`;
	}
	return `rotate(${rotate})`;
}

export const calculateContainerStyles = (
	details: ITrackItem["details"],
	crop: ITrackItem["details"]["crop"] = {},
	overrides: React.CSSProperties = {},
	type?: string,
): React.CSSProperties => {
	return {
		pointerEvents: "auto",
		top: details.top || 0,
		left: details.left || 0,
		width: crop.width || details.width || "100%",
		height:
			type === "text" || type === "caption"
				? "max-content"
				: crop.height || details.height || "max-content",
		opacity: details.opacity !== undefined ? details.opacity / 100 : 1,
		transformOrigin: details.transformOrigin || "center center",
		filter: buildFilter(details),
		transform: buildTransform(details),
		...overrides, // Merge overrides into the calculated styles
	};
};
