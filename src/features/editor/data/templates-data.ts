/**
 * Shared template definitions for New Project modal and Templates sidebar.
 * Each template returns a partial editor state (tracks, trackItemsMap, duration).
 */

import { generateId } from "@designcombo/timeline";
import { DEFAULT_FONT } from "../constants/font";

const makeId = () => generateId();

export interface TemplateDefinition {
	id: string;
	name: string;
	category: string;
	description: string;
	emoji: string;
	color: string;
	state: () => {
		duration: number;
		tracks: Array<{ id: string; type: string; items: string[] }>;
		trackItemsMap: Record<string, unknown>;
	};
}

export const TEMPLATES: TemplateDefinition[] = [
	{
		id: "quote-card",
		name: "Quote Card",
		category: "Text",
		description: "Centered quote with subtitle",
		emoji: "💬",
		color: "from-violet-600 to-indigo-600",
		state: () => {
			const quoteId = makeId();
			const authorId = makeId();
			return {
				duration: 7000,
				tracks: [{ id: makeId(), type: "text", items: [quoteId, authorId] }],
				trackItemsMap: {
					[quoteId]: {
						id: quoteId,
						type: "text",
						name: "Quote",
						display: { from: 0, to: 7000 },
						details: {
							text: '"The only way to do great work is to love what you do."',
							fontSize: 80,
							fontFamily: DEFAULT_FONT.postScriptName,
							fontUrl: DEFAULT_FONT.url,
							fontWeight: "700",
							fontStyle: "italic",
							color: "#ffffff",
							width: 900,
							textAlign: "center",
							wordWrap: "break-word",
							borderWidth: 0,
							borderColor: "#000000",
							boxShadow: { color: "#7c3aed", x: 0, y: 0, blur: 20 },
							top: 400,
							left: 90,
						},
					},
					[authorId]: {
						id: authorId,
						type: "text",
						name: "Author",
						display: { from: 0, to: 7000 },
						details: {
							text: "— Steve Jobs",
							fontSize: 48,
							fontFamily: DEFAULT_FONT.postScriptName,
							fontUrl: DEFAULT_FONT.url,
							fontWeight: "400",
							color: "#a5b4fc",
							width: 600,
							textAlign: "center",
							wordWrap: "break-word",
							borderWidth: 0,
							borderColor: "#000000",
							boxShadow: { color: "#ffffff", x: 0, y: 0, blur: 0 },
							top: 600,
							left: 240,
						},
					},
				},
			};
		},
	},
	{
		id: "bold-title",
		name: "Bold Title",
		category: "Text",
		description: "Large impact headline + caption",
		emoji: "🔥",
		color: "from-orange-500 to-red-600",
		state: () => {
			const titleId = makeId();
			const subId = makeId();
			return {
				duration: 5000,
				tracks: [{ id: makeId(), type: "text", items: [titleId, subId] }],
				trackItemsMap: {
					[titleId]: {
						id: titleId,
						type: "text",
						name: "Title",
						display: { from: 0, to: 5000 },
						details: {
							text: "YOUR HEADLINE",
							fontSize: 160,
							fontFamily: DEFAULT_FONT.postScriptName,
							fontUrl: DEFAULT_FONT.url,
							fontWeight: "900",
							color: "#ffffff",
							width: 1000,
							textAlign: "center",
							wordWrap: "break-word",
							borderWidth: 4,
							borderColor: "#f97316",
							boxShadow: { color: "#000000", x: 0, y: 8, blur: 24 },
							top: 350,
							left: 40,
						},
					},
					[subId]: {
						id: subId,
						type: "text",
						name: "Subheading",
						display: { from: 0, to: 5000 },
						details: {
							text: "Tap to edit your caption here",
							fontSize: 54,
							fontFamily: DEFAULT_FONT.postScriptName,
							fontUrl: DEFAULT_FONT.url,
							fontWeight: "400",
							color: "#fed7aa",
							width: 900,
							textAlign: "center",
							wordWrap: "break-word",
							borderWidth: 0,
							borderColor: "#000000",
							boxShadow: { color: "#ffffff", x: 0, y: 0, blur: 0 },
							top: 580,
							left: 90,
						},
					},
				},
			};
		},
	},
	{
		id: "lower-third",
		name: "Lower Third",
		category: "Broadcast",
		description: "Name & title overlay for interviews",
		emoji: "📺",
		color: "from-blue-600 to-cyan-500",
		state: () => {
			const nameId = makeId();
			const titleId = makeId();
			return {
				duration: 6000,
				tracks: [{ id: makeId(), type: "text", items: [nameId, titleId] }],
				trackItemsMap: {
					[nameId]: {
						id: nameId,
						type: "text",
						name: "Name",
						display: { from: 0, to: 6000 },
						details: {
							text: "Full Name",
							fontSize: 72,
							fontFamily: DEFAULT_FONT.postScriptName,
							fontUrl: DEFAULT_FONT.url,
							fontWeight: "800",
							color: "#ffffff",
							backgroundColor: "#2563eb",
							width: 600,
							textAlign: "left",
							wordWrap: "break-word",
							borderWidth: 0,
							borderColor: "#000000",
							boxShadow: { color: "#000000", x: 0, y: 4, blur: 16 },
							top: 1400,
							left: 80,
						},
					},
					[titleId]: {
						id: titleId,
						type: "text",
						name: "Job Title",
						display: { from: 0, to: 6000 },
						details: {
							text: "Job Title · Company",
							fontSize: 48,
							fontFamily: DEFAULT_FONT.postScriptName,
							fontUrl: DEFAULT_FONT.url,
							fontWeight: "400",
							color: "#bfdbfe",
							width: 600,
							textAlign: "left",
							wordWrap: "break-word",
							borderWidth: 0,
							borderColor: "#000000",
							boxShadow: { color: "#ffffff", x: 0, y: 0, blur: 0 },
							top: 1490,
							left: 80,
						},
					},
				},
			};
		},
	},
	{
		id: "countdown",
		name: "Countdown",
		category: "Social",
		description: "3-2-1 countdown text sequence",
		emoji: "⏱️",
		color: "from-green-500 to-emerald-600",
		state: () => {
			const ids = [makeId(), makeId(), makeId()];
			const labels = ["3", "2", "1"];
			const colors = ["#ef4444", "#f97316", "#22c55e"];
			const trackItemsMap: Record<string, unknown> = {};
			ids.forEach((id, i) => {
				trackItemsMap[id] = {
					id,
					type: "text",
					name: `Count ${labels[i]}`,
					display: { from: i * 1000, to: (i + 1) * 1000 },
					details: {
						text: labels[i],
						fontSize: 300,
						fontFamily: DEFAULT_FONT.postScriptName,
						fontUrl: DEFAULT_FONT.url,
						fontWeight: "900",
						color: colors[i],
						width: 400,
						textAlign: "center",
						wordWrap: "break-word",
						borderWidth: 6,
						borderColor: "#000000",
						boxShadow: { color: "#000000", x: 0, y: 8, blur: 40 },
						top: 700,
						left: 340,
					},
				};
			});
			return {
				duration: 3000,
				tracks: [{ id: makeId(), type: "text", items: ids }],
				trackItemsMap,
			};
		},
	},
	{
		id: "minimal-caption",
		name: "Minimal Caption",
		category: "Social",
		description: "Clean single-line caption bar",
		emoji: "✏️",
		color: "from-slate-600 to-slate-800",
		state: () => {
			const captionId = makeId();
			return {
				duration: 5000,
				tracks: [{ id: makeId(), type: "text", items: [captionId] }],
				trackItemsMap: {
					[captionId]: {
						id: captionId,
						type: "text",
						name: "Caption",
						display: { from: 0, to: 5000 },
						details: {
							text: "Your caption goes here",
							fontSize: 60,
							fontFamily: DEFAULT_FONT.postScriptName,
							fontUrl: DEFAULT_FONT.url,
							fontWeight: "600",
							color: "#ffffff",
							backgroundColor: "rgba(0,0,0,0.6)",
							width: 1000,
							textAlign: "center",
							wordWrap: "break-word",
							borderWidth: 0,
							borderColor: "#000000",
							boxShadow: { color: "#000000", x: 0, y: 0, blur: 0 },
							top: 1700,
							left: 40,
						},
					},
				},
			};
		},
	},
];

export const TEMPLATE_CATEGORIES = [
	"All",
	...Array.from(new Set(TEMPLATES.map((t) => t.category))),
];
