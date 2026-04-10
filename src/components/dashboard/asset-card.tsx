"use client";

import React from "react";
import { Trash2, File, Image as ImageIcon, Film, Music } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/db/database.types";

type Asset = Database["public"]["Tables"]["assets"]["Row"];

interface AssetCardProps {
	asset: Asset;
	onDelete?: (assetId: string) => void;
}

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return (
		(bytes / Math.pow(k, i)).toFixed(1).replace(/\.0$/, "") + " " + sizes[i]
	);
}

function formatDuration(seconds: number | null): string {
	if (!seconds || seconds <= 0) return "";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

const typeConfig = {
	video: {
		icon: Film,
		color: "text-blue-400",
		bg: "bg-blue-400/10",
		badge: "bg-blue-400/15 text-blue-300",
	},
	image: {
		icon: ImageIcon,
		color: "text-emerald-400",
		bg: "bg-emerald-400/10",
		badge: "bg-emerald-400/15 text-emerald-300",
	},
	audio: {
		icon: Music,
		color: "text-purple-400",
		bg: "bg-purple-400/10",
		badge: "bg-purple-400/15 text-purple-300",
	},
	other: {
		icon: File,
		color: "text-[#707070]",
		bg: "bg-white/5",
		badge: "bg-white/8 text-[#a0a0a0]",
	},
};

export function AssetCard({ asset, onDelete }: AssetCardProps) {
	const config =
		typeConfig[asset.file_type as keyof typeof typeConfig] ?? typeConfig.other;
	const Icon = config.icon;
	const duration = formatDuration(asset.duration_seconds);

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (confirm(`Delete "${asset.file_name}"?`)) onDelete?.(asset.id);
	};

	return (
		<div className="group relative bg-[#111111] border border-white/8 rounded-xl overflow-hidden hover:border-white/15 hover:shadow-lg transition-all duration-200">
			{/* Preview */}
			<div className="aspect-video bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
				{asset.file_type === "image" && asset.file_url ? (
					<img
						src={asset.file_url}
						alt={asset.file_name}
						className="w-full h-full object-cover"
					/>
				) : asset.file_type === "video" && asset.file_url ? (
					<div className="relative w-full h-full">
						<img
							src={asset.file_url}
							alt={asset.file_name}
							className="w-full h-full object-cover opacity-70"
							onError={(e) => {
								(e.target as HTMLImageElement).style.display = "none";
							}}
						/>
						<div className="absolute inset-0 flex items-center justify-center">
							<div
								className={cn(
									"h-10 w-10 rounded-full flex items-center justify-center",
									config.bg,
								)}
							>
								<Icon className={cn("h-5 w-5", config.color)} />
							</div>
						</div>
					</div>
				) : (
					<div
						className={cn(
							"h-12 w-12 rounded-xl flex items-center justify-center",
							config.bg,
						)}
					>
						<Icon className={cn("h-6 w-6", config.color)} />
					</div>
				)}

				{/* Type badge */}
				<div
					className={cn(
						"absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize",
						config.badge,
					)}
				>
					{asset.file_type}
				</div>

				{/* Duration badge */}
				{duration && (
					<div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
						{duration}
					</div>
				)}

				{/* Delete button */}
				<button
					onClick={handleDelete}
					className="absolute top-2 right-2 flex items-center justify-center h-6 w-6 rounded-lg bg-black/60 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 hover:border-red-500/50"
				>
					<Trash2 className="h-3 w-3 text-white" />
				</button>
			</div>

			{/* Info */}
			<div className="px-3 py-2.5">
				<p className="text-xs font-medium text-white truncate mb-0.5">
					{asset.file_name}
				</p>
				<div className="flex items-center justify-between text-[10px] text-[#606060]">
					<span>{formatFileSize(asset.file_size)}</span>
					<span>
						{formatDistanceToNow(new Date(asset.uploaded_at), {
							addSuffix: true,
						})}
					</span>
				</div>
			</div>
		</div>
	);
}
