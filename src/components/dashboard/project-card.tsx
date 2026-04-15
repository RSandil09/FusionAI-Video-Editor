"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
	MoreVertical,
	Trash2,
	Clock,
	Pencil,
	Play,
	Video,
	ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { getIdToken } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/db/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

export type ViewMode = "grid" | "list";

interface ProjectCardProps {
	project: Project;
	viewMode?: ViewMode;
	onDelete?: (projectId: string) => void;
	onRename?: (projectId: string, newName: string) => void;
}

function getAspectLabel(w: number | null, h: number | null): string {
	if (!w || !h) return "";
	const r = w / h;
	if (Math.abs(r - 16 / 9) < 0.05) return "16:9";
	if (Math.abs(r - 9 / 16) < 0.05) return "9:16";
	if (Math.abs(r - 1) < 0.05) return "1:1";
	return `${w}×${h}`;
}

function formatDuration(seconds: number | null): string {
	if (!seconds || seconds <= 0) return "";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ProjectCard({
	project,
	viewMode = "grid",
	onDelete,
	onRename,
}: ProjectCardProps) {
	const router = useRouter();
	const [showMenu, setShowMenu] = useState(false);
	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState(project.name);
	const [isSaving, setIsSaving] = useState(false);
	const [isNavigating, setIsNavigating] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const aspect = getAspectLabel(
		project.resolution_width,
		project.resolution_height,
	);
	const duration = formatDuration(project.duration);
	const lastEdited = formatDistanceToNow(new Date(project.updated_at), {
		addSuffix: true,
	});

	const handleOpen = () => {
		if (!isRenaming) {
			setIsNavigating(true);
			router.push(`/editor/${project.id}`);
		}
	};

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (confirm(`Delete "${project.name}"?`)) onDelete?.(project.id);
		setShowMenu(false);
	};

	const startRename = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowMenu(false);
		setRenameValue(project.name);
		setIsRenaming(true);
		setTimeout(() => inputRef.current?.select(), 0);
	};

	const commitRename = async () => {
		const newName = renameValue.trim();
		if (!newName || newName === project.name) {
			setIsRenaming(false);
			setRenameValue(project.name);
			return;
		}
		setIsSaving(true);
		try {
			const token = await getIdToken();
			if (!token) {
				toast.error("Not authenticated");
				return;
			}
			const res = await fetch(`/api/projects/${project.id}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ name: newName }),
			});
			if (res.ok) {
				onRename?.(project.id, newName);
				toast.success("Project renamed");
			} else {
				const err = await res.json().catch(() => ({}));
				toast.error(err.message || "Failed to rename");
				setRenameValue(project.name);
			}
		} catch (e: any) {
			toast.error(`Error: ${e.message}`);
			setRenameValue(project.name);
		} finally {
			setIsSaving(false);
			setIsRenaming(false);
		}
	};

	const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") commitRename();
		if (e.key === "Escape") {
			setIsRenaming(false);
			setRenameValue(project.name);
		}
		e.stopPropagation();
	};

	const MenuButton = () => (
		<div className="relative">
			<button
				onClick={(e) => {
					e.stopPropagation();
					setShowMenu(!showMenu);
				}}
				className="flex items-center justify-center h-7 w-7 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
			>
				<MoreVertical className="h-3.5 w-3.5 text-[#a0a0a0]" />
			</button>
			{showMenu && (
				<>
					<div
						className="fixed inset-0 z-10"
						onClick={(e) => {
							e.stopPropagation();
							setShowMenu(false);
						}}
					/>
					<div className="absolute right-0 top-full mt-1 z-20 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[140px]">
						<button
							onClick={startRename}
							className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2 text-[#e0e0e0] transition-colors"
						>
							<Pencil className="h-3.5 w-3.5 text-[#707070]" />
							Rename
						</button>
						<button
							onClick={(e) => {
								e.stopPropagation();
								router.push(`/editor/${project.id}`);
							}}
							className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2 text-[#e0e0e0] transition-colors"
						>
							<ExternalLink className="h-3.5 w-3.5 text-[#707070]" />
							Open
						</button>
						<div className="h-px bg-white/8 my-1" />
						<button
							onClick={handleDelete}
							className="w-full px-3 py-2 text-left text-sm hover:bg-red-500/10 flex items-center gap-2 text-red-400 transition-colors"
						>
							<Trash2 className="h-3.5 w-3.5" />
							Delete
						</button>
					</div>
				</>
			)}
		</div>
	);

	// ── List view ──────────────────────────────────────────────
	if (viewMode === "list") {
		return (
			<div
				onClick={handleOpen}
				className="group flex items-center gap-4 px-4 py-3 border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer last:border-0"
			>
				{/* Thumb */}
				<div className="relative h-12 w-20 shrink-0 rounded-lg overflow-hidden bg-white/5 border border-white/8">
					{project.thumbnail_url ? (
						<img
							src={project.thumbnail_url}
							alt={project.name}
							className="w-full h-full object-cover"
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center">
							<Video className="h-5 w-5 text-[#404040]" />
						</div>
					)}
				</div>

				{/* Name */}
				<div className="flex-1 min-w-0">
					{isRenaming ? (
						<input
							ref={inputRef}
							value={renameValue}
							autoFocus
							disabled={isSaving}
							onChange={(e) => setRenameValue(e.target.value)}
							onBlur={commitRename}
							onKeyDown={handleRenameKeyDown}
							onClick={(e) => e.stopPropagation()}
							className="w-full text-sm font-semibold bg-[#222] border border-[#ff6a00]/50 rounded px-2 py-1 outline-none text-white"
						/>
					) : (
						<p
							className="text-sm font-semibold text-white truncate"
							onDoubleClick={startRename}
						>
							{project.name}
						</p>
					)}
				</div>

				{/* Meta */}
				<div className="hidden md:flex items-center gap-4 text-xs text-[#606060] shrink-0">
					{aspect && (
						<span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/8">
							{aspect}
						</span>
					)}
					{duration && <span className="font-mono">{duration}</span>}
					<span className="flex items-center gap-1">
						<Clock className="h-3 w-3" />
						{lastEdited}
					</span>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
					<button
						onClick={(e) => {
							e.stopPropagation();
							setIsNavigating(true);
							router.push(`/editor/${project.id}`);
						}}
						disabled={isNavigating}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff6a00] hover:bg-[#ff7a1a] text-white text-xs font-semibold transition-colors disabled:opacity-70"
					>
						{isNavigating ? (
							<div className="h-3 w-3 rounded-full border border-white/40 border-t-white animate-spin" />
						) : (
							<Play className="h-3 w-3 fill-white" />
						)}
						{isNavigating ? "Opening…" : "Open"}
					</button>
					<MenuButton />
				</div>
			</div>
		);
	}

	// ── Grid view ──────────────────────────────────────────────
	return (
		<div
			onClick={handleOpen}
			className="group relative bg-[#111111] border border-white/8 rounded-xl cursor-pointer hover:border-[#ff6a00]/30 hover:shadow-lg hover:shadow-[#ff6a00]/5 transition-all duration-200 overflow-hidden"
		>
			{/* Thumbnail */}
			<div className="aspect-video bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
				{project.thumbnail_url ? (
					<img
						src={project.thumbnail_url}
						alt={project.name}
						className="w-full h-full object-cover"
					/>
				) : (
					<div className="flex flex-col items-center text-[#303030]">
						<Video className="h-12 w-12 mb-1.5" />
						<span className="text-xs">No preview</span>
					</div>
				)}

				{/* Hover overlay */}
				<div className={`absolute inset-0 bg-black/50 transition-opacity flex items-center justify-center ${isNavigating ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
					{isNavigating ? (
						<div className="flex flex-col items-center gap-2">
							<div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
							<span className="text-white text-xs font-medium">Opening…</span>
						</div>
					) : (
						<div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2">
							<Play className="h-3.5 w-3.5 text-white fill-white" />
							<span className="text-white text-sm font-medium">Open</span>
						</div>
					)}
				</div>

				{/* Badges */}
				<div className="absolute top-2 left-2 flex items-center gap-1.5">
					{aspect && (
						<span className="bg-black/70 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
							{aspect}
						</span>
					)}
					{duration && (
						<span className="bg-black/70 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
							{duration}
						</span>
					)}
				</div>

				{/* Menu button top-right */}
				<div
					className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
					onClick={(e) => e.stopPropagation()}
				>
					<MenuButton />
				</div>
			</div>

			{/* Info */}
			<div className="p-3.5">
				{isRenaming ? (
					<input
						ref={inputRef}
						value={renameValue}
						autoFocus
						disabled={isSaving}
						onChange={(e) => setRenameValue(e.target.value)}
						onBlur={commitRename}
						onKeyDown={handleRenameKeyDown}
						onClick={(e) => e.stopPropagation()}
						className="w-full text-sm font-semibold bg-[#222] border border-[#ff6a00]/50 rounded px-2 py-1 outline-none text-white mb-1.5"
					/>
				) : (
					<h3
						className="font-semibold text-sm text-white truncate mb-1.5"
						onDoubleClick={startRename}
						title={project.name}
					>
						{project.name}
					</h3>
				)}
				<div className="flex items-center gap-1 text-[11px] text-[#606060]">
					<Clock className="h-3 w-3" />
					<span>{lastEdited}</span>
				</div>
			</div>
		</div>
	);
}
