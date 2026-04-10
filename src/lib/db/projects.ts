/**
 * Project Database Operations
 * CRUD operations for projects table
 */

import { logger } from "@/lib/logger";
import { supabase } from "./supabase";
import type { Database } from "./database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

/**
 * Create a new project
 */
export async function createProject(
	data: ProjectInsert,
): Promise<Project | null> {
	try {
		logger.log("🔵 Creating project with data:", {
			user_id: data.user_id,
			name: data.name,
			resolution: `${data.resolution_width}x${data.resolution_height}`,
			fps: data.frame_rate,
		});

		const { data: project, error } = await supabase
			.from("projects")
			.insert({
				user_id: data.user_id,
				name: data.name,
				description: data.description || null,
				resolution_width: data.resolution_width || 1920,
				resolution_height: data.resolution_height || 1080,
				frame_rate: data.frame_rate || 30,
			})
			.select()
			.maybeSingle();

		if (error) {
			logger.error("❌ Supabase error creating project:");
			logger.error("Error code:", error.code);
			logger.error("Error message:", error.message);
			logger.error("Error details:", error.details);
			logger.error("Error hint:", error.hint);
			logger.error("Full error:", JSON.stringify(error, null, 2));
			return null;
		}

		logger.log("✅ Project created successfully:", project?.id);
		return project ?? null;
	} catch (error) {
		logger.error("💥 Unexpected error creating project:");
		logger.error("Error type:", typeof error);
		logger.error("Error:", error);
		if (error instanceof Error) {
			logger.error("Error name:", error.name);
			logger.error("Error message:", error.message);
			logger.error("Error stack:", error.stack);
		}
		return null;
	}
}

/**
 * Get all projects for a user
 */
export async function getProjects(
	userId: string,
	options?: {
		sortBy?: "updated_at" | "created_at" | "last_accessed_at" | "name";
		limit?: number;
	},
): Promise<Project[]> {
	try {
		let query = supabase.from("projects").select("*").eq("user_id", userId);

		// Apply sorting
		const sortBy = options?.sortBy || "updated_at";
		query = query.order(sortBy, { ascending: false });

		// Apply limit — default 100 to prevent unbounded fetches
		const limit = options?.limit ?? 100;
		query = query.limit(limit);

		const { data, error } = await query;

		if (error) {
			logger.error("Error fetching projects:", error);
			return [];
		}

		return data || [];
	} catch (error) {
		logger.error("Failed to get projects:", error);
		return [];
	}
}

/**
 * Get a single project by ID.
 * Passing userId adds an ownership filter so users cannot read other users' projects
 * even if Supabase RLS is misconfigured.
 */
export async function getProject(
	projectId: string,
	userId?: string,
): Promise<Project | null> {
	try {
		let query = supabase.from("projects").select("*").eq("id", projectId);
		if (userId) query = query.eq("user_id", userId);

		const { data, error } = await query.maybeSingle();

		if (error) {
			logger.error("Error fetching project:", error);
			return null;
		}

		return data;
	} catch (error) {
		logger.error("Failed to get project:", error);
		return null;
	}
}

/**
 * Update a project
 */
export async function updateProject(
	projectId: string,
	updates: ProjectUpdate,
): Promise<Project | null> {
	try {
		const { data, error } = await supabase
			.from("projects")
			.update(updates)
			.eq("id", projectId)
			.select()
			.maybeSingle();

		if (error) {
			logger.error("Error updating project:", error);
			return null;
		}

		logger.log("✅ Project updated:", data?.name);
		return data ?? null;
	} catch (error) {
		logger.error("Failed to update project:", error);
		return null;
	}
}

/**
 * Update project's last accessed timestamp
 */
export async function updateLastAccessed(projectId: string): Promise<boolean> {
	try {
		const { error } = await supabase
			.from("projects")
			.update({ last_accessed_at: new Date().toISOString() })
			.eq("id", projectId);

		if (error) {
			logger.error("Error updating last accessed:", error);
			return false;
		}

		return true;
	} catch (error) {
		logger.error("Failed to update last accessed:", error);
		return false;
	}
}

/**
 * Delete a project — userId is required to prevent deleting another user's project.
 */
export async function deleteProject(
	projectId: string,
	userId: string,
): Promise<boolean> {
	try {
		const { error } = await supabase
			.from("projects")
			.delete()
			.eq("id", projectId)
			.eq("user_id", userId);

		if (error) {
			logger.error("Error deleting project:", error);
			return false;
		}

		logger.log("✅ Project deleted");
		return true;
	} catch (error) {
		logger.error("Failed to delete project:", error);
		return false;
	}
}

/**
 * Get project count for a user
 */
export async function getProjectCount(userId: string): Promise<number> {
	try {
		const { count, error } = await supabase
			.from("projects")
			.select("*", { count: "exact", head: true })
			.eq("user_id", userId);

		if (error) {
			logger.error("Error getting project count:", error);
			return 0;
		}

		return count || 0;
	} catch (error) {
		logger.error("Failed to get project count:", error);
		return 0;
	}
}
