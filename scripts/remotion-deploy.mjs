/**
 * Loads .env.local (which the Remotion CLI doesn't read automatically),
 * clears the Remotion webpack bundle cache so changes to VideoComposition.tsx
 * are always picked up, then deploys a fresh Lambda site bundle.
 *
 * Usage:  node scripts/remotion-deploy.mjs
 */

import { readFileSync, rmSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { resolve, join } from "path";
import { fileURLToPath } from "url";

// ── Resolve project root (one level above /scripts/) ─────────────────────────
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Load .env.local ───────────────────────────────────────────────────────────
const envPath = join(ROOT, ".env.local");
try {
	const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		// Strip surrounding quotes from value
		const raw = trimmed.slice(eqIdx + 1).trim();
		const val = raw.replace(/^["']|["']$/g, "");
		// Don't overwrite vars that are already set in the shell environment
		if (key && !(key in process.env)) {
			process.env[key] = val;
		}
	}
	console.log("✅  Loaded .env.local");
} catch {
	console.warn("⚠️   Could not read .env.local — using shell environment only");
}

// ── Map REMOTION_AWS_* → AWS_* (Remotion CLI accepts either prefix) ───────────
if (!process.env.AWS_ACCESS_KEY_ID && process.env.REMOTION_AWS_ACCESS_KEY_ID) {
	process.env.AWS_ACCESS_KEY_ID = process.env.REMOTION_AWS_ACCESS_KEY_ID;
}
if (!process.env.AWS_SECRET_ACCESS_KEY && process.env.REMOTION_AWS_SECRET_ACCESS_KEY) {
	process.env.AWS_SECRET_ACCESS_KEY = process.env.REMOTION_AWS_SECRET_ACCESS_KEY;
}
if (!process.env.AWS_REGION && process.env.REMOTION_AWS_REGION) {
	process.env.AWS_REGION = process.env.REMOTION_AWS_REGION;
}

// ── Clear the Remotion webpack bundle cache ───────────────────────────────────
// Remotion uses webpack 5 with a persistent file-system cache stored here.
// If this cache is stale it re-uploads OLD compiled code even when source files
// have changed — causing "ut[item.kind] is not a function" in Lambda renders.
const cacheDir = join(ROOT, "node_modules", ".cache", "webpack");
if (existsSync(cacheDir)) {
	try {
		rmSync(cacheDir, { recursive: true, force: true });
		console.log("🗑️   Cleared webpack bundle cache:", cacheDir);
	} catch (err) {
		console.warn("⚠️   Could not clear webpack cache (non-fatal):", err.message);
	}
} else {
	console.log("ℹ️   No webpack cache found — nothing to clear");
}

// ── Deploy the Remotion Lambda site ──────────────────────────────────────────
console.log("\n🚀  Deploying Remotion Lambda site (fresh bundle)…\n");

const result = spawnSync(
	"npx",
	[
		"remotion",
		"lambda",
		"sites",
		"create",
		"src/remotion/index.tsx",
		"--site-name=video-editor",
	],
	{
		stdio: "inherit",
		shell: true,
		env: process.env,
		cwd: ROOT,
	},
);

if (result.error) {
	console.error("❌  Failed to spawn process:", result.error.message);
	process.exit(1);
}

process.exit(result.status ?? 0);
