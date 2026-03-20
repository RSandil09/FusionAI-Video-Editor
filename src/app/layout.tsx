import { Inter, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { baseUrl, createMetadata } from "@/utils/metadata";
import { QueryProvider } from "@/components/query-provider";
import {
	StoreInitializer,
	BackgroundUploadRunner,
} from "@/components/store-initializer";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";

import "./globals.css";

const inter = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	display: "swap",
});

const spaceGrotesk = Space_Grotesk({
	variable: "--font-space-grotesk",
	subsets: ["latin"],
	display: "swap",
});

import { BRANDING } from "@/config/branding";

export const metadata = createMetadata({
	title: {
		template: `%s | ${BRANDING.name}`,
		default: BRANDING.name,
	},
	description: BRANDING.description,
	metadataBase: baseUrl,
});

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${inter.variable} ${spaceGrotesk.variable} antialiased dark font-sans bg-muted`}
			>
				<AuthProvider>
					<QueryProvider>
						<OnboardingProvider>
							{children}
							<StoreInitializer />
							<BackgroundUploadRunner />
							<Toaster />
						</OnboardingProvider>
					</QueryProvider>
				</AuthProvider>
				<Analytics />
			</body>
		</html>
	);
}
// Forced rebuild for favicon update
