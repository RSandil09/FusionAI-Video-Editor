import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";

/**
 * GET /api/giphy?q=fire&limit=20&offset=0
 * Proxies Giphy search/trending to avoid exposing the API key client-side.
 * Requires GIPHY_API_KEY in .env.local
 * Requires authentication.
 */
export async function GET(request: Request) {
	const user = await requireAuth();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const apiKey = process.env.GIPHY_API_KEY;
	if (!apiKey) {
		return NextResponse.json(
			{
				error:
					"GIPHY_API_KEY not set. Add it to .env.local — get a free key at developers.giphy.com",
			},
			{ status: 503 },
		);
	}

	const { searchParams } = new URL(request.url);
	const q = searchParams.get("q")?.trim();
	const limit = Math.min(Number(searchParams.get("limit") ?? 24), 50);
	const offset = Number(searchParams.get("offset") ?? 0);

	// Stickers only (transparent-background animated PNGs / GIFs)
	const type = searchParams.get("type") ?? "stickers"; // "stickers" | "gifs"

	let url: string;
	if (q) {
		// Search
		url = `https://api.giphy.com/v1/${type}/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}&rating=g&lang=en`;
	} else {
		// Trending
		url = `https://api.giphy.com/v1/${type}/trending?api_key=${apiKey}&limit=${limit}&offset=${offset}&rating=g`;
	}

	try {
		const res = await fetch(url, { next: { revalidate: 60 }, signal: AbortSignal.timeout(10_000) }); // cache for 60s
		if (!res.ok) {
			throw new Error(`Giphy responded with ${res.status}`);
		}
		const data = await res.json();

		// Slim down the response to only what the client needs
		const items = (data.data ?? []).map((g: any) => ({
			id: g.id,
			title: g.title,
			// Prefer MP4 for timeline (smaller, loops cleanly)
			mp4: g.images?.fixed_height?.mp4 || g.images?.original?.mp4 || null,
			// GIF preview for the panel thumbnail
			preview:
				g.images?.fixed_height_small?.url ||
				g.images?.fixed_height?.url ||
				null,
			// Original GIF as fallback
			gif: g.images?.original?.url || null,
			width: Number(g.images?.fixed_height?.width ?? 200),
			height: Number(g.images?.fixed_height?.height ?? 200),
		}));

		return NextResponse.json({
			items,
			total: data.pagination?.total_count ?? items.length,
		});
	} catch (err: any) {
		console.error("Giphy proxy error:", err.message);
		return NextResponse.json({ error: err.message }, { status: 500 });
	}
}
