"use client";

import { Folder, Film, HardDrive, Layers, Image, Music } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsBarProps {
	projectCount: number;
	assetCount: number;
	assetBreakdown: { video: number; image: number; audio: number };
	storageUsed: number;
	storageQuotaBytes?: number;
	renderCount: number;
	rendersThisWeek: number;
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return (
		(bytes / Math.pow(k, i)).toFixed(1).replace(/\.0$/, "") + " " + sizes[i]
	);
}

interface StatCardProps {
	icon: React.ElementType;
	iconColor: string;
	iconBg: string;
	label: string;
	value: string | number;
	sub?: React.ReactNode;
	className?: string;
}

function StatCard({
	icon: Icon,
	iconColor,
	iconBg,
	label,
	value,
	sub,
	className,
}: StatCardProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-3.5 p-4 rounded-xl border border-white/8 bg-[#111111]",
				className,
			)}
		>
			<div
				className={cn(
					"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
					iconBg,
				)}
			>
				<Icon className={cn("h-4 w-4", iconColor)} />
			</div>
			<div className="min-w-0">
				<p className="text-xs text-[#707070] font-medium truncate">{label}</p>
				<p className="text-lg font-bold text-white leading-tight">{value}</p>
				{sub && <div className="mt-0.5">{sub}</div>}
			</div>
		</div>
	);
}

export function StatsBar({
	projectCount,
	assetCount,
	assetBreakdown,
	storageUsed,
	storageQuotaBytes = 10 * 1024 * 1024 * 1024, // 10 GB default
	renderCount,
	rendersThisWeek,
}: StatsBarProps) {
	const storagePercent = Math.min(100, (storageUsed / storageQuotaBytes) * 100);
	const storageColor =
		storagePercent > 90
			? "bg-red-500"
			: storagePercent > 70
				? "bg-amber-500"
				: "bg-[#ff6a00]";

	return (
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
			<StatCard
				icon={Folder}
				iconColor="text-[#ff6a00]"
				iconBg="bg-[#ff6a00]/10"
				label="Projects"
				value={projectCount}
			/>

			<StatCard
				icon={Layers}
				iconColor="text-blue-400"
				iconBg="bg-blue-400/10"
				label="Assets"
				value={assetCount}
				sub={
					assetCount > 0 ? (
						<div className="flex items-center gap-2 text-[10px] text-[#606060]">
							{assetBreakdown.video > 0 && (
								<span className="flex items-center gap-0.5">
									<Film className="h-2.5 w-2.5" />
									{assetBreakdown.video}
								</span>
							)}
							{assetBreakdown.image > 0 && (
								<span className="flex items-center gap-0.5">
									<Image className="h-2.5 w-2.5" />
									{assetBreakdown.image}
								</span>
							)}
							{assetBreakdown.audio > 0 && (
								<span className="flex items-center gap-0.5">
									<Music className="h-2.5 w-2.5" />
									{assetBreakdown.audio}
								</span>
							)}
						</div>
					) : null
				}
			/>

			<StatCard
				icon={HardDrive}
				iconColor="text-emerald-400"
				iconBg="bg-emerald-400/10"
				label="Storage"
				value={formatBytes(storageUsed)}
				sub={
					<div className="flex items-center gap-2 mt-1">
						<div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
							<div
								className={cn(
									"h-full rounded-full transition-all duration-500",
									storageColor,
								)}
								style={{ width: `${storagePercent}%` }}
							/>
						</div>
						<span className="text-[10px] text-[#505050] shrink-0">
							{formatBytes(storageQuotaBytes)}
						</span>
					</div>
				}
			/>

			<StatCard
				icon={Film}
				iconColor="text-purple-400"
				iconBg="bg-purple-400/10"
				label="Exports"
				value={renderCount}
				sub={
					rendersThisWeek > 0 ? (
						<p className="text-[10px] text-[#606060]">
							{rendersThisWeek} this week
						</p>
					) : null
				}
			/>
		</div>
	);
}
