"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import { getIdToken } from "@/lib/auth/client";
import { toast } from "sonner";
import {
	User,
	Share2,
	Bell,
	Download,
	Palette,
	Youtube,
	Instagram,
	Check,
	Loader2,
	ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";

type TabId =
	| "profile"
	| "connections"
	| "notifications"
	| "export"
	| "appearance";

interface UserSettings {
	theme: string;
	email_notifications: boolean;
	render_complete_notifications: boolean;
	default_export_quality: string;
	default_export_format: string;
}

interface SocialConnection {
	provider: string;
	provider_username: string | null;
	connected_at: string;
}

function SettingsContent() {
	const { user } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const tabParam = searchParams.get("tab") as TabId | null;
	const [activeTab, setActiveTab] = useState<TabId>(tabParam || "profile");
	const [settings, setSettings] = useState<UserSettings | null>(null);
	const [connections, setConnections] = useState<SocialConnection[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [disconnecting, setDisconnecting] = useState<string | null>(null);

	useEffect(() => {
		if (
			tabParam &&
			[
				"profile",
				"connections",
				"notifications",
				"export",
				"appearance",
			].includes(tabParam)
		) {
			setActiveTab(tabParam);
		}
	}, [tabParam]);

	useEffect(() => {
		const error = searchParams.get("error");
		const youtube = searchParams.get("youtube");
		if (error) toast.error(`Connection failed: ${error}`);
		if (youtube === "connected")
			toast.success("YouTube connected successfully");
	}, [searchParams]);

	useEffect(() => {
		if (!user) return;
		loadData();
	}, [user]);

	async function loadData() {
		if (!user) return;
		const token = await getIdToken();
		if (!token) return;

		try {
			const [settingsRes, connectionsRes] = await Promise.all([
				fetch("/api/settings", {
					headers: { Authorization: `Bearer ${token}` },
				}),
				fetch("/api/social-connections", {
					headers: { Authorization: `Bearer ${token}` },
				}),
			]);
			if (settingsRes.ok) setSettings(await settingsRes.json());
			if (connectionsRes.ok) setConnections(await connectionsRes.json());
		} catch (err) {
			console.error(err);
			toast.error("Failed to load settings");
		} finally {
			setLoading(false);
		}
	}

	async function updateSettings(updates: Partial<UserSettings>) {
		if (!user) return;
		const token = await getIdToken();
		if (!token) return;
		setSaving(true);
		try {
			const res = await fetch("/api/settings", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(updates),
			});
			if (res.ok) {
				const data = await res.json();
				setSettings((s) => (s ? { ...s, ...data } : data));
				toast.success("Settings saved");
			} else toast.error("Failed to save");
		} catch {
			toast.error("Failed to save");
		} finally {
			setSaving(false);
		}
	}

	async function disconnectProvider(provider: string) {
		if (!user) return;
		const token = await getIdToken();
		if (!token) return;
		setDisconnecting(provider);
		try {
			const res = await fetch(`/api/social-connections/${provider}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				setConnections((c) => c.filter((x) => x.provider !== provider));
				toast.success(`${provider} disconnected`);
			} else toast.error("Failed to disconnect");
		} catch {
			toast.error("Failed to disconnect");
		} finally {
			setDisconnecting(null);
		}
	}

	const tabs = [
		{ id: "profile" as const, label: "Profile", icon: User },
		{ id: "connections" as const, label: "Social Connections", icon: Share2 },
		{ id: "notifications" as const, label: "Notifications", icon: Bell },
		{ id: "export" as const, label: "Export Defaults", icon: Download },
		{ id: "appearance" as const, label: "Appearance", icon: Palette },
	];

	const isConnected = (p: string) => connections.some((c) => c.provider === p);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background font-sans">
			<DashboardNavbar />

			<main className="container mx-auto px-6 py-10 max-w-4xl">
				<div className="flex items-center gap-4 mb-8">
					<Link href="/dashboard">
						<Button variant="ghost" size="icon">
							<ArrowLeft className="h-4 w-4" />
						</Button>
					</Link>
					<div>
						<h1 className="text-2xl font-bold tracking-tight">Settings</h1>
						<p className="text-muted-foreground text-sm">
							Manage your account and preferences
						</p>
					</div>
				</div>

				<div className="flex flex-col md:flex-row gap-8">
					<nav className="flex md:flex-col gap-1 min-w-[200px]">
						{tabs.map(({ id, label, icon: Icon }) => (
							<button
								key={id}
								onClick={() => setActiveTab(id)}
								className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-left transition-colors ${
									activeTab === id
										? "bg-primary text-primary-foreground"
										: "hover:bg-muted"
								}`}
							>
								<Icon className="h-4 w-4" />
								{label}
							</button>
						))}
					</nav>

					<div className="flex-1 space-y-6">
						{activeTab === "profile" && (
							<section className="space-y-4">
								<h2 className="text-lg font-semibold">Profile</h2>
								<div className="p-4 rounded-xl border border-border bg-card space-y-2">
									<p className="text-sm text-muted-foreground">Email</p>
									<p className="font-medium">{user?.email}</p>
									<p className="text-sm text-muted-foreground">Display name</p>
									<p className="font-medium">
										{user?.displayName || "Not set"}
									</p>
									<p className="text-xs text-muted-foreground mt-2">
										Profile updates are managed through Firebase Auth.
									</p>
								</div>
							</section>
						)}

						{activeTab === "connections" && (
							<section className="space-y-4">
								<h2 className="text-lg font-semibold">Social Connections</h2>
								<p className="text-sm text-muted-foreground">
									Connect your accounts to share videos directly to YouTube,
									Instagram, and TikTok.
								</p>
								<div className="space-y-3">
									{[
										{
											provider: "youtube",
											name: "YouTube",
											icon: Youtube,
											color: "text-red-600",
										},
										{
											provider: "instagram",
											name: "Instagram",
											icon: Instagram,
											color: "text-pink-500",
										},
										{
											provider: "tiktok",
											name: "TikTok",
											icon: () => <span className="font-bold text-xs">TT</span>,
											color: "text-foreground",
										},
									].map(({ provider, name, icon: Icon, color }) => (
										<div
											key={provider}
											className="flex items-center justify-between p-4 rounded-xl border border-border bg-card"
										>
											<div className="flex items-center gap-3">
												<div
													className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${color}`}
												>
													{provider === "tiktok" ? (
														<span className="text-[10px] font-bold bg-black text-white px-1.5 py-0.5 rounded">
															TT
														</span>
													) : (
														<Icon className="h-5 w-5" />
													)}
												</div>
												<div>
													<p className="font-medium">{name}</p>
													{isConnected(provider) && (
														<p className="text-xs text-muted-foreground">
															{connections.find((c) => c.provider === provider)
																?.provider_username || "Connected"}
														</p>
													)}
												</div>
											</div>
											{isConnected(provider) ? (
												<Button
													variant="outline"
													size="sm"
													onClick={() => disconnectProvider(provider)}
													disabled={disconnecting === provider}
												>
													{disconnecting === provider ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														"Disconnect"
													)}
												</Button>
											) : (
												<Button
													size="sm"
													onClick={() =>
														(window.location.href = `/api/social-connections/${provider}/connect`)
													}
												>
													Connect
												</Button>
											)}
										</div>
									))}
								</div>
							</section>
						)}

						{activeTab === "notifications" && settings && (
							<section className="space-y-4">
								<h2 className="text-lg font-semibold">Notifications</h2>
								<div className="space-y-4">
									<div className="flex items-center justify-between p-4 rounded-xl border border-border">
										<div>
											<Label>Email notifications</Label>
											<p className="text-sm text-muted-foreground">
												Receive updates via email
											</p>
										</div>
										<Switch
											checked={settings.email_notifications}
											onCheckedChange={(v) =>
												updateSettings({ email_notifications: v })
											}
										/>
									</div>
									<div className="flex items-center justify-between p-4 rounded-xl border border-border">
										<div>
											<Label>Render complete</Label>
											<p className="text-sm text-muted-foreground">
												Notify when video export finishes
											</p>
										</div>
										<Switch
											checked={settings.render_complete_notifications}
											onCheckedChange={(v) =>
												updateSettings({ render_complete_notifications: v })
											}
										/>
									</div>
								</div>
							</section>
						)}

						{activeTab === "export" && settings && (
							<section className="space-y-4">
								<h2 className="text-lg font-semibold">Export Defaults</h2>
								<div className="space-y-4">
									<div className="space-y-2">
										<Label>Default quality</Label>
										<select
											value={settings.default_export_quality}
											onChange={(e) =>
												updateSettings({
													default_export_quality: e.target.value,
												})
											}
											className="w-full px-4 py-2 rounded-lg border border-input bg-background"
										>
											<option value="low">Low</option>
											<option value="medium">Medium</option>
											<option value="high">High</option>
										</select>
									</div>
									<div className="space-y-2">
										<Label>Default format</Label>
										<select
											value={settings.default_export_format}
											onChange={(e) =>
												updateSettings({
													default_export_format: e.target.value,
												})
											}
											className="w-full px-4 py-2 rounded-lg border border-input bg-background"
										>
											<option value="mp4">MP4</option>
										</select>
									</div>
								</div>
							</section>
						)}

						{activeTab === "appearance" && settings && (
							<section className="space-y-4">
								<h2 className="text-lg font-semibold">Appearance</h2>
								<div className="space-y-2">
									<Label>Theme</Label>
									<select
										value={settings.theme}
										onChange={(e) => updateSettings({ theme: e.target.value })}
										className="w-full px-4 py-2 rounded-lg border border-input bg-background"
									>
										<option value="system">System</option>
										<option value="light">Light</option>
										<option value="dark">Dark</option>
									</select>
									<p className="text-sm text-muted-foreground">
										Choose how the app looks
									</p>
								</div>
							</section>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}

export default function SettingsPage() {
	return (
		<ProtectedRoute>
			<SettingsContent />
		</ProtectedRoute>
	);
}
