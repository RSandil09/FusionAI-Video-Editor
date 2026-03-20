/**
 * User Social Connections Database Operations
 */

import { supabase } from "./supabase";
import type { Database } from "./database.types";

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
		console.error("Error fetching social connections:", error);
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
		.single();

	if (error && error.code !== "PGRST116") {
		console.error("Error fetching social connection:", error);
		return null;
	}
	return data;
}

export async function upsertSocialConnection(
	data: SocialConnectionInsert,
): Promise<SocialConnection | null> {
	const { data: conn, error } = await supabase
		.from("user_social_connections")
		.upsert(
			{
				...data,
				is_active: true,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: "user_id,provider" },
		)
		.select()
		.single();

	if (error) {
		console.error("Error upserting social connection:", error);
		return null;
	}
	return conn;
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
		console.error("Error disconnecting social:", error);
		return false;
	}
	return true;
}
