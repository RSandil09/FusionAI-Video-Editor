"use client";

/**
 * Asset Card Component
 * Displays uploaded file thumbnail and metadata
 */

import React from "react";
import { Trash2, File, Image as ImageIcon, Film, Music } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
	return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + " " + sizes[i];
}

function getFileIcon(fileType: string) {
	switch (fileType) {
		case "image":
			return ImageIcon;
		case "video":
			return Film;
		case "audio":
			return Music;
		default:
			return File;
	}
}

export function AssetCard({ asset, onDelete }: AssetCardProps) {
	const [showMenu, setShowMenu] = React.useState(false);
	const Icon = getFileIcon(asset.file_type);

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (confirm(`Delete "${asset.file_name}"?`)) {
			onDelete?.(asset.id);
		}
		setShowMenu(false);
	};

	return (
		<div className="group relative bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all duration-200">
			{/* Preview */}
			<div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
				{asset.file_type === "image" || asset.file_type === "video" ? (
					<img
						src={asset.file_url}
						alt={asset.file_name}
						className="w-full h-full object-cover"
					/>
				) : (
					<Icon className="h-12 w-12 text-muted-foreground" />
				)}

				{/* Type badge */}
				<div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded capitalize">
					{asset.file_type}
				</div>

				{/* Delete button (shows on hover) */}
				<button
					onClick={handleDelete}
					className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
				>
					<Trash2 className="h-4 w-4" />
				</button>
			</div>

			{/* Info */}
			<div className="p-3">
				<h4 className="font-medium text-sm truncate mb-1">{asset.file_name}</h4>
				<div className="flex items-center justify-between text-xs text-muted-foreground">
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
