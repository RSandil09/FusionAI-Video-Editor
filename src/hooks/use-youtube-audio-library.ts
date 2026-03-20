import { useState, useCallback } from "react";
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

	const fetchAudios = useCallback(async (url: string) => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data: YouTubeAudioLibraryResponse = await response.json();

			setAudios(data.audios);
			setTotalCount(data.total_count);
			setCurrentPage(data.page);
			setHasNextPage(data.has_next_page);
			setHasPrevPage(data.has_prev_page);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch audio");
			setAudios([]);
		} finally {
			setLoading(false);
		}
	}, []);

	const searchAudios = useCallback(
		async (query: string, page = 1) => {
			const params = new URLSearchParams({
				page: String(page),
				per_page: "24",
			});
			if (query.trim()) params.set("query", query.trim());
			const url = `/api/youtube-audio-library?${params}`;
			await fetchAudios(url);
		},
		[fetchAudios],
	);

	const searchAudiosAppend = useCallback(async (query: string, page = 1) => {
		setLoading(true);
		setError(null);

		try {
			const params = new URLSearchParams({
				page: String(page),
				per_page: "24",
			});
			if (query.trim()) params.set("query", query.trim());
			const url = `/api/youtube-audio-library?${params}`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data: YouTubeAudioLibraryResponse = await response.json();

			setAudios((prev) => [...prev, ...data.audios]);
			setTotalCount(data.total_count);
			setCurrentPage(data.page);
			setHasNextPage(data.has_next_page);
			setHasPrevPage(data.has_prev_page);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch audio");
		} finally {
			setLoading(false);
		}
	}, []);

	const loadAudios = useCallback(
		async (page = 1) => {
			const url = `/api/youtube-audio-library?page=${page}&per_page=24`;
			await fetchAudios(url);
		},
		[fetchAudios],
	);

	const loadAudiosAppend = useCallback(async (page = 1) => {
		setLoading(true);
		setError(null);

		try {
			const url = `/api/youtube-audio-library?page=${page}&per_page=24`;
			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data: YouTubeAudioLibraryResponse = await response.json();

			setAudios((prev) => [...prev, ...data.audios]);
			setTotalCount(data.total_count);
			setCurrentPage(data.page);
			setHasNextPage(data.has_next_page);
			setHasPrevPage(data.has_prev_page);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to fetch audio");
		} finally {
			setLoading(false);
		}
	}, []);

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
