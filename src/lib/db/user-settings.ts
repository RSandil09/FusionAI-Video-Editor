/**
 * User Settings Database Operations
 */

import { supabase } from "./supabase";
import type { Database } from "./database.types";

type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];
type UserSettingsInsert =
	Database["public"]["Tables"]["user_settings"]["Insert"];
type UserSettingsUpdate =
	Database["public"]["Tables"]["user_settings"]["Update"];

export async function getUserSettings(
	userId: string,
): Promise<UserSettings | null> {
	const { data, error } = await supabase
		.from("user_settings")
		.select("*")
		.eq("user_id", userId)
		.maybeSingle();

	if (error) {
		console.error("Error fetching user settings:", error);
		return null;
	}
	return data;
}

export async function upsertUserSettings(
	userId: string,
	updates: Partial<UserSettingsUpdate>,
): Promise<UserSettings | null> {
	const { data, error } = await supabase
		.from("user_settings")
		.upsert(
			{ user_id: userId, ...updates, updated_at: new Date().toISOString() },
			{ onConflict: "user_id" },
		)
		.select()
		.maybeSingle();

	if (error) {
		console.error("Error upserting user settings:", error);
		return null;
	}
	return data;
}

export async function completeOnboarding(
	userId: string,
	skipped = false,
): Promise<boolean> {
	const result = await upsertUserSettings(userId, {
		onboarding_completed: true,
		onboarding_skipped: skipped,
	});
	return !!result;
}
