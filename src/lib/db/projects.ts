/**
 * Project Database Operations
 * CRUD operations for projects table
 */

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
		console.log("🔵 Creating project with data:", {
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
			.single();

		if (error) {
			console.error("❌ Supabase error creating project:");
			console.error("Error code:", error.code);
			console.error("Error message:", error.message);
			console.error("Error details:", error.details);
			console.error("Error hint:", error.hint);
			console.error("Full error:", JSON.stringify(error, null, 2));
			return null;
		}

		console.log("✅ Project created successfully:", project.id);
		return project;
	} catch (error) {
		console.error("💥 Unexpected error creating project:");
		console.error("Error type:", typeof error);
		console.error("Error:", error);
		if (error instanceof Error) {
			console.error("Error name:", error.name);
			console.error("Error message:", error.message);
			console.error("Error stack:", error.stack);
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

		// Apply limit
		if (options?.limit) {
			query = query.limit(options.limit);
		}

		const { data, error } = await query;

		if (error) {
			console.error("Error fetching projects:", error);
			return [];
		}

		return data || [];
	} catch (error) {
		console.error("Failed to get projects:", error);
		return [];
	}
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
	try {
		const { data, error } = await supabase
			.from("projects")
			.select("*")
			.eq("id", projectId)
			.single();

		if (error) {
			console.error("Error fetching project:", error);
			return null;
		}

		return data;
	} catch (error) {
		console.error("Failed to get project:", error);
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
			.single();

		if (error) {
			console.error("Error updating project:", error);
			return null;
		}

		console.log("✅ Project updated:", data.name);
		return data;
	} catch (error) {
		console.error("Failed to update project:", error);
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
			console.error("Error updating last accessed:", error);
			return false;
		}

		return true;
	} catch (error) {
		console.error("Failed to update last accessed:", error);
		return false;
	}
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<boolean> {
	try {
		const { error } = await supabase
			.from("projects")
			.delete()
			.eq("id", projectId);

		if (error) {
			console.error("Error deleting project:", error);
			return false;
		}

		console.log("✅ Project deleted");
		return true;
	} catch (error) {
		console.error("Failed to delete project:", error);
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
			console.error("Error getting project count:", error);
			return 0;
		}

		return count || 0;
	} catch (error) {
		console.error("Failed to get project count:", error);
		return 0;
	}
}
