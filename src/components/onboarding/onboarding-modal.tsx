"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Check, ArrowRight } from "lucide-react";
import { LogoIcons } from "@/components/shared/logos";
import { cn } from "@/lib/utils";

export interface OnboardingModalProps {
	open: boolean;
	onComplete: (skipped: boolean) => void;
	onConnect: (provider: "youtube" | "instagram" | "tiktok") => void;
	connections: { provider: string }[];
}

const platforms = [
	{
		id: "youtube" as const,
		name: "YouTube",
		description: "Upload & publish videos directly",
		ready: true,
		icon: (
			<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
				<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
			</svg>
		),
		iconBg: "bg-[#FF0000]/10",
		iconColor: "text-[#FF0000]",
		glowColor: "group-hover:shadow-[0_0_20px_rgba(255,0,0,0.15)]",
		badge: null,
	},
	{
		id: "instagram" as const,
		name: "Instagram",
		description: "Share Reels to your profile",
		ready: false,
		icon: (
			<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
				<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
			</svg>
		),
		iconBg: "bg-[#E1306C]/10",
		iconColor: "text-[#E1306C]",
		glowColor: "group-hover:shadow-[0_0_20px_rgba(225,48,108,0.15)]",
		badge: "Coming soon",
	},
	{
		id: "tiktok" as const,
		name: "TikTok",
		description: "Post directly to your TikTok",
		ready: false,
		icon: (
			<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
				<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
			</svg>
		),
		iconBg: "bg-white/5",
		iconColor: "text-white",
		glowColor: "group-hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]",
		badge: "Coming soon",
	},
];

export function OnboardingModal({
	open,
	onComplete,
	onConnect,
	connections,
}: OnboardingModalProps) {
	const [connecting, setConnecting] = useState<string | null>(null);

	const isConnected = (p: string) => connections.some((c) => c.provider === p);
	const connectedCount = platforms.filter((p) => isConnected(p.id)).length;

	const handleConnect = (provider: "youtube" | "instagram" | "tiktok") => {
		setConnecting(provider);
		onConnect(provider);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onComplete(true);
			}}
		>
			<DialogContent className="p-0 overflow-hidden border-0 shadow-none bg-transparent max-w-[440px] w-full">
				<DialogTitle className="sr-only">
					Connect your publish channels
				</DialogTitle>

				{/* Outer glow ring */}
				<div className="relative rounded-2xl bg-[#111111] border border-white/10 shadow-2xl shadow-black/60 overflow-hidden">
					{/* Subtle top gradient accent */}
					<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff6a00]/60 to-transparent" />
					<div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#ff6a00]/5 to-transparent pointer-events-none" />

					<div className="relative p-7 space-y-6">
						{/* Header */}
						<div className="space-y-3">
							<div className="flex items-center gap-2.5">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff6a00]/15 border border-[#ff6a00]/20">
									<LogoIcons.scenify size={18} />
								</div>
								<span className="text-xs font-semibold tracking-widest text-[#ff6a00] uppercase">
									Fusion Publish
								</span>
							</div>
							<div>
								<h2 className="text-xl font-bold tracking-tight text-white">
									Reach your audience
								</h2>
								<p className="text-sm text-[#a0a0a0] mt-1 leading-relaxed">
									Connect once, publish anywhere — directly from your timeline.
								</p>
							</div>
						</div>

						{/* Platform list */}
						<div className="space-y-2">
							{platforms.map(
								({
									id,
									name,
									description,
									ready,
									icon,
									iconBg,
									iconColor,
									glowColor,
									badge,
								}) => {
									const connected = isConnected(id);
									const isConnecting = connecting === id;

									return (
										<button
											key={id}
											onClick={() =>
												ready && !connected && !connecting && handleConnect(id)
											}
											disabled={!ready || !!connecting || connected}
											className={cn(
												"group w-full flex items-center gap-4 p-3.5 rounded-xl border transition-all duration-200 text-left",
												connected
													? "border-emerald-500/30 bg-emerald-500/5"
													: ready
														? "border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 cursor-pointer"
														: "border-white/5 bg-white/2 cursor-not-allowed opacity-60",
												glowColor,
											)}
										>
											{/* Icon */}
											<div
												className={cn(
													"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
													iconBg,
													iconColor,
												)}
											>
												{icon}
											</div>

											{/* Text */}
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<span className="text-sm font-semibold text-white">
														{name}
													</span>
													{badge && (
														<span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/8 text-[#a0a0a0] border border-white/10">
															{badge}
														</span>
													)}
												</div>
												<p className="text-xs text-[#707070] truncate">
													{description}
												</p>
											</div>

											{/* Status */}
											<div className="shrink-0">
												{connected ? (
													<div className="flex items-center gap-1.5 text-emerald-400">
														<div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
														<span className="text-xs font-medium">
															Connected
														</span>
													</div>
												) : isConnecting ? (
													<div className="flex items-center gap-1.5 text-[#a0a0a0]">
														<svg
															className="h-3.5 w-3.5 animate-spin"
															viewBox="0 0 24 24"
															fill="none"
														>
															<circle
																className="opacity-25"
																cx="12"
																cy="12"
																r="10"
																stroke="currentColor"
																strokeWidth="4"
															/>
															<path
																className="opacity-75"
																fill="currentColor"
																d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
															/>
														</svg>
														<span className="text-xs">Connecting</span>
													</div>
												) : ready ? (
													<span className="text-xs font-semibold text-[#ff6a00] group-hover:text-[#ff8533] transition-colors">
														Connect →
													</span>
												) : null}
											</div>
										</button>
									);
								},
							)}
						</div>

						{/* Progress hint */}
						{connectedCount > 0 && (
							<div className="flex items-center gap-2 px-1">
								<Check className="h-3.5 w-3.5 text-emerald-400" />
								<span className="text-xs text-[#a0a0a0]">
									{connectedCount} of {platforms.filter((p) => p.ready).length}{" "}
									channel{connectedCount !== 1 ? "s" : ""} connected
								</span>
							</div>
						)}

						{/* Actions */}
						<div className="flex items-center gap-3 pt-1">
							<button
								onClick={() => onComplete(true)}
								className="text-sm text-[#606060] hover:text-[#a0a0a0] transition-colors"
							>
								Skip for now
							</button>
							<div className="flex-1" />
							<button
								onClick={() => onComplete(false)}
								className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff6a00] hover:bg-[#ff7a1a] text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-[#ff6a00]/25 hover:shadow-[#ff6a00]/40 hover:scale-[1.02] active:scale-[0.98]"
							>
								Start Creating
								<ArrowRight className="h-4 w-4" />
							</button>
						</div>
					</div>

					{/* Bottom accent line */}
					<div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
				</div>
			</DialogContent>
		</Dialog>
	);
}
