/**
 * Server-only Supabase admin client
 * Uses the service_role key (bypasses ALL Row Level Security).
 * NEVER import this file in client components.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
	throw new Error("❌ NEXT_PUBLIC_SUPABASE_URL is not set in .env.local");
}

// Determine which key to use and warn if falling back
let activeKey: string;
if (serviceRoleKey && serviceRoleKey.trim().length > 0) {
	activeKey = serviceRoleKey.trim();
	console.log("✅ supabase-admin: using SUPABASE_SERVICE_ROLE_KEY");
} else if (anonKey && anonKey.trim().length > 0) {
	activeKey = anonKey.trim();
	console.error(
		"⚠️ supabase-admin: SUPABASE_SERVICE_ROLE_KEY is not set — " +
			"falling back to anon key. Server-side writes (save/render) will " +
			"fail if the anon role lacks UPDATE/INSERT grants.\n" +
			"  → Go to supabase.com → Project Settings → API → copy the 'service_role' secret key\n" +
			"  → Add SUPABASE_SERVICE_ROLE_KEY=<key> to .env.local and restart npm run dev",
	);
} else {
	throw new Error(
		"❌ Neither SUPABASE_SERVICE_ROLE_KEY nor NEXT_PUBLIC_SUPABASE_ANON_KEY is set in .env.local",
	);
}

/**
 * Server-side Supabase client.
 * Uses service_role key when available, anon key as fallback.
 */
export const supabaseAdmin = createClient<Database>(supabaseUrl, activeKey, {
	auth: {
		persistSession: false,
		autoRefreshToken: false,
	},
});
