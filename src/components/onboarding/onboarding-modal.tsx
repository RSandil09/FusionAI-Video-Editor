"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Youtube, Instagram, Share2, SkipForward, Check } from "lucide-react";

export interface OnboardingModalProps {
	open: boolean;
	onComplete: (skipped: boolean) => void;
	onConnect: (provider: "youtube" | "instagram" | "tiktok") => void;
	connections: { provider: string }[];
}

export function OnboardingModal({
	open,
	onComplete,
	onConnect,
	connections,
}: OnboardingModalProps) {
	const [connecting, setConnecting] = useState<string | null>(null);

	const isConnected = (p: string) => connections.some((c) => c.provider === p);

	const handleConnect = (provider: "youtube" | "instagram" | "tiktok") => {
		setConnecting(provider);
		onConnect(provider);
	};

	return (
		<Dialog open={open} onOpenChange={() => {}}>
			<DialogContent
				className="sm:max-w-[480px] p-0 overflow-hidden border-0 shadow-2xl"
				onPointerDownOutside={(e) => e.preventDefault()}
				onEscapeKeyDown={(e) => e.preventDefault()}
			>
				<div className="p-8 space-y-6">
					<div className="text-center space-y-2">
						<div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
							<Share2 className="h-7 w-7 text-primary" />
						</div>
						<h2 className="text-xl font-semibold tracking-tight">
							Connect your social accounts
						</h2>
						<p className="text-sm text-muted-foreground max-w-sm mx-auto">
							Share your videos directly to YouTube, Instagram, and TikTok from
							your editor. You can connect now or later in settings.
						</p>
					</div>

					<div className="space-y-3">
						{[
							{
								provider: "youtube" as const,
								id: "youtube",
								name: "YouTube",
								icon: Youtube,
								color: "text-red-600",
							},
							{
								provider: "instagram" as const,
								id: "instagram",
								name: "Instagram",
								icon: Instagram,
								color: "text-pink-500",
							},
							{
								provider: "tiktok" as const,
								id: "tiktok",
								name: "TikTok",
								icon: () => (
									<span className="text-[10px] font-bold bg-black text-white px-1.5 py-0.5 rounded">
										TT
									</span>
								),
								color: "text-foreground",
							},
						].map(({ provider, name, icon: Icon, color }) => (
							<button
								key={provider}
								onClick={() =>
									!isConnected(provider) && handleConnect(provider)
								}
								disabled={!!connecting || isConnected(provider)}
								className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors disabled:opacity-70 disabled:cursor-default"
							>
								<div className="flex items-center gap-3">
									<div
										className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${color}`}
									>
										<Icon className="h-5 w-5" />
									</div>
									<span className="font-medium">{name}</span>
								</div>
								{isConnected(provider) ? (
									<span className="flex items-center gap-1.5 text-sm text-green-600">
										<Check className="h-4 w-4" />
										Connected
									</span>
								) : connecting === provider ? (
									<span className="text-sm text-muted-foreground">
										Connecting…
									</span>
								) : (
									<span className="text-sm text-primary font-medium">
										Connect
									</span>
								)}
							</button>
						))}
					</div>

					<div className="flex gap-3 pt-2">
						<Button
							variant="outline"
							className="flex-1"
							onClick={() => onComplete(true)}
						>
							<SkipForward className="h-4 w-4 mr-2" />
							Skip for now
						</Button>
						<Button className="flex-1" onClick={() => onComplete(false)}>
							Continue
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
