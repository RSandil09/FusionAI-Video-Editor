/**
 * User Social Connections Database Operations
 */

import { logger } from "@/lib/logger";
import { supabaseAdmin } from "./supabase-admin";
import type { Database } from "./database.types";

// Use admin client throughout — these functions run server-side only
// (OAuth callbacks, API routes) and need to bypass RLS.
const supabase = supabaseAdmin;

type SocialConnection =
	Database["public"]["Tables"]["user_social_connections"]["Row"];
type SocialConnectionInsert =
	Database["public"]["Tables"]["user_social_connections"]["Insert"];

export type SocialProvider = "youtube" | "instagram" | "tiktok";

export async function getSocialConnections(
	userId: string,
): Promise<SocialConnection[]> {
	const { data, error } = await supabase
		.from("user_social_connections")
		.select("*")
		.eq("user_id", userId)
		.eq("is_active", true)
		.order("connected_at", { ascending: false });

	if (error) {
		logger.error("Error fetching social connections:", error);
		return [];
	}
	return data || [];
}

export async function getSocialConnection(
	userId: string,
	provider: SocialProvider,
): Promise<SocialConnection | null> {
	const { data, error } = await supabase
		.from("user_social_connections")
		.select("*")
		.eq("user_id", userId)
		.eq("provider", provider)
		.eq("is_active", true)
		.maybeSingle();

	if (error) {
		logger.error("Error fetching social connection:", error);
		return null;
	}
	return data;
}

export async function upsertSocialConnection(
	data: SocialConnectionInsert,
): Promise<{ success: true } | { success: false; error: string }> {
	const { error } = await supabase
		.from("user_social_connections")
		.upsert(
			{
				...data,
				is_active: true,
				connected_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			{ onConflict: "user_id,provider" },
		);

	if (error) {
		logger.error("Error upserting social connection:", error);
		return { success: false, error: `${error.code}: ${error.message}` };
	}
	return { success: true };
}

export async function disconnectSocial(
	userId: string,
	provider: SocialProvider,
): Promise<boolean> {
	const { error } = await supabase
		.from("user_social_connections")
		.update({ is_active: false, updated_at: new Date().toISOString() })
		.eq("user_id", userId)
		.eq("provider", provider);

	if (error) {
		logger.error("Error disconnecting social:", error);
		return false;
	}
	return true;
}
