import { Inter, Space_Grotesk, Bricolage_Grotesque } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { ThemeProvider } from "@/components/theme-provider";
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

const bricolageGrotesque = Bricolage_Grotesque({
	variable: "--font-bricolage",
	subsets: ["latin"],
	display: "swap",
	weight: ["400", "600", "700", "800"],
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
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* Early connection hints — browser starts TLS handshake to the R2
				    CDN domain before any video element requests it, saving 100-300ms
				    on first video load. dns-prefetch is a lighter fallback for browsers
				    that don't support preconnect. */}
				<link rel="preconnect" href="https://pub-760dc7f0a82e481197568d0a306385c6.r2.dev" crossOrigin="anonymous" />
				<link rel="dns-prefetch" href="https://pub-760dc7f0a82e481197568d0a306385c6.r2.dev" />
				{/*
				  Inline script runs before React hydrates — reads localStorage and
				  applies the "dark" class to <html> immediately, preventing any
				  flash of the wrong theme on page load.
				*/}
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){try{var t=localStorage.getItem('fusion-theme');var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches)||(!t);if(d)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();`,
					}}
				/>
			</head>
			<body
				className={`${inter.variable} ${spaceGrotesk.variable} ${bricolageGrotesque.variable} antialiased font-sans bg-background`}
			>
				<ThemeProvider>
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
				</ThemeProvider>
				<Analytics />
			</body>
		</html>
	);
}
// Forced rebuild for favicon update
