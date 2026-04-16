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
	Bell,
	Download,
	Palette,
	Loader2,
	ArrowLeft,
	Check,
	Unplug,
	Zap,
	Moon,
	Sun,
	Monitor,
	Video,
	Mail,
	CheckCircle2,
	AlertCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
	useTheme,
	useApplyRemoteTheme,
	type Theme,
} from "@/components/theme-provider";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Platform definitions ─────────────────────────────────────────────────────

const platforms = [
	{
		id: "youtube",
		name: "YouTube",
		description: "Upload & publish videos directly to your channel",
		ready: true,
		icon: (
			<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
				<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
			</svg>
		),
		iconBg: "bg-[#FF0000]/10",
		iconColor: "text-[#FF0000]",
		accentColor: "#FF0000",
		badge: null,
	},
	{
		id: "instagram",
		name: "Instagram",
		description: "Share Reels & videos to your Instagram profile",
		ready: true,
		icon: (
			<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
				<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
			</svg>
		),
		iconBg: "bg-[#E1306C]/10",
		iconColor: "text-[#E1306C]",
		accentColor: "#E1306C",
		badge: null,
	},
	{
		id: "tiktok",
		name: "TikTok",
		description: "Post videos directly to your TikTok account",
		ready: true,
		icon: (
			<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
				<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
			</svg>
		),
		iconBg: "bg-white/5",
		iconColor: "text-white",
		accentColor: "#ffffff",
		badge: null,
	},
];

// ─── Nav tabs ─────────────────────────────────────────────────────────────────

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
	{ id: "profile", label: "Profile", icon: User },
	{ id: "connections", label: "Publish Channels", icon: Zap },
	{ id: "notifications", label: "Notifications", icon: Bell },
	{ id: "export", label: "Export Defaults", icon: Download },
	{ id: "appearance", label: "Appearance", icon: Palette },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
	children,
	className,
}: { children: React.ReactNode; className?: string }) {
	return (
		<div
			className={cn(
				"rounded-xl border border-white/8 bg-[#161616] overflow-hidden",
				className,
			)}
		>
			{children}
		</div>
	);
}

function SectionHeader({
	title,
	description,
}: { title: string; description?: string }) {
	return (
		<div className="px-5 py-4 border-b border-white/8">
			<h3 className="text-sm font-semibold text-white">{title}</h3>
			{description && (
				<p className="text-xs text-[#707070] mt-0.5">{description}</p>
			)}
		</div>
	);
}

function SettingRow({
	label,
	description,
	children,
	last,
}: {
	label: string;
	description?: string;
	children: React.ReactNode;
	last?: boolean;
}) {
	return (
		<div
			className={cn(
				"flex items-center justify-between px-5 py-4 gap-4",
				!last && "border-b border-white/5",
			)}
		>
			<div className="min-w-0">
				<p className="text-sm font-medium text-white">{label}</p>
				{description && (
					<p className="text-xs text-[#707070] mt-0.5 leading-relaxed">
						{description}
					</p>
				)}
			</div>
			<div className="shrink-0">{children}</div>
		</div>
	);
}

function StyledSelect({
	value,
	onChange,
	options,
}: {
	value: string;
	onChange: (v: string) => void;
	options: { value: string; label: string }[];
}) {
	return (
		<select
			value={value}
			onChange={(e) => onChange(e.target.value)}
			className="appearance-none bg-[#1e1e1e] border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-[#ff6a00]/50 focus:border-[#ff6a00]/50 transition-colors cursor-pointer"
			style={{
				backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
				backgroundPosition: "right 0.4rem center",
				backgroundRepeat: "no-repeat",
				backgroundSize: "1.2em 1.2em",
			}}
		>
			{options.map((o) => (
				<option key={o.value} value={o.value} className="bg-[#1e1e1e]">
					{o.label}
				</option>
			))}
		</select>
	);
}

// ─── Main content ─────────────────────────────────────────────────────────────

function SettingsContent() {
	const { user } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const tabParam = searchParams.get("tab") as TabId | null;

	const { theme, setTheme } = useTheme();
	const applyRemoteTheme = useApplyRemoteTheme();

	const [activeTab, setActiveTab] = useState<TabId>(tabParam || "profile");
	const [settings, setSettings] = useState<UserSettings | null>(null);
	const [connections, setConnections] = useState<SocialConnection[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [disconnecting, setDisconnecting] = useState<string | null>(null);

	useEffect(() => {
		const valid: TabId[] = [
			"profile",
			"connections",
			"notifications",
			"export",
			"appearance",
		];
		if (tabParam && valid.includes(tabParam)) setActiveTab(tabParam);
	}, [tabParam]);

	useEffect(() => {
		const error = searchParams.get("error");
		const youtube = searchParams.get("youtube");
		if (error) toast.error(`Connection failed: ${error.replace(/_/g, " ")}`);
		if (youtube === "connected")
			toast.success("YouTube connected successfully!");
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
			if (settingsRes.ok) {
				const data = await settingsRes.json();
				setSettings(data);
				// Sync the user's saved theme preference into the ThemeProvider
				applyRemoteTheme(data.theme);
			}
			if (connectionsRes.ok) setConnections(await connectionsRes.json());
		} catch {
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
				toast.success("Saved");
			} else {
				toast.error("Failed to save");
			}
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
			} else {
				toast.error("Failed to disconnect");
			}
		} catch {
			toast.error("Failed to disconnect");
		} finally {
			setDisconnecting(null);
		}
	}

	const isConnected = (p: string) => connections.some((c) => c.provider === p);
	const getConnection = (p: string) =>
		connections.find((c) => c.provider === p);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[#0e0e0e]">
				<div className="flex flex-col items-center gap-3">
					<div className="h-8 w-8 rounded-full border-2 border-[#ff6a00]/30 border-t-[#ff6a00] animate-spin" />
					<p className="text-sm text-[#707070]">Loading settings…</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#0e0e0e]">
			<DashboardNavbar />

			<main className="container mx-auto px-6 pb-16 max-w-5xl">
				{/* Page header */}
				<div className="flex items-center gap-4 mb-8">
					<Link
						href="/dashboard"
						className="flex items-center justify-center h-9 w-9 rounded-lg border border-white/8 bg-white/3 hover:bg-white/6 transition-colors"
					>
						<ArrowLeft className="h-4 w-4 text-[#a0a0a0]" />
					</Link>
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-white">
							Settings
						</h1>
						<p className="text-sm text-[#707070]">
							Manage your account, channels, and preferences
						</p>
					</div>
					{saving && (
						<div className="ml-auto flex items-center gap-2 text-xs text-[#707070]">
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
							Saving…
						</div>
					)}
				</div>

				<div className="flex gap-8">
					{/* Sidebar nav */}
					<aside className="hidden md:flex flex-col gap-1 w-[200px] shrink-0">
						{tabs.map(({ id, label, icon: Icon }) => (
							<button
								key={id}
								onClick={() => setActiveTab(id)}
								className={cn(
									"flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-left text-sm transition-all duration-150",
									activeTab === id
										? "bg-[#ff6a00]/12 text-[#ff6a00] font-semibold border border-[#ff6a00]/20"
										: "text-[#a0a0a0] hover:text-white hover:bg-white/5",
								)}
							>
								<Icon className="h-4 w-4 shrink-0" />
								{label}
							</button>
						))}
					</aside>

					{/* Mobile tab bar */}
					<div className="md:hidden w-full mb-4">
						<div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
							{tabs.map(({ id, label, icon: Icon }) => (
								<button
									key={id}
									onClick={() => setActiveTab(id)}
									className={cn(
										"flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors shrink-0",
										activeTab === id
											? "bg-[#ff6a00]/15 text-[#ff6a00] font-semibold"
											: "text-[#707070] hover:text-white bg-white/3",
									)}
								>
									<Icon className="h-3.5 w-3.5" />
									{label}
								</button>
							))}
						</div>
					</div>

					{/* Panel */}
					<div className="flex-1 min-w-0 space-y-4">
						{/* ── Profile ── */}
						{activeTab === "profile" && (
							<div className="space-y-4">
								<SectionCard>
									<SectionHeader
										title="Account"
										description="Your Fusion account details"
									/>
									<div className="p-5 flex items-center gap-4">
										<div className="h-14 w-14 rounded-full bg-[#ff6a00]/15 border border-[#ff6a00]/20 flex items-center justify-center shrink-0">
											<span className="text-xl font-bold text-[#ff6a00]">
												{(user?.displayName ||
													user?.email ||
													"U")[0].toUpperCase()}
											</span>
										</div>
										<div>
											<p className="font-semibold text-white">
												{user?.displayName || "No display name"}
											</p>
											<p className="text-sm text-[#707070]">{user?.email}</p>
										</div>
									</div>
								</SectionCard>

								<SectionCard>
									<SectionHeader title="Account Details" />
									<SettingRow
										label="Email"
										description="Your login email address"
									>
										<span className="text-sm text-[#a0a0a0] font-mono bg-white/5 px-2.5 py-1 rounded-md">
											{user?.email}
										</span>
									</SettingRow>
									<SettingRow label="Display Name" last>
										<span className="text-sm text-[#a0a0a0]">
											{user?.displayName || (
												<span className="italic text-[#606060]">Not set</span>
											)}
										</span>
									</SettingRow>
								</SectionCard>

								<div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-white/8 bg-white/2">
									<AlertCircle className="h-4 w-4 text-[#707070] shrink-0 mt-0.5" />
									<p className="text-xs text-[#707070] leading-relaxed">
										Profile name and photo are managed through Firebase Auth.
										Contact support to update your display name.
									</p>
								</div>
							</div>
						)}

						{/* ── Publish Channels ── */}
						{activeTab === "connections" && (
							<div className="space-y-4">
								<SectionCard>
									<SectionHeader
										title="Publish Channels"
										description="Connect your accounts to publish videos without leaving the editor"
									/>
									<div className="divide-y divide-white/5">
										{platforms.map(
											({
												id,
												name,
												description,
												ready,
												icon,
												iconBg,
												iconColor,
												badge,
											}) => {
												const connected = isConnected(id);
												const conn = getConnection(id);
												const isDisconnecting = disconnecting === id;

												return (
													<div
														key={id}
														className="flex items-center gap-4 px-5 py-4"
													>
														{/* Icon */}
														<div
															className={cn(
																"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
																iconBg,
																iconColor,
															)}
														>
															{icon}
														</div>

														{/* Info */}
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2 flex-wrap">
																<span className="text-sm font-semibold text-white">
																	{name}
																</span>
																{badge && (
																	<span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/6 text-[#707070] border border-white/8">
																		{badge}
																	</span>
																)}
																{connected && (
																	<div className="flex items-center gap-1 text-emerald-400">
																		<div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
																		<span className="text-[10px] font-medium">
																			Active
																		</span>
																	</div>
																)}
															</div>
															<p className="text-xs text-[#606070] mt-0.5">
																{connected && conn?.provider_username
																	? `@${conn.provider_username}`
																	: description}
															</p>
														</div>

														{/* Action */}
														{connected ? (
															<button
																onClick={() => disconnectProvider(id)}
																disabled={isDisconnecting}
																className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-[#a0a0a0] hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150 disabled:opacity-50"
															>
																{isDisconnecting ? (
																	<Loader2 className="h-3.5 w-3.5 animate-spin" />
																) : (
																	<Unplug className="h-3.5 w-3.5" />
																)}
																Disconnect
															</button>
														) : ready ? (
															<button
																onClick={() =>
																	(window.location.href = `/api/social-connections/${id}/connect`)
																}
																className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#ff6a00] hover:bg-[#ff7a1a] text-white transition-all duration-150 shadow-sm shadow-[#ff6a00]/20 hover:shadow-[#ff6a00]/30"
															>
																Connect
															</button>
														) : (
															<span className="text-xs text-[#505050] font-medium">
																Soon
															</span>
														)}
													</div>
												);
											},
										)}
									</div>
								</SectionCard>

								{/* Info callout */}
								<div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-[#ff6a00]/15 bg-[#ff6a00]/5">
									<Zap className="h-4 w-4 text-[#ff6a00] shrink-0 mt-0.5" />
									<p className="text-xs text-[#a0a0a0] leading-relaxed">
										After connecting, use the{" "}
										<span className="font-semibold text-[#ff6a00]">
											Publish
										</span>{" "}
										button in the editor to send your video directly to any
										connected channel.
									</p>
								</div>
							</div>
						)}

						{/* ── Notifications ── */}
						{activeTab === "notifications" && settings && (
							<SectionCard>
								<SectionHeader
									title="Notifications"
									description="Choose what updates you receive"
								/>
								<SettingRow
									label="Email notifications"
									description="Receive product updates and announcements via email"
								>
									<Switch
										checked={settings.email_notifications}
										onCheckedChange={(v) =>
											updateSettings({ email_notifications: v })
										}
									/>
								</SettingRow>
								<SettingRow
									label="Render complete"
									description="Get notified when your video export finishes"
									last
								>
									<Switch
										checked={settings.render_complete_notifications}
										onCheckedChange={(v) =>
											updateSettings({ render_complete_notifications: v })
										}
									/>
								</SettingRow>
							</SectionCard>
						)}

						{/* ── Export Defaults ── */}
						{activeTab === "export" && settings && (
							<div className="space-y-4">
								<SectionCard>
									<SectionHeader
										title="Export Defaults"
										description="These settings apply to every new export"
									/>
									<SettingRow
										label="Default quality"
										description="Resolution and bitrate of exported video"
									>
										<StyledSelect
											value={settings.default_export_quality}
											onChange={(v) =>
												updateSettings({ default_export_quality: v })
											}
											options={[
												{ value: "low", label: "Low — fast, smaller file" },
												{ value: "medium", label: "Medium — balanced" },
												{ value: "high", label: "High — best quality" },
											]}
										/>
									</SettingRow>
									<SettingRow
										label="Default format"
										description="Container format for exported video"
										last
									>
										<StyledSelect
											value={settings.default_export_format}
											onChange={(v) =>
												updateSettings({ default_export_format: v })
											}
											options={[{ value: "mp4", label: "MP4 (H.264)" }]}
										/>
									</SettingRow>
								</SectionCard>
							</div>
						)}

						{/* ── Appearance ── */}
						{activeTab === "appearance" && settings && (
							<div className="space-y-4">
								<SectionCard>
									<SectionHeader
										title="Theme"
										description="Choose how Fusion looks on your device"
									/>
									<div className="p-5 grid grid-cols-3 gap-3">
										{(
											[
												{ value: "light" as Theme, label: "Light", icon: Sun },
												{ value: "dark" as Theme, label: "Dark", icon: Moon },
												{
													value: "system" as Theme,
													label: "System",
													icon: Monitor,
												},
											] as {
												value: Theme;
												label: string;
												icon: React.ElementType;
											}[]
										).map(({ value, label, icon: Icon }) => (
											<button
												key={value}
												onClick={() => {
													// Apply immediately to <html> via ThemeProvider
													setTheme(value);
													// Persist to DB
													updateSettings({ theme: value });
												}}
												className={cn(
													"flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-150",
													theme === value
														? "border-[#ff6a00]/50 bg-[#ff6a00]/8 text-[#ff6a00]"
														: "border-white/8 bg-white/3 text-[#707070] hover:border-white/15 hover:text-white",
												)}
											>
												<Icon className="h-5 w-5" />
												<span className="text-xs font-medium">{label}</span>
												{theme === value && (
													<CheckCircle2 className="h-3.5 w-3.5" />
												)}
											</button>
										))}
									</div>
								</SectionCard>
							</div>
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
