"use client";

import { dispatch } from "@designcombo/events";
import {
	ADD_IMAGE,
	ADD_LINEAL_AUDIO_BARS,
	ADD_RADIAL_AUDIO_BARS,
	ADD_WAVE_AUDIO_BARS,
	ADD_HILL_AUDIO_BARS,
	ADD_VIDEO,
} from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { Search, X, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId = "shapes" | "stickers" | "gifs" | "visualizers";

// ─── SVG Shapes ──────────────────────────────────────────────────────────────
const SHAPES = [
	{
		id: "rect",
		label: "Rectangle",
		color: "#6366f1",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140"><rect x="10" y="10" width="180" height="120" fill="#6366f1"/></svg>`,
	},
	{
		id: "rounded",
		label: "Rounded",
		color: "#8b5cf6",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140"><rect x="10" y="10" width="180" height="120" fill="#8b5cf6" rx="20"/></svg>`,
	},
	{
		id: "circle",
		label: "Circle",
		color: "#ec4899",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" fill="#ec4899"/></svg>`,
	},
	{
		id: "ellipse",
		label: "Ellipse",
		color: "#f59e0b",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140"><ellipse cx="100" cy="70" rx="90" ry="55" fill="#f59e0b"/></svg>`,
	},
	{
		id: "triangle",
		label: "Triangle",
		color: "#10b981",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><polygon points="100,10 190,190 10,190" fill="#10b981"/></svg>`,
	},
	{
		id: "diamond",
		label: "Diamond",
		color: "#3b82f6",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><polygon points="100,10 190,100 100,190 10,100" fill="#3b82f6"/></svg>`,
	},
	{
		id: "star",
		label: "Star",
		color: "#f59e0b",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><polygon points="100,10 122,76 193,76 137,117 159,183 100,142 41,183 63,117 7,76 78,76" fill="#f59e0b"/></svg>`,
	},
	{
		id: "pentagon",
		label: "Pentagon",
		color: "#ef4444",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><polygon points="100,10 190,73 158,175 42,175 10,73" fill="#ef4444"/></svg>`,
	},
	{
		id: "arrow",
		label: "Arrow",
		color: "#06b6d4",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140"><polygon points="10,50 130,50 130,20 190,70 130,120 130,90 10,90" fill="#06b6d4"/></svg>`,
	},
	{
		id: "line",
		label: "Line",
		color: "#ffffff",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40"><rect x="0" y="15" width="200" height="10" fill="#ffffff" rx="5"/></svg>`,
	},
	{
		id: "heart",
		label: "Heart",
		color: "#f43f5e",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M100,170 C100,170 20,120 20,70 A40,40,0,0,1,100,55 A40,40,0,0,1,180,70 C180,120 100,170 100,170Z" fill="#f43f5e"/></svg>`,
	},
	{
		id: "bubble",
		label: "Bubble",
		color: "#7c3aed",
		svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180"><rect x="10" y="10" width="180" height="130" fill="#7c3aed" rx="16"/><polygon points="50,140 30,180 90,140" fill="#7c3aed"/></svg>`,
	},
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const svgToDataUrl = (svg: string) =>
	`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

const addShape = (svg: string) =>
	dispatch(ADD_IMAGE, {
		payload: {
			id: generateId(),
			type: "image",
			display: { from: 0, to: 5000 },
			details: { src: svgToDataUrl(svg), width: 400, height: 400 },
			metadata: {},
		},
		options: {},
	});

// ─── Giphy interface ──────────────────────────────────────────────────────────
interface GiphyItem {
	id: string;
	title: string;
	mp4: string | null;
	preview: string | null;
	gif: string | null;
	width: number;
	height: number;
}

// ─── GiphyGrid ────────────────────────────────────────────────────────────────
const GiphyGrid = ({ type }: { type: "stickers" | "gifs" }) => {
	const [query, setQuery] = useState("");
	const [items, setItems] = useState<GiphyItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [offset, setOffset] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const LIMIT = 24;

	const fetchGiphy = useCallback(
		async (q: string, off: number, append = false) => {
			setLoading(true);
			setError(null);
			try {
				const p = new URLSearchParams({
					type,
					limit: String(LIMIT),
					offset: String(off),
				});
				if (q) p.set("q", q);
				const res = await fetch(`/api/giphy?${p}`);
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || "Failed to load");
				setItems((prev) => (append ? [...prev, ...data.items] : data.items));
				setHasMore(data.items.length === LIMIT);
			} catch (e: any) {
				setError(e.message);
			} finally {
				setLoading(false);
			}
		},
		[type],
	);

	useEffect(() => {
		setItems([]);
		setOffset(0);
		fetchGiphy("", 0);
	}, [type]);

	useEffect(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			setItems([]);
			setOffset(0);
			fetchGiphy(query, 0);
		}, 500);
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [query]);

	const addItem = (item: GiphyItem) => {
		if (item.mp4) {
			dispatch(ADD_VIDEO, {
				payload: {
					id: generateId(),
					details: { src: item.mp4 },
					metadata: { previewUrl: item.preview || item.mp4 },
				},
				options: { resourceId: "main", scaleMode: "fit" },
			});
		} else if (item.gif) {
			dispatch(ADD_IMAGE, {
				payload: {
					id: generateId(),
					type: "image",
					display: { from: 0, to: 5000 },
					details: { src: item.gif, width: item.width, height: item.height },
					metadata: {},
				},
				options: {},
			});
		}
	};

	return (
		<div className="flex flex-col gap-3">
			{/* Search */}
			<div className="relative">
				<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder={`Search ${type}…`}
					className="pl-8 pr-7 h-8 text-xs bg-secondary/50 border-border/50"
				/>
				{query && (
					<button
						onClick={() => setQuery("")}
						className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				)}
			</div>

			{error && (
				<div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
					<AlertCircle className="h-3.5 w-3.5 flex-none" />
					{error}
				</div>
			)}

			{/* Grid */}
			<div className="grid grid-cols-3 gap-1.5">
				{items.map((item) => (
					<button
						key={item.id}
						onClick={() => addItem(item)}
						title={item.title}
						className="aspect-square rounded-xl overflow-hidden bg-secondary/50 hover:ring-2 hover:ring-primary transition-all group relative border border-border/30"
					>
						{item.preview ? (
							<img
								src={item.preview}
								alt={item.title}
								className="w-full h-full object-cover"
								loading="lazy"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
								{item.title.slice(0, 6)}
							</div>
						)}
						<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
							<span className="text-white text-[10px] font-semibold">
								+ Add
							</span>
						</div>
					</button>
				))}
				{loading &&
					Array.from({ length: 9 }).map((_, i) => (
						<div
							key={i}
							className="aspect-square rounded-xl bg-secondary/50 animate-pulse border border-border/30"
						/>
					))}
			</div>

			{!loading && hasMore && items.length > 0 && (
				<button
					onClick={() => {
						const n = offset + LIMIT;
						setOffset(n);
						fetchGiphy(query, n, true);
					}}
					className="w-full py-2 text-xs text-muted-foreground hover:text-foreground border border-border/40 rounded-xl hover:bg-secondary/50 transition-colors"
				>
					Load more
				</button>
			)}

			{!loading && items.length === 0 && !error && (
				<div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
					<Search className="h-7 w-7 opacity-30" />
					<p className="text-xs">No results for "{query}"</p>
				</div>
			)}

			{/* Giphy attribution — required by ToS */}
			<div className="flex items-center justify-end gap-1.5 pt-1">
				<span className="text-[9px] text-muted-foreground">Powered by</span>
				<img
					src="https://developers.giphy.com/static/img/dev-logo-lg.7404c00322a8.gif"
					alt="GIPHY"
					className="h-3 object-contain opacity-60"
				/>
			</div>
		</div>
	);
};

// ─── Visualizers ─────────────────────────────────────────────────────────────
const VizTile = ({
	label,
	color,
	onClick,
}: { label: string; color: string; onClick: () => void }) => (
	<button
		onClick={onClick}
		className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-secondary/40 hover:bg-secondary border border-border/40 hover:border-primary/40 transition-all w-full"
	>
		<div className="w-full h-5 rounded-md" style={{ background: color }} />
		<span className="text-[10px] text-muted-foreground">{label}</span>
	</button>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export const Elements = () => {
	const [tab, setTab] = useState<TabId>("shapes");

	const tabs: { id: TabId; label: string }[] = [
		{ id: "shapes", label: "Shapes" },
		{ id: "stickers", label: "Stickers" },
		{ id: "gifs", label: "GIFs" },
		{ id: "visualizers", label: "Visualizers" },
	];

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex h-12 flex-none items-center px-4 text-sm font-medium border-b border-border/50">
				Elements
			</div>

			{/* Pill tabs — flex-wrap so they never overflow */}
			<div className="flex flex-none flex-wrap gap-1.5 px-4 py-3">
				{tabs.map((t) => (
					<button
						key={t.id}
						onClick={() => setTab(t.id)}
						className={`py-1 px-3 text-xs font-medium rounded-full border transition-colors ${
							tab === t.id
								? "bg-primary text-primary-foreground border-primary"
								: "bg-transparent text-muted-foreground border-border/60 hover:border-border hover:text-foreground"
						}`}
					>
						{t.label}
					</button>
				))}
			</div>

			{/* Scrollable body */}
			<ScrollArea className="flex-1">
				<div className="px-4 pb-6 pt-1">
					{/* ── Shapes grid ── */}
					{tab === "shapes" && (
						<div className="grid grid-cols-4 gap-2">
							{SHAPES.map((shape) => (
								<button
									key={shape.id}
									onClick={() => addShape(shape.svg)}
									title={shape.label}
									className="aspect-square rounded-xl overflow-hidden bg-secondary/50 border border-border/30 hover:border-primary/60 hover:scale-105 transition-all flex items-center justify-center p-2"
									dangerouslySetInnerHTML={{ __html: shape.svg }}
								/>
							))}
						</div>
					)}

					{/* ── Giphy stickers / GIFs ── */}
					{(tab === "stickers" || tab === "gifs") && <GiphyGrid type={tab} />}

					{/* ── Visualizers ── */}
					{tab === "visualizers" && (
						<div className="flex flex-col gap-5">
							{[
								{
									title: "Lineal Bars",
									items: [
										{
											label: "Pink",
											color: "#F3B3DC",
											action: () =>
												dispatch(ADD_LINEAL_AUDIO_BARS, {
													payload: {
														id: generateId(),
														type: "linealAudioBars",
														details: {
															height: 96,
															width: 1080,
															linealBarColor: "#F3B3DC",
															lineThickness: 5,
															gapSize: 7,
															roundness: 2,
														},
														display: { from: 0, to: 10000 },
													},
													options: {},
												}),
										},
										{
											label: "Warm",
											color: "#CBAE9A",
											action: () =>
												dispatch(ADD_LINEAL_AUDIO_BARS, {
													payload: {
														id: generateId(),
														type: "linealAudioBars",
														details: {
															height: 96,
															width: 1080,
															linealBarColor: "#CBAE9A",
															lineThickness: 7,
															gapSize: 6,
															roundness: 4,
														},
														display: { from: 0, to: 10000 },
													},
													options: {},
												}),
										},
										{
											label: "Purple",
											color: "#A687DF",
											action: () =>
												dispatch(ADD_LINEAL_AUDIO_BARS, {
													payload: {
														id: generateId(),
														type: "linealAudioBars",
														details: {
															height: 96,
															width: 1080,
															linealBarColor: "#A687DF",
															lineThickness: 2,
															gapSize: 4,
															roundness: 2,
														},
														display: { from: 0, to: 10000 },
													},
													options: {},
												}),
										},
									],
								},
								{
									title: "Wave Bars",
									items: [
										{
											label: "Coral",
											color: "#EE8482",
											action: () =>
												dispatch(ADD_WAVE_AUDIO_BARS, {
													payload: {
														id: generateId(),
														type: "waveAudioBars",
														details: {
															height: 96,
															width: 1080,
															offsetPixelSpeed: 100,
															lineColor: ["#EE8482", "teal"],
															lineGap: 70,
															sections: 10,
														},
														display: { from: 0, to: 10000 },
													},
													options: {},
												}),
										},
										{
											label: "Dual",
											color: "#EE8482",
											action: () =>
												dispatch(ADD_WAVE_AUDIO_BARS, {
													payload: {
														id: generateId(),
														type: "waveAudioBars",
														details: {
															height: 96,
															width: 1080,
															offsetPixelSpeed: -100,
															lineColor: "#EE8482",
															lines: 6,
															lineGap: 6,
															sections: 10,
														},
														display: { from: 0, to: 10000 },
													},
													options: {},
												}),
										},
									],
								},
								{
									title: "Hill Bars",
									items: [
										{
											label: "Green",
											color: "#92E1B0",
											action: () =>
												dispatch(ADD_HILL_AUDIO_BARS, {
													payload: {
														id: generateId(),
														type: "hillAudioBars",
														details: {
															height: 96,
															width: 1080,
															fillColor: "#92E1B0",
														},
														display: { from: 0, to: 10000 },
													},
													options: {},
												}),
										},
										{
											label: "Tri",
											color: "#559B59",
											action: () =>
												dispatch(ADD_HILL_AUDIO_BARS, {
													payload: {
														id: generateId(),
														type: "hillAudioBars",
														details: {
															height: 96,
															width: 1080,
															fillColor: ["#559B59", "#466CF6", "#E54B41"],
															copies: 3,
															blendMode: "screen",
														},
														display: { from: 0, to: 10000 },
													},
													options: {},
												}),
										},
									],
								},
								{
									title: "Radial",
									items: [
										{
											label: "Blue",
											color: "#00a6ff",
											action: () =>
												dispatch(ADD_RADIAL_AUDIO_BARS, {
													payload: {
														id: generateId(),
														type: "radialAudioBars",
														details: {
															height: 1080,
															width: 1080,
															linealBarColor: "#00a6ff",
														},
														display: { from: 0, to: 10000 },
													},
													options: {},
												}),
										},
									],
								},
							].map((group) => (
								<div key={group.title} className="flex flex-col gap-2">
									<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
										{group.title}
									</span>
									<div className="grid grid-cols-3 gap-2">
										{group.items.map((item) => (
											<VizTile
												key={item.label}
												label={item.label}
												color={item.color}
												onClick={item.action}
											/>
										))}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
};
