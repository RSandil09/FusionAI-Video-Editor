import { useState, useCallback, useRef, useEffect } from "react";
import { IAudio } from "@designcombo/types";

interface YouTubeAudioLibraryResponse {
	audios: Partial<IAudio>[];
	total_count: number;
	page: number;
	per_page: number;
	total_pages: number;
	has_next_page: boolean;
	has_prev_page: boolean;
}

interface UseYouTubeAudioLibraryReturn {
	audios: Partial<IAudio>[];
	loading: boolean;
	error: string | null;
	totalCount: number;
	currentPage: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
	searchAudios: (query: string, page?: number) => Promise<void>;
	loadAudios: (page?: number) => Promise<void>;
	searchAudiosAppend: (query: string, page?: number) => Promise<void>;
	loadAudiosAppend: (page?: number) => Promise<void>;
	clearAudios: () => void;
}

// Module-level cache so repeated mounts of the Audios panel skip redundant fetches.
const responseCache = new Map<string, { data: YouTubeAudioLibraryResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(url: string): YouTubeAudioLibraryResponse | null {
	const entry = responseCache.get(url);
	if (!entry) return null;
	if (Date.now() - entry.timestamp > CACHE_TTL) {
		responseCache.delete(url);
		return null;
	}
	return entry.data;
}

function setCached(url: string, data: YouTubeAudioLibraryResponse) {
	responseCache.set(url, { data, timestamp: Date.now() });
}

/**
 * Hook for fetching and managing YouTube Audio Library tracks.
 * All tracks are royalty-free and safe for YouTube videos and other projects.
 */
export function useYouTubeAudioLibrary(): UseYouTubeAudioLibraryReturn {
	const [audios, setAudios] = useState<Partial<IAudio>[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [totalCount, setTotalCount] = useState(0);
	const [currentPage, setCurrentPage] = useState(1);
	const [hasNextPage, setHasNextPage] = useState(false);
	const [hasPrevPage, setHasPrevPage] = useState(false);

	// Holds the in-flight AbortController so we can cancel stale requests.
	const abortCtrlRef = useRef<AbortController | null>(null);

	// Cancel any pending fetch when the component unmounts.
	useEffect(() => {
		return () => {
			abortCtrlRef.current?.abort();
		};
	}, []);

	const fetchAudios = useCallback(async (url: string, append = false) => {
		// Serve from cache when available.
		const cached = getCached(url);
		if (cached) {
			if (append) {
				setAudios((prev) => [...prev, ...cached.audios]);
			} else {
				setAudios(cached.audios);
			}
			setTotalCount(cached.total_count);
			setCurrentPage(cached.page);
			setHasNextPage(cached.has_next_page);
			setHasPrevPage(cached.has_prev_page);
			return;
		}

		// Abort any in-flight request before starting a new one.
		abortCtrlRef.current?.abort();
		const ctrl = new AbortController();
		abortCtrlRef.current = ctrl;

		setLoading(true);
		setError(null);

		try {
			const response = await fetch(url, { signal: ctrl.signal });

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data: YouTubeAudioLibraryResponse = await response.json();

			setCached(url, data);

			if (append) {
				setAudios((prev) => [...prev, ...data.audios]);
			} else {
				setAudios(data.audios);
			}
			setTotalCount(data.total_count);
			setCurrentPage(data.page);
			setHasNextPage(data.has_next_page);
			setHasPrevPage(data.has_prev_page);
		} catch (err) {
			if (err instanceof Error && err.name === "AbortError") return;
			setError(err instanceof Error ? err.message : "Failed to fetch audio");
			if (!append) setAudios([]);
		} finally {
			setLoading(false);
		}
	}, []);

	const buildUrl = (query?: string, page = 1) => {
		const params = new URLSearchParams({ page: String(page), per_page: "24" });
		if (query?.trim()) params.set("query", query.trim());
		return `/api/youtube-audio-library?${params}`;
	};

	const searchAudios = useCallback(
		(query: string, page = 1) => fetchAudios(buildUrl(query, page)),
		[fetchAudios],
	);

	const searchAudiosAppend = useCallback(
		(query: string, page = 1) => fetchAudios(buildUrl(query, page), true),
		[fetchAudios],
	);

	const loadAudios = useCallback(
		(page = 1) => fetchAudios(buildUrl(undefined, page)),
		[fetchAudios],
	);

	const loadAudiosAppend = useCallback(
		(page = 1) => fetchAudios(buildUrl(undefined, page), true),
		[fetchAudios],
	);

	const clearAudios = useCallback(() => {
		setAudios([]);
		setError(null);
		setTotalCount(0);
		setCurrentPage(1);
		setHasNextPage(false);
		setHasPrevPage(false);
	}, []);

	return {
		audios,
		loading,
		error,
		totalCount,
		currentPage,
		hasNextPage,
		hasPrevPage,
		searchAudios,
		loadAudios,
		searchAudiosAppend,
		loadAudiosAppend,
		clearAudios,
	};
}
