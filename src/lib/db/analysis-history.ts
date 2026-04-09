/**
 * Analysis History Database Operations
 * CRUD for smart editing analysis results (scenes, silences, highlights)
 * Server-only: uses supabaseAdmin (import only in API routes)
 */

import { supabaseAdmin } from "./supabase-admin";
import type { Database } from "./database.types";

type AnalysisHistory = Database["public"]["Tables"]["analysis_history"]["Row"];
type AnalysisHistoryInsert =
	Database["public"]["Tables"]["analysis_history"]["Insert"];

export interface AnalysisSegment {
	start: number;
	end: number;
	label?: string;
	confidence?: number;
}

export interface AnalysisResultForDb {
	type: string;
	segments: AnalysisSegment[];
	videoUrl: string;
	videoName?: string;
}

/**
 * Save an analysis result to history
 */
export async function saveAnalysisToHistory(
	projectId: string,
	userId: string,
	analysis: AnalysisResultForDb,
): Promise<AnalysisHistory | null> {
	try {
		const { data, error } = await supabaseAdmin
			.from("analysis_history")
			.insert({
				project_id: projectId,
				user_id: userId,
				analysis_type: analysis.type,
				video_url: analysis.videoUrl,
				video_name: analysis.videoName || null,
				segments:
					analysis.segments as unknown as Database["public"]["Tables"]["analysis_history"]["Row"]["segments"],
			})
			.select()
			.maybeSingle();

		if (error) {
			console.error("Error saving analysis to history:", error);
			return null;
		}
		return data ?? null;
	} catch (err) {
		console.error("Failed to save analysis history:", err);
		return null;
	}
}

/**
 * Get analysis history for a project, newest first
 */
export async function getAnalysisHistory(
	projectId: string,
	options?: { limit?: number; type?: string },
): Promise<AnalysisHistory[]> {
	try {
		let query = supabaseAdmin
			.from("analysis_history")
			.select("*")
			.eq("project_id", projectId)
			.order("created_at", { ascending: false });

		if (options?.type) {
			query = query.eq("analysis_type", options.type);
		}
		if (options?.limit) {
			query = query.limit(options.limit);
		}

		const { data, error } = await query;

		if (error) {
			console.error("Error fetching analysis history:", error);
			return [];
		}
		return data || [];
	} catch (err) {
		console.error("Failed to get analysis history:", err);
		return [];
	}
}

/**
 * Delete an analysis from history
 */
export async function deleteAnalysisFromHistory(
	id: string,
	userId: string,
): Promise<boolean> {
	try {
		const { error } = await supabaseAdmin
			.from("analysis_history")
			.delete()
			.eq("id", id)
			.eq("user_id", userId);

		if (error) {
			console.error("Error deleting analysis:", error);
			return false;
		}
		return true;
	} catch (err) {
		console.error("Failed to delete analysis:", err);
		return false;
	}
}
