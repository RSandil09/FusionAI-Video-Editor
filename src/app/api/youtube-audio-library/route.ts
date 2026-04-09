import { NextRequest, NextResponse } from "next/server";

const YOUTUBE_AUDIO_LIBRARY_API =
	"https://thibaultjanbeyer.github.io/YouTube-Free-Audio-Library-API/api.json";

interface YouTubeAudioItem {
	kind: string;
	id: string;
	name: string;
	mimeType: string;
}

interface YouTubeAudioLibraryResponse {
	arr: string[];
	map: Record<string, string>;
	count: number;
	all: YouTubeAudioItem[];
}

/**
 * Converts filename like "Sky_Skating.mp3" to display name "Sky Skating"
 */
function filenameToDisplayName(filename: string): string {
	return filename.replace(/\.(mp3|wav|ogg|m4a)$/i, "").replace(/_/g, " ");
}

/**
 * YouTube Audio Library API Route
 * Fetches royalty-free music from YouTube's free Audio Library via unofficial API.
 * All tracks are safe to use in YouTube videos and other projects.
 */
export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const query = searchParams.get("query")?.toLowerCase().trim() || "";
	const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
	const perPage = Math.min(
		50,
		Math.max(10, parseInt(searchParams.get("per_page") || "24", 10)),
	);

	try {
		const response = await fetch(YOUTUBE_AUDIO_LIBRARY_API, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; ReactVideoEditor/1.0)",
			},
			next: { revalidate: 3600 }, // Cache for 1 hour
			signal: AbortSignal.timeout(15_000),
		});

		if (!response.ok) {
			throw new Error(`API error: ${response.status}`);
		}

		const data: YouTubeAudioLibraryResponse = await response.json();
		const { all, map } = data;

		if (!all || !Array.isArray(all) || !map) {
			throw new Error("Invalid API response structure");
		}

		// Filter by search query (client-side filter on name)
		let filtered = all;
		if (query) {
			const searchTerms = query.split(/\s+/).filter(Boolean);
			filtered = all.filter((item) => {
				const displayName = filenameToDisplayName(item.name).toLowerCase();
				return searchTerms.every((term) => displayName.includes(term));
			});
		}

		const totalCount = filtered.length;
		const totalPages = Math.ceil(totalCount / perPage);
		const startIndex = (page - 1) * perPage;
		const paginatedItems = filtered.slice(startIndex, startIndex + perPage);

		// Map to IAudio-compatible format
		const baseUrl = request.nextUrl.origin;
		const audios = paginatedItems.map((item) => {
			const rawUrl =
				map[item.id] ||
				`https://drive.google.com/uc?export=download&id=${item.id}`;
			// Use video-proxy for CORS-safe playback (supports audio too)
			const proxiedUrl = `${baseUrl}/api/video-proxy?url=${encodeURIComponent(rawUrl)}`;

			return {
				id: `yt-audio-${item.id}`,
				details: {
					src: proxiedUrl,
				},
				name: filenameToDisplayName(item.name),
				type: "audio" as const,
				metadata: {
					author: "YouTube Audio Library",
					source: "youtube-audio-library",
					driveId: item.id,
				},
			};
		});

		return NextResponse.json({
			audios,
			total_count: totalCount,
			page,
			per_page: perPage,
			total_pages: totalPages,
			has_next_page: page < totalPages,
			has_prev_page: page > 1,
		});
	} catch (error) {
		console.error("YouTube Audio Library API error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch audio from YouTube Audio Library" },
			{ status: 500 },
		);
	}
}
