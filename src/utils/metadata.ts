import type { Metadata } from "next/types";

const APP_URL =
	process.env.NEXT_PUBLIC_APP_URL ??
	(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export function createMetadata(override: Metadata): Metadata {
	return {
		...override,
		openGraph: {
			title: override.title ?? undefined,
			description: override.description ?? undefined,
			url: APP_URL,
			images: "/FusionAI.svg",
			siteName: "Fusion Video Editor",
			...override.openGraph,
		},
		twitter: {
			card: "summary_large_image",
			title: override.title ?? undefined,
			description: override.description ?? undefined,
			images: "/FusionAI.svg",
			...override.twitter,
		},
	};
}

export const baseUrl = new URL(APP_URL);
