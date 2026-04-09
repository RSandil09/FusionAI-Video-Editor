/**
 * Render Database Operations
 * CRUD operations for renders table
 */

import { supabase } from "./supabase";
import { supabaseAdmin } from "./supabase-admin";
import type { Database } from "./database.types";

type Render = Database["public"]["Tables"]["renders"]["Row"];
type RenderInsert = Database["public"]["Tables"]["renders"]["Insert"];
type RenderUpdate = Database["public"]["Tables"]["renders"]["Update"];

/**
 * Create a new render job
 */
export async function createRender(data: RenderInsert): Promise<Render | null> {
	try {
		console.log("🎬 Creating render job:", {
			user_id: data.user_id,
			project_id: data.project_id,
			status: data.status,
		});

		const { data: render, error } = await supabaseAdmin
			.from("renders")
			.insert({
				user_id: data.user_id,
				project_id: data.project_id,
				status: data.status || "pending",
				progress: 0,
				started_at: new Date().toISOString(),
			})
			.select()
			.maybeSingle();

		if (error) {
			console.error("❌ Error creating render:", error);
			return null;
		}

		console.log("✅ Render job created:", render.id);
		return render;
	} catch (error) {
		console.error("💥 Failed to create render:", error);
		return null;
	}
}

/**
 * Get a render by ID
 */
export async function getRender(renderId: string): Promise<Render | null> {
	try {
		const { data, error } = await supabase
			.from("renders")
			.select("*")
			.eq("id", renderId)
			.maybeSingle();

		if (error) {
			console.error("Error fetching render:", error);
			return null;
		}

		return data;
	} catch (error) {
		console.error("Failed to get render:", error);
		return null;
	}
}

/**
 * Update a render's status and progress
 */
export async function updateRenderStatus(
	renderId: string,
	updates: RenderUpdate,
): Promise<Render | null> {
	try {
		const updateData: RenderUpdate = { ...updates };

		// Set completed_at when status is completed or failed
		if (updates.status === "completed" || updates.status === "failed") {
			updateData.completed_at = new Date().toISOString();
		}

		const { data, error } = await supabaseAdmin
			.from("renders")
			.update(updateData)
			.eq("id", renderId)
			.select()
			.maybeSingle();

		if (error) {
			console.error("Error updating render:", error);
			return null;
		}

		return data;
	} catch (error) {
		console.error("Failed to update render:", error);
		return null;
	}
}

/**
 * Get all renders for a project
 */
export async function getProjectRenders(projectId: string): Promise<Render[]> {
	try {
		const { data, error } = await supabase
			.from("renders")
			.select("*")
			.eq("project_id", projectId)
			.order("created_at", { ascending: false });

		if (error) {
			console.error("Error fetching project renders:", error);
			return [];
		}

		return data || [];
	} catch (error) {
		console.error("Failed to get project renders:", error);
		return [];
	}
}

/**
 * Get all renders for a user
 */
export async function getUserRenders(
	userId: string,
	options?: {
		limit?: number;
		status?: string;
	},
): Promise<Render[]> {
	try {
		let query = supabase.from("renders").select("*").eq("user_id", userId);

		if (options?.status) {
			query = query.eq("status", options.status);
		}

		query = query.order("created_at", { ascending: false });

		if (options?.limit) {
			query = query.limit(options.limit);
		}

		const { data, error } = await query;

		if (error) {
			console.error("Error fetching user renders:", error);
			return [];
		}

		return data || [];
	} catch (error) {
		console.error("Failed to get user renders:", error);
		return [];
	}
}

/**
 * Delete a render
 */
export async function deleteRender(renderId: string): Promise<boolean> {
	try {
		const { error } = await supabase
			.from("renders")
			.delete()
			.eq("id", renderId);

		if (error) {
			console.error("Error deleting render:", error);
			return false;
		}

		console.log("✅ Render deleted:", renderId);
		return true;
	} catch (error) {
		console.error("Failed to delete render:", error);
		return false;
	}
}
