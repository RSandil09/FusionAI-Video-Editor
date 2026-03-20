"use client";

/**
 * Project Card Component
 * Displays project thumbnail and metadata with rename/delete actions
 */

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Trash2, Clock, Pencil } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { getIdToken } from "@/lib/auth/client";
import type { Database } from "@/lib/db/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

interface ProjectCardProps {
	project: Project;
	onDelete?: (projectId: string) => void;
	onRename?: (projectId: string, newName: string) => void;
}

export function ProjectCard({ project, onDelete, onRename }: ProjectCardProps) {
	const router = useRouter();
	const [showMenu, setShowMenu] = React.useState(false);
	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState(project.name);
	const [isSaving, setIsSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleOpen = () => {
		if (isRenaming) return;
		router.push(`/editor/${project.id}`);
	};

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (confirm(`Delete "${project.name}"?`)) {
			onDelete?.(project.id);
		}
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
				toast.error(err.message || "Failed to rename project");
				setRenameValue(project.name);
			}
		} catch (e: any) {
			toast.error(`Rename error: ${e.message}`);
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

	return (
		<div
			onClick={handleOpen}
			className="group relative bg-card border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-all duration-200 hover:shadow-lg"
		>
			{/* Thumbnail */}
			<div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden rounded-t-lg">
				{project.thumbnail_url ? (
					<img
						src={project.thumbnail_url}
						alt={project.name}
						className="w-full h-full object-cover"
					/>
				) : (
					<div className="flex flex-col items-center text-muted-foreground">
						<svg
							className="h-16 w-16 mb-2"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
							/>
						</svg>
						<span className="text-sm">No preview</span>
					</div>
				)}

				{/* Hover overlay */}
				<div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
					<span className="text-white font-medium">Open Project</span>
				</div>

				{/* Resolution badge */}
				<div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
					{project.resolution_width}x{project.resolution_height}
				</div>
			</div>

			{/* Info */}
			<div className="p-4">
				<div className="flex items-start justify-between gap-2">
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
								className="w-full text-base font-semibold bg-background border border-primary rounded px-1 py-0 outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
							/>
						) : (
							<h3
								className="font-semibold truncate text-base mb-1 cursor-text"
								onDoubleClick={startRename}
								title="Double-click to rename"
							>
								{project.name}
							</h3>
						)}
						<div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
							<Clock className="h-3.5 w-3.5" />
							<span>
								{formatDistanceToNow(new Date(project.updated_at), {
									addSuffix: true,
								})}
							</span>
						</div>
					</div>

					{/* Menu */}
					<div className="relative">
						<button
							onClick={(e) => {
								e.stopPropagation();
								setShowMenu(!showMenu);
							}}
							className="p-1 hover:bg-accent rounded transition-colors"
						>
							<MoreVertical className="h-4 w-4" />
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
								<div className="absolute right-0 top-full mt-1 z-20 bg-popover border border-white/10 rounded-lg shadow-xl py-1 min-w-[140px]">
									<button
										onClick={startRename}
										className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2"
									>
										<Pencil className="h-4 w-4" />
										Rename
									</button>
									<button
										onClick={handleDelete}
										className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-destructive"
									>
										<Trash2 className="h-4 w-4" />
										Delete
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
