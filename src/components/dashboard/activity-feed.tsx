"use client";

import { useState } from "react";
import {
	CheckCircle2,
	XCircle,
	Loader2,
	Download,
	Film,
	Image as ImageIcon,
	Music,
	File,
	Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/db/database.types";

type Render = Database["public"]["Tables"]["renders"]["Row"] & {
	project_name: string | null;
};
type Asset = Database["public"]["Tables"]["assets"]["Row"];

interface ActivityFeedProps {
	renders: Render[];
	assets: Asset[];
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return (
		(bytes / Math.pow(k, i)).toFixed(1).replace(/\.0$/, "") + " " + sizes[i]
	);
}

function getAssetIcon(type: string) {
	switch (type) {
		case "video":
			return Film;
		case "image":
			return ImageIcon;
		case "audio":
			return Music;
		default:
			return File;
	}
}

function getAssetColor(type: string) {
	switch (type) {
		case "video":
			return "text-blue-400 bg-blue-400/10";
		case "image":
			return "text-emerald-400 bg-emerald-400/10";
		case "audio":
			return "text-purple-400 bg-purple-400/10";
		default:
			return "text-[#707070] bg-white/5";
	}
}

function RenderItem({ render }: { render: Render }) {
	const isCompleted = render.status === "completed";
	const isFailed = render.status === "failed";
	const isProcessing =
		render.status === "processing" || render.status === "pending";
	const time = render.completed_at || render.created_at;

	return (
		<div className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors group">
			{/* Status icon */}
			<div className="shrink-0">
				{isCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
				{isFailed && <XCircle className="h-4 w-4 text-red-400" />}
				{isProcessing && (
					<Loader2 className="h-4 w-4 text-[#ff6a00] animate-spin" />
				)}
			</div>

			{/* Info */}
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium text-white truncate">
					{render.project_name || "Untitled"}
				</p>
				<div className="flex items-center gap-2 mt-0.5">
					{isProcessing && typeof render.progress === "number" ? (
						<div className="flex items-center gap-2 flex-1">
							<div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
								<div
									className="h-full rounded-full bg-[#ff6a00] transition-all duration-500"
									style={{ width: `${render.progress}%` }}
								/>
							</div>
							<span className="text-[10px] text-[#606060] shrink-0">
								{render.progress}%
							</span>
						</div>
					) : (
						<p className="text-xs text-[#606060] flex items-center gap-1">
							<Clock className="h-3 w-3" />
							{formatDistanceToNow(new Date(time), { addSuffix: true })}
						</p>
					)}
				</div>
			</div>

			{/* Download */}
			{isCompleted && render.output_url && (
				<a
					href={render.output_url}
					download
					onClick={(e) => e.stopPropagation()}
					className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg border border-white/8 bg-white/3 hover:bg-[#ff6a00]/15 hover:border-[#ff6a00]/30 transition-colors opacity-0 group-hover:opacity-100"
					title="Download"
				>
					<Download className="h-3.5 w-3.5 text-[#a0a0a0] group-hover:text-[#ff6a00]" />
				</a>
			)}
		</div>
	);
}

function AssetItem({ asset }: { asset: Asset }) {
	const Icon = getAssetIcon(asset.file_type);
	const colorClass = getAssetColor(asset.file_type);

	return (
		<div className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors">
			<div
				className={cn(
					"h-8 w-8 shrink-0 rounded-lg flex items-center justify-center",
					colorClass,
				)}
			>
				{asset.file_type === "image" && asset.file_url ? (
					<img
						src={asset.file_url}
						alt=""
						className="h-full w-full object-cover rounded-lg"
					/>
				) : (
					<Icon className="h-4 w-4" />
				)}
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium text-white truncate">
					{asset.file_name}
				</p>
				<p className="text-xs text-[#606060]">
					{formatBytes(asset.file_size)} ·{" "}
					{formatDistanceToNow(new Date(asset.uploaded_at), {
						addSuffix: true,
					})}
				</p>
			</div>
		</div>
	);
}

type Tab = "renders" | "uploads";

export function ActivityFeed({ renders, assets }: ActivityFeedProps) {
	const [tab, setTab] = useState<Tab>("renders");

	const isEmpty =
		tab === "renders" ? renders.length === 0 : assets.length === 0;

	return (
		<div className="rounded-xl border border-white/8 bg-[#111111] overflow-hidden flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center gap-1 p-3 border-b border-white/5">
				{(["renders", "uploads"] as Tab[]).map((t) => (
					<button
						key={t}
						onClick={() => setTab(t)}
						className={cn(
							"flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-150 capitalize",
							tab === t
								? "bg-[#ff6a00]/12 text-[#ff6a00] border border-[#ff6a00]/20"
								: "text-[#707070] hover:text-white hover:bg-white/5",
						)}
					>
						{t === "renders" ? "Exports" : "Uploads"}
						{t === "renders" && renders.length > 0 && (
							<span className="ml-1.5 text-[10px] bg-white/8 px-1.5 py-0.5 rounded-full text-[#a0a0a0]">
								{renders.length}
							</span>
						)}
					</button>
				))}
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto">
				{isEmpty ? (
					<div className="flex flex-col items-center justify-center py-12 px-4 text-center">
						{tab === "renders" ? (
							<Film className="h-8 w-8 text-[#303030] mb-2" />
						) : (
							<File className="h-8 w-8 text-[#303030] mb-2" />
						)}
						<p className="text-sm text-[#505050]">
							{tab === "renders" ? "No exports yet" : "No uploads yet"}
						</p>
					</div>
				) : tab === "renders" ? (
					<div className="divide-y divide-white/5">
						{renders.map((r) => (
							<RenderItem key={r.id} render={r} />
						))}
					</div>
				) : (
					<div className="divide-y divide-white/5">
						{assets.map((a) => (
							<AssetItem key={a.id} asset={a} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
