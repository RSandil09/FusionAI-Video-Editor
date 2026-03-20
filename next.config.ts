import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	reactStrictMode: false,
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
				],
			},
		];
	},
	serverExternalPackages: [
		"@remotion/bundler",
		"@remotion/renderer",
		"esbuild",
		"sharp",
	],
	webpack: (config, { isServer }) => {
		// Disable HMR for @designcombo packages that have incompatible HMR code
		if (!isServer) {
			config.module = config.module || {};
			config.module.rules = config.module.rules || [];

			config.module.rules.push({
				test: /node_modules\/@designcombo\/(timeline|state|events|animations|transitions)/,
				parser: {
					javascript: {
						// Disable HMR acceptance
						importMeta: false,
					},
				},
			});
		}
		return config;
	},
};

export default nextConfig;
