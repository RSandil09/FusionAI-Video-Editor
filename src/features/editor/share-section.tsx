"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getIdToken } from "@/lib/auth/client";
import { Youtube, Instagram, Music2, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SocialConnection {
	provider: string;
	provider_username: string | null;
	connected_at: string;
}

const PLATFORMS = [
	{
		id: "youtube" as const,
		name: "YouTube",
		icon: Youtube,
		color: "text-red-500",
	},
	{
		id: "instagram" as const,
		name: "Instagram",
		icon: Instagram,
		color: "text-pink-500",
	},
	{
		id: "tiktok" as const,
		name: "TikTok",
		icon: Music2,
		color: "text-foreground",
	},
] as const;

interface ShareSectionProps {
	videoUrl: string;
	onShareSuccess?: () => void;
}

export function ShareSection({ videoUrl, onShareSuccess }: ShareSectionProps) {
	const [connections, setConnections] = useState<SocialConnection[]>([]);
	const [loading, setLoading] = useState(true);
	const [sharing, setSharing] = useState<string | null>(null);
	const [shareSuccess, setShareSuccess] = useState<string | null>(null);
	const [showYoutubeDialog, setShowYoutubeDialog] = useState(false);
	const [youtubeTitle, setYoutubeTitle] = useState("My Video");
	const [youtubeDescription, setYoutubeDescription] = useState("");

	useEffect(() => {
		loadConnections();
	}, []);

	async function loadConnections() {
		const token = await getIdToken();
		if (!token) {
			setLoading(false);
			return;
		}
		try {
			const res = await fetch("/api/social-connections", {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				const data = await res.json();
				setConnections(data);
			}
		} catch {
			// ignore
		} finally {
			setLoading(false);
		}
	}

	const connectedProviders = new Set(connections.map((c) => c.provider));

	async function handleShare(platform: "youtube" | "instagram" | "tiktok") {
		if (platform === "youtube") {
			setShowYoutubeDialog(true);
			return;
		}
		await doShare(platform);
	}

	async function doShare(
		platform: "youtube" | "instagram" | "tiktok",
		title?: string,
		description?: string,
	) {
		const token = await getIdToken();
		if (!token) {
			toast.error("Please log in to share");
			return;
		}
		setSharing(platform);
		setShareSuccess(null);
		try {
			const res = await fetch("/api/share", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					platform,
					videoUrl,
					title: title || "My Video",
					description: description || "",
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				toast.error(data.error || `Failed to share to ${platform}`);
				return;
			}
			setShareSuccess(platform);
			toast.success(`Shared to ${platform}!`);
			if (data.url) {
				window.open(data.url, "_blank");
			}
			onShareSuccess?.();
		} catch {
			toast.error(`Failed to share to ${platform}`);
		} finally {
			setSharing(null);
			setShowYoutubeDialog(false);
		}
	}

	if (loading) return null;

	const hasConnections = connections.length > 0;

	return (
		<>
			<div className="flex flex-col items-center gap-2 w-full">
				<p className="text-xs text-muted-foreground">
					{hasConnections ? "Share to" : "Share to social"}
				</p>
				{hasConnections ? (
					<div className="flex gap-2">
						{PLATFORMS.map(({ id, name, icon: Icon, color }) => {
							const connected = connectedProviders.has(id);
							const isSharing = sharing === id;
							const success = shareSuccess === id;
							if (!connected) return null;
							return (
								<Button
									key={id}
									variant="outline"
									size="sm"
									className="gap-1.5"
									disabled={isSharing}
									onClick={() => handleShare(id)}
								>
									{isSharing ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : success ? (
										<Check className="h-4 w-4 text-green-500" />
									) : (
										<Icon className={`h-4 w-4 ${color}`} />
									)}
									{name}
								</Button>
							);
						})}
					</div>
				) : (
					<Link
						href="/settings?tab=connections"
						className="text-xs text-primary hover:underline"
					>
						Connect YouTube, Instagram, or TikTok in Settings
					</Link>
				)}
			</div>

			<Dialog open={showYoutubeDialog} onOpenChange={setShowYoutubeDialog}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Share to YouTube</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label htmlFor="yt-title">Title</Label>
							<Input
								id="yt-title"
								value={youtubeTitle}
								onChange={(e) => setYoutubeTitle(e.target.value)}
								placeholder="Video title"
								maxLength={100}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="yt-desc">Description (optional)</Label>
							<Textarea
								id="yt-desc"
								value={youtubeDescription}
								onChange={(e) => setYoutubeDescription(e.target.value)}
								placeholder="Video description"
								maxLength={5000}
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => setShowYoutubeDialog(false)}
							>
								Cancel
							</Button>
							<Button
								onClick={() =>
									doShare("youtube", youtubeTitle, youtubeDescription)
								}
								disabled={sharing === "youtube"}
							>
								{sharing === "youtube" ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									"Upload to YouTube"
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
