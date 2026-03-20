/**
 * Supabase Client Configuration with TypeScript Workaround
 * Note: Using type assertion to bypass TypeScript inference issues
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		"Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
	);
}

/**
 * Supabase client with Database typing
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
	},
});

/**
 * Get Supabase client with custom JWT (Firebase token)
 */
export function getSupabaseWithAuth(firebaseToken: string) {
	return createClient<Database>(supabaseUrl, supabaseAnonKey, {
		global: {
			headers: {
				Authorization: `Bearer ${firebaseToken}`,
			},
		},
		auth: {
			persistSession: false,
		},
	});
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
	return !!(supabaseUrl && supabaseAnonKey);
}
