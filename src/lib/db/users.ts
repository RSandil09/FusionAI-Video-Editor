/**
 * User Database Operations
 * CRUD operations for users table
 */

import { supabase } from "./supabase";
import type { Database } from "./database.types";

type User = Database["public"]["Tables"]["users"]["Row"];
type UserInsert = Database["public"]["Tables"]["users"]["Insert"];

/**
 * Upsert user (create or update)
 * Called when user logs in via Firebase
 */
export async function upsertUser(data: UserInsert): Promise<User | null> {
	try {
		// Check if Supabase is configured
		if (
			!process.env.NEXT_PUBLIC_SUPABASE_URL ||
			!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
		) {
			console.warn("⚠️ Supabase not configured - skipping user sync");
			return null;
		}

		const { data: user, error } = await supabase
			.from("users")
			.upsert(
				{
					id: data.id,
					email: data.email,
					display_name: data.display_name || null,
					avatar_url: data.avatar_url || null,
				},
				{
					onConflict: "id",
				},
			)
			.select()
			.maybeSingle();

		if (error) {
			console.error("Error upserting user:", error.message || error);
			console.warn("💡 Make sure you've run the schema.sql in Supabase");
			return null;
		}

		console.log("✅ User synced to database:", user?.email);
		return user ?? null;
	} catch (error) {
		console.error("Failed to upsert user:", error);
		console.warn("💡 Check if Supabase tables exist (run schema.sql)");
		return null;
	}
}

/**
 * Get user by Firebase UID
 */
export async function getUser(userId: string): Promise<User | null> {
	try {
		const { data, error } = await supabase
			.from("users")
			.select("*")
			.eq("id", userId)
			.maybeSingle();

		if (error) {
			console.error("Error fetching user:", error);
			return null;
		}

		return data;
	} catch (error) {
		console.error("Failed to get user:", error);
		return null;
	}
}

/**
 * Update user profile
 */
export async function updateUser(
	userId: string,
	updates: Partial<UserInsert>,
): Promise<User | null> {
	try {
		const { data, error } = await supabase
			.from("users")
			.update(updates)
			.eq("id", userId)
			.select()
			.maybeSingle();

		if (error) {
			console.error("Error updating user:", error);
			return null;
		}

		return data;
	} catch (error) {
		console.error("Failed to update user:", error);
		return null;
	}
}
