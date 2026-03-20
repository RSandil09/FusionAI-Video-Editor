"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { getIdToken } from "@/lib/auth/client";
import { OnboardingModal } from "./onboarding-modal";

async function fetchWithAuth(url: string, token: string) {
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
	});
	return res;
}

export function OnboardingProvider({
	children,
}: { children: React.ReactNode }) {
	const { user } = useAuth();
	const [showOnboarding, setShowOnboarding] = useState(false);
	const [connections, setConnections] = useState<{ provider: string }[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!user) {
			setLoading(false);
			return;
		}

		let cancelled = false;

		async function checkOnboarding() {
			try {
				const token = await getIdToken();
				if (!token || cancelled) return;

				const [settingsRes, connectionsRes] = await Promise.all([
					fetchWithAuth("/api/settings", token),
					fetchWithAuth("/api/social-connections", token),
				]);

				if (cancelled) return;

				const settings = settingsRes.ok ? await settingsRes.json() : null;
				const conns = connectionsRes.ok ? await connectionsRes.json() : [];

				setConnections(conns);

				const needsOnboarding =
					settings &&
					!settings.onboarding_completed &&
					!settings.onboarding_skipped;

				setShowOnboarding(!!needsOnboarding);
			} catch (err) {
				console.error("Onboarding check failed:", err);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		checkOnboarding();
		return () => {
			cancelled = true;
		};
	}, [user]);

	const handleComplete = async (skipped: boolean) => {
		if (!user) return;
		const token = await getIdToken();
		if (!token) return;

		await fetch("/api/settings", {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				onboarding_completed: true,
				onboarding_skipped: skipped,
			}),
		});
		setShowOnboarding(false);
	};

	const handleConnect = (provider: "youtube" | "instagram" | "tiktok") => {
		window.location.href = `/api/social-connections/${provider}/connect`;
	};

	return (
		<>
			{children}
			{!loading && showOnboarding && (
				<OnboardingModal
					open={showOnboarding}
					onComplete={handleComplete}
					onConnect={handleConnect}
					connections={connections}
				/>
			)}
		</>
	);
}
