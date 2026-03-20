"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, ADD_IMAGE } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, AlertCircle, X } from "lucide-react";

interface GiphyItem {
	id: string;
	title: string;
	mp4: string | null;
	preview: string | null;
	gif: string | null;
	width: number;
	height: number;
}

const TABS = [
	{ id: "stickers", label: "Stickers" },
	{ id: "gifs", label: "GIFs" },
] as const;

export const Stickers = () => {
	const [tab, setTab] = useState<"stickers" | "gifs">("stickers");
	const [query, setQuery] = useState("");
	const [items, setItems] = useState<GiphyItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [offset, setOffset] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const LIMIT = 24;

	const fetchGiphy = useCallback(
		async (q: string, type: string, off: number, append = false) => {
			setLoading(true);
			setError(null);
			try {
				const params = new URLSearchParams({
					type,
					limit: String(LIMIT),
					offset: String(off),
				});
				if (q) params.set("q", q);
				const res = await fetch(`/api/giphy?${params}`);
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
		[],
	);

	// Initial + tab change load
	useEffect(() => {
		setItems([]);
		setOffset(0);
		setHasMore(true);
		fetchGiphy(query, tab, 0, false);
	}, [tab]);

	// Debounced search on query change
	useEffect(() => {
		if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
		searchTimerRef.current = setTimeout(() => {
			setItems([]);
			setOffset(0);
			fetchGiphy(query, tab, 0, false);
		}, 500);
		return () => {
			if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
		};
	}, [query]);

	const loadMore = () => {
		const newOffset = offset + LIMIT;
		setOffset(newOffset);
		fetchGiphy(query, tab, newOffset, true);
	};

	const handleAdd = (item: GiphyItem) => {
		if (item.mp4) {
			// Add as a video clip (MP4 loops perfectly)
			dispatch(ADD_VIDEO, {
				payload: {
					id: generateId(),
					details: { src: item.mp4 },
					metadata: { previewUrl: item.preview || item.gif || item.mp4 },
				},
				options: { resourceId: "main", scaleMode: "fit" },
			});
		} else if (item.gif) {
			// Fallback: add GIF as image
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
		<div className="flex flex-col h-full overflow-hidden">
			{/* Header */}
			<div className="flex h-12 flex-none items-center px-4 text-sm font-medium">
				Stickers & GIFs
			</div>

			{/* Tabs */}
			<div className="flex flex-none gap-1 px-4 pb-2">
				{TABS.map((t) => (
					<button
						key={t.id}
						onClick={() => setTab(t.id)}
						className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
							tab === t.id
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground hover:bg-muted/80"
						}`}
					>
						{t.label}
					</button>
				))}
			</div>

			{/* Search */}
			<div className="px-4 pb-3 flex-none">
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
					<Input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={`Search ${tab}…`}
						className="pl-8 pr-8 h-8 text-xs"
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
			</div>

			{/* Error */}
			{error && (
				<div className="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex-none">
					<AlertCircle className="h-3.5 w-3.5 flex-none" />
					{error}
				</div>
			)}

			{/* Grid */}
			<ScrollArea className="flex-1">
				<div className="grid grid-cols-3 gap-1.5 px-4 pb-4">
					{items.map((item) => (
						<button
							key={item.id}
							onClick={() => handleAdd(item)}
							title={item.title}
							className="aspect-square rounded-lg overflow-hidden bg-muted/50 hover:ring-2 hover:ring-primary/60 transition-all group relative"
						>
							{item.preview ? (
								<img
									src={item.preview}
									alt={item.title}
									className="w-full h-full object-cover"
									loading="lazy"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
									{item.title.slice(0, 6)}
								</div>
							)}
							{/* Add overlay */}
							<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
								<span className="text-white text-xs font-semibold">Add</span>
							</div>
						</button>
					))}

					{/* Loading skeletons */}
					{loading &&
						Array.from({ length: 9 }).map((_, i) => (
							<div
								key={`sk-${i}`}
								className="aspect-square rounded-lg bg-muted/50 animate-pulse"
							/>
						))}
				</div>

				{/* Load more */}
				{!loading && hasMore && items.length > 0 && (
					<div className="px-4 pb-4 flex justify-center">
						<Button
							variant="outline"
							size="sm"
							onClick={loadMore}
							className="w-full text-xs"
						>
							Load more
						</Button>
					</div>
				)}

				{/* Empty */}
				{!loading && items.length === 0 && !error && (
					<div className="flex flex-col items-center justify-center py-12 text-center gap-2 text-muted-foreground">
						<Search className="h-8 w-8 opacity-40" />
						<p className="text-sm">No results for "{query}"</p>
					</div>
				)}
			</ScrollArea>

			{/* Giphy attribution (required by Giphy ToS) */}
			<div className="flex-none px-4 py-2 border-t border-border/50 flex items-center justify-end gap-1.5">
				<span className="text-[10px] text-muted-foreground">Powered by</span>
				<img
					src="https://developers.giphy.com/static/img/dev-logo-lg.7404c00322a8.gif"
					alt="GIPHY"
					className="h-4 object-contain opacity-70"
				/>
			</div>
		</div>
	);
};
