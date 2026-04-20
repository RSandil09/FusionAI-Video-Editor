export interface FilterValues {
	brightness?: number;
	contrast?: number;
	saturation?: number;
	hue?: number;
	sepia?: number;
	grayscale?: number;
	blur?: number;
}

export interface FilterPreset {
	id: string;
	name: string;
	category: "basic" | "film" | "cinematic" | "vintage" | "moody";
	values: FilterValues;
}

/** CSS defaults — every missing key equals its neutral value */
export const FILTER_DEFAULTS: Required<FilterValues> = {
	brightness: 100,
	contrast: 100,
	saturation: 100,
	hue: 0,
	sepia: 0,
	grayscale: 0,
	blur: 0,
};

export const FILTER_CATEGORIES: { id: FilterPreset["category"]; label: string }[] = [
	{ id: "basic", label: "Basic" },
	{ id: "film", label: "Film" },
	{ id: "cinematic", label: "Cinematic" },
	{ id: "vintage", label: "Vintage" },
	{ id: "moody", label: "Moody" },
];

export const FILTER_PRESETS: FilterPreset[] = [
	// ── Basic ────────────────────────────────────────────────────────────────────
	{
		id: "none",
		name: "None",
		category: "basic",
		values: {},
	},
	{
		id: "vivid",
		name: "Vivid",
		category: "basic",
		values: { contrast: 115, saturation: 145 },
	},
	{
		id: "matte",
		name: "Matte",
		category: "basic",
		values: { contrast: 82, brightness: 95, saturation: 90 },
	},
	{
		id: "crisp",
		name: "Crisp",
		category: "basic",
		values: { contrast: 108, saturation: 105, brightness: 98 },
	},

	// ── Film ─────────────────────────────────────────────────────────────────────
	{
		id: "kodak",
		name: "Kodak",
		category: "film",
		values: { contrast: 105, saturation: 110, sepia: 12, brightness: 98 },
	},
	{
		id: "fuji",
		name: "Fuji",
		category: "film",
		values: { contrast: 108, saturation: 118, hue: 8 },
	},
	{
		id: "ilford",
		name: "Ilford",
		category: "film",
		values: { grayscale: 100, contrast: 118 },
	},
	{
		id: "portra",
		name: "Portra",
		category: "film",
		values: { contrast: 96, saturation: 92, sepia: 8, brightness: 97 },
	},

	// ── Cinematic ────────────────────────────────────────────────────────────────
	{
		id: "drama",
		name: "Drama",
		category: "cinematic",
		values: { contrast: 138, saturation: 80, brightness: 90 },
	},
	{
		id: "golden-hour",
		name: "Golden Hour",
		category: "cinematic",
		values: { contrast: 105, saturation: 120, sepia: 18, hue: 15 },
	},
	{
		id: "teal-orange",
		name: "Teal & Orange",
		category: "cinematic",
		values: { contrast: 112, saturation: 130, hue: 28 },
	},
	{
		id: "bleach",
		name: "Bleach",
		category: "cinematic",
		values: { contrast: 130, saturation: 65, brightness: 92 },
	},

	// ── Vintage ──────────────────────────────────────────────────────────────────
	{
		id: "faded",
		name: "Faded",
		category: "vintage",
		values: { contrast: 78, saturation: 82, sepia: 22, brightness: 96 },
	},
	{
		id: "polaroid",
		name: "Polaroid",
		category: "vintage",
		values: { contrast: 88, saturation: 105, sepia: 30, brightness: 98 },
	},
	{
		id: "seventies",
		name: "70s",
		category: "vintage",
		values: { contrast: 100, saturation: 125, sepia: 28, hue: 12 },
	},
	{
		id: "aged",
		name: "Aged",
		category: "vintage",
		values: { contrast: 85, saturation: 70, sepia: 45, brightness: 94 },
	},

	// ── Moody ────────────────────────────────────────────────────────────────────
	{
		id: "noir",
		name: "Noir",
		category: "moody",
		values: { grayscale: 100, contrast: 130, brightness: 88 },
	},
	{
		id: "cool",
		name: "Cool",
		category: "moody",
		values: { contrast: 102, saturation: 90, hue: 200 },
	},
	{
		id: "stormy",
		name: "Stormy",
		category: "moody",
		values: { contrast: 115, saturation: 60, brightness: 85, hue: 190 },
	},
	{
		id: "dusk",
		name: "Dusk",
		category: "moody",
		values: { contrast: 108, saturation: 75, hue: 240, brightness: 90 },
	},
];

/** Build the CSS filter string for a set of FilterValues (mirrors buildFilter in styles.ts) */
export function buildFilterCss(values: FilterValues): string {
	const v = { ...FILTER_DEFAULTS, ...values };
	const parts: string[] = [];
	if (v.brightness !== 100) parts.push(`brightness(${v.brightness}%)`);
	if (v.contrast !== 100) parts.push(`contrast(${v.contrast}%)`);
	if (v.saturation !== 100) parts.push(`saturate(${v.saturation}%)`);
	if (v.hue !== 0) parts.push(`hue-rotate(${v.hue}deg)`);
	if (v.sepia !== 0) parts.push(`sepia(${v.sepia}%)`);
	if (v.grayscale !== 0) parts.push(`grayscale(${v.grayscale}%)`);
	if (v.blur !== 0) parts.push(`blur(${v.blur}px)`);
	return parts.join(" ") || "none";
}
