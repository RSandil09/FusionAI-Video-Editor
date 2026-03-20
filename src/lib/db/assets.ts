/**
 * Asset Database Operations
 * CRUD operations for assets table (uploaded files)
 */

import { supabase } from "./supabase";
import type { Database } from "./database.types";

type Asset = Database["public"]["Tables"]["assets"]["Row"];
type AssetInsert = Database["public"]["Tables"]["assets"]["Insert"];

/**
 * Create asset record after R2 upload
 */
export async function createAsset(data: AssetInsert): Promise<Asset | null> {
	try {
		const { data: asset, error } = await supabase
			.from("assets")
			.insert(data)
			.select()
			.single();

		if (error) {
			console.error("Error creating asset:", error);
			return null;
		}

		console.log("✅ Asset saved to database:", asset.file_name);
		return asset;
	} catch (error) {
		console.error("Failed to create asset:", error);
		return null;
	}
}

/**
 * Get all assets for a user
 */
export async function getAssets(userId: string): Promise<Asset[]> {
	try {
		const { data, error } = await supabase
			.from("assets")
			.select("*")
			.eq("user_id", userId)
			.order("uploaded_at", { ascending: false });

		if (error) {
			console.error("Error fetching assets:", error);
			return [];
		}

		return data || [];
	} catch (error) {
		console.error("Failed to get assets:", error);
		return [];
	}
}

/**
 * Get assets for a specific project
 */
export async function getProjectAssets(projectId: string): Promise<Asset[]> {
	try {
		const { data, error } = await supabase
			.from("assets")
			.select("*")
			.eq("project_id", projectId)
			.order("uploaded_at", { ascending: false });

		if (error) {
			console.error("Error fetching project assets:", error);
			return [];
		}

		return data || [];
	} catch (error) {
		console.error("Failed to get project assets:", error);
		return [];
	}
}

/**
 * Link asset to a project
 */
export async function linkAssetToProject(
	assetId: string,
	projectId: string,
): Promise<Asset | null> {
	try {
		const { data, error } = await supabase
			.from("assets")
			.update({ project_id: projectId })
			.eq("id", assetId)
			.select()
			.single();

		if (error) {
			console.error("Error linking asset to project:", error);
			return null;
		}

		return data;
	} catch (error) {
		console.error("Failed to link asset:", error);
		return null;
	}
}

/**
 * Delete asset
 */
export async function deleteAsset(assetId: string): Promise<boolean> {
	try {
		const { error } = await supabase.from("assets").delete().eq("id", assetId);

		if (error) {
			console.error("Error deleting asset:", error);
			return false;
		}

		return true;
	} catch (error) {
		console.error("Failed to delete asset:", error);
		return false;
	}
}

/**
 * Get file type from content type
 */
export function getFileType(contentType: string): string {
	if (contentType.startsWith("video/")) return "video";
	if (contentType.startsWith("image/")) return "image";
	if (contentType.startsWith("audio/")) return "audio";
	return "other";
}
