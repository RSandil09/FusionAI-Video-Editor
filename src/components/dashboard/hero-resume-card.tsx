"use client";

import { useRouter } from "next/navigation";
import { Play, Clock, Video } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/lib/db/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

interface HeroResumeCardProps {
	project: Project;
}

function formatDuration(seconds: number | null): string {
	if (!seconds || seconds <= 0) return "";
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

function getAspectLabel(w: number | null, h: number | null): string {
	if (!w || !h) return "";
	const ratio = w / h;
	if (Math.abs(ratio - 16 / 9) < 0.05) return "16:9";
	if (Math.abs(ratio - 9 / 16) < 0.05) return "9:16";
	if (Math.abs(ratio - 1) < 0.05) return "1:1";
	return `${w}×${h}`;
}

export function HeroResumeCard({ project }: HeroResumeCardProps) {
	const router = useRouter();
	const duration = formatDuration(project.duration);
	const aspect = getAspectLabel(
		project.resolution_width,
		project.resolution_height,
	);
	const resolution =
		project.resolution_width && project.resolution_height
			? `${project.resolution_width}×${project.resolution_height}`
			: null;
	const lastEdited = formatDistanceToNow(
		new Date(project.last_accessed_at || project.updated_at),
		{ addSuffix: true },
	);

	return (
		<div className="relative w-full rounded-2xl border border-white/8 bg-[#111111] overflow-hidden mb-6 group">
			{/* Background thumbnail blur */}
			{project.thumbnail_url && (
				<div
					className="absolute inset-0 opacity-15 bg-cover bg-center scale-110 blur-2xl"
					style={{ backgroundImage: `url(${project.thumbnail_url})` }}
				/>
			)}
			<div className="absolute inset-0 bg-gradient-to-r from-[#0e0e0e] via-[#0e0e0e]/80 to-transparent" />

			<div className="relative flex items-center gap-6 p-5">
				{/* Thumbnail */}
				<div
					className="relative shrink-0 w-36 aspect-video rounded-xl overflow-hidden border border-white/10 cursor-pointer"
					onClick={() => router.push(`/editor/${project.id}`)}
				>
					{project.thumbnail_url ? (
						<img
							src={project.thumbnail_url}
							alt={project.name}
							className="w-full h-full object-cover"
						/>
					) : (
						<div className="w-full h-full bg-white/5 flex items-center justify-center">
							<Video className="h-8 w-8 text-[#404040]" />
						</div>
					)}
					{/* Play overlay */}
					<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
						<div className="h-9 w-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
							<Play className="h-4 w-4 text-white fill-white ml-0.5" />
						</div>
					</div>
					{duration && (
						<div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
							{duration}
						</div>
					)}
				</div>

				{/* Info */}
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<span className="text-[10px] font-semibold tracking-widest text-[#ff6a00] uppercase">
							Continue Editing
						</span>
					</div>
					<h2 className="text-lg font-bold text-white truncate mb-2">
						{project.name}
					</h2>
					<div className="flex flex-wrap items-center gap-3 text-xs text-[#707070]">
						<span className="flex items-center gap-1">
							<Clock className="h-3 w-3" />
							{lastEdited}
						</span>
						{resolution && (
							<span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/8 font-mono">
								{resolution}
							</span>
						)}
						{aspect && (
							<span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/8">
								{aspect}
							</span>
						)}
					</div>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-2 shrink-0">
					<button
						onClick={() => router.push(`/editor/${project.id}`)}
						className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff6a00] hover:bg-[#ff7a1a] text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-[#ff6a00]/20 hover:scale-[1.02] active:scale-[0.98]"
					>
						<Play className="h-3.5 w-3.5 fill-white" />
						Resume
					</button>
				</div>
			</div>
		</div>
	);
}
