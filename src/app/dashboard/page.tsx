"use client";

import React, { useEffect, useRef, useState } from "react";
import {
	Plus,
	Folder,
	Film,
	Image as ImageIcon,
	Music,
	File,
	LayoutGrid,
	List,
	SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import NewProjectModal from "@/components/dashboard/new-project-modal";
import {
	ProjectCard,
	type ViewMode,
} from "@/components/dashboard/project-card";
import { AssetCard } from "@/components/dashboard/asset-card";
import { HeroResumeCard } from "@/components/dashboard/hero-resume-card";
import { StatsBar } from "@/components/dashboard/stats-bar";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { getProjects, deleteProject, getProjectCount } from "@/lib/db/projects";
import { getAssets, deleteAsset } from "@/lib/db/assets";
import { getRecentRenders } from "@/lib/db/renders";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/db/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Asset = Database["public"]["Tables"]["assets"]["Row"];
type Render = Database["public"]["Tables"]["renders"]["Row"] & {
	project_name: string | null;
};

// ─── Filter / sort types ──────────────────────────────────────────────────────

type SortBy = "updated" | "created" | "name";
type AssetFilter = "all" | "video" | "image" | "audio";

const ASSET_TABS: {
	id: AssetFilter;
	label: string;
	icon: React.ElementType;
}[] = [
	{ id: "all", label: "All", icon: File },
	{ id: "video", label: "Video", icon: Film },
	{ id: "image", label: "Image", icon: ImageIcon },
	{ id: "audio", label: "Audio", icon: Music },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortProjects(projects: Project[], sort: SortBy): Project[] {
	return [...projects].sort((a, b) => {
		if (sort === "name") return a.name.localeCompare(b.name);
		if (sort === "created")
			return (
				new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
			);
		return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
	});
}

function getAssetBreakdown(assets: Asset[]) {
	return {
		video: assets.filter((a) => a.file_type === "video").length,
		image: assets.filter((a) => a.file_type === "image").length,
		audio: assets.filter((a) => a.file_type === "audio").length,
	};
}

function getRendersThisWeek(renders: Render[]): number {
	const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
	return renders.filter(
		(r) =>
			r.status === "completed" && new Date(r.created_at).getTime() > weekAgo,
	).length;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function FirstTimeJourney({ onNew }: { onNew: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center py-20 px-6 text-center border border-dashed border-white/10 rounded-2xl bg-white/2">
			<div className="h-16 w-16 rounded-2xl bg-[#ff6a00]/10 border border-[#ff6a00]/20 flex items-center justify-center mb-5">
				<Film className="h-8 w-8 text-[#ff6a00]" />
			</div>
			<h3 className="text-lg font-bold text-white mb-2">
				Create your first project
			</h3>
			<p className="text-sm text-[#707070] max-w-xs mb-6 leading-relaxed">
				Upload your footage, name your project, and let Fusion arrange it on the
				timeline automatically.
			</p>
			<button
				onClick={onNew}
				className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff6a00] hover:bg-[#ff7a1a] text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-[#ff6a00]/20 hover:scale-[1.02] active:scale-[0.98]"
			>
				<Plus className="h-4 w-4" />
				Start your first project
			</button>
		</div>
	);
}

// ─── Tabs helper ─────────────────────────────────────────────────────────────

function FilterTabs<T extends string>({
	tabs,
	active,
	onChange,
}: {
	tabs: { id: T; label: string; icon?: React.ElementType }[];
	active: T;
	onChange: (id: T) => void;
}) {
	return (
		<div className="flex items-center gap-1">
			{tabs.map(({ id, label, icon: Icon }) => (
				<button
					key={id}
					onClick={() => onChange(id)}
					className={cn(
						"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
						active === id
							? "bg-[#ff6a00]/12 text-[#ff6a00] border border-[#ff6a00]/20"
							: "text-[#707070] hover:text-white hover:bg-white/5",
					)}
				>
					{Icon && <Icon className="h-3 w-3" />}
					{label}
				</button>
			))}
		</div>
	);
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

function DashboardContent() {
	const { user } = useAuth();

	const [showNewProject, setShowNewProject] = useState(false);
	const [allProjects, setAllProjects] = useState<Project[]>([]);
	const [allAssets, setAllAssets] = useState<Asset[]>([]);
	const [renders, setRenders] = useState<Render[]>([]);
	const [projectCount, setProjectCount] = useState(0);
	const [loading, setLoading] = useState(true);

	// Project controls
	const [sortBy, setSortBy] = useState<SortBy>("updated");
	const [viewMode, setViewMode] = useState<ViewMode>("grid");

	// Asset controls
	const [assetFilter, setAssetFilter] = useState<AssetFilter>("all");

	// Render polling
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (user) loadData();
	}, [user]);

	// Poll while any render is in progress
	useEffect(() => {
		const hasActive = renders.some(
			(r) => r.status === "processing" || r.status === "pending",
		);
		if (hasActive && !pollRef.current) {
			pollRef.current = setInterval(async () => {
				if (!user) return;
				const fresh = await getRecentRenders(user.uid, 10);
				setRenders(fresh);
			}, 3000);
		}
		if (!hasActive && pollRef.current) {
			clearInterval(pollRef.current);
			pollRef.current = null;
		}
		return () => {
			if (pollRef.current) {
				clearInterval(pollRef.current);
				pollRef.current = null;
			}
		};
	}, [renders, user]);

	async function loadData() {
		if (!user) return;
		setLoading(true);
		try {
			const [projects, assets, count, recentRenders] = await Promise.all([
				getProjects(user.uid, { sortBy: "updated_at", limit: 100 }),
				getAssets(user.uid),
				getProjectCount(user.uid),
				getRecentRenders(user.uid, 10),
			]);
			setAllProjects(projects);
			setAllAssets(assets);
			setProjectCount(count);
			setRenders(recentRenders);
		} catch {
			toast.error("Failed to load dashboard");
		} finally {
			setLoading(false);
		}
	}

	const handleDeleteProject = async (id: string) => {
		if (!user) return;
		const ok = await deleteProject(id, user.uid);
		if (ok) {
			toast.success("Project deleted");
			setAllProjects((p) => p.filter((x) => x.id !== id));
			setProjectCount((c) => c - 1);
		} else {
			toast.error("Failed to delete project");
		}
	};

	const handleRenameProject = (id: string, name: string) => {
		setAllProjects((p) => p.map((x) => (x.id === id ? { ...x, name } : x)));
	};

	const handleDeleteAsset = async (id: string) => {
		const ok = await deleteAsset(id);
		if (ok) {
			toast.success("Asset deleted");
			setAllAssets((a) => a.filter((x) => x.id !== id));
		} else {
			toast.error("Failed to delete asset");
		}
	};

	// ── Derived data ──────────────────────────────────────────
	const displayedProjects = sortProjects(allProjects, sortBy);
	const displayedAssets =
		assetFilter === "all"
			? allAssets
			: allAssets.filter((a) => a.file_type === assetFilter);

	const lastProject = allProjects[0] ?? null;
	const storageUsed = allAssets.reduce((sum, a) => sum + a.file_size, 0);
	const assetBreakdown = getAssetBreakdown(allAssets);
	const rendersThisWeek = getRendersThisWeek(renders);

	// Search items for navbar
	const searchItems = [
		...allProjects.map((p) => ({
			id: p.id,
			label: p.name,
			sub: "Project",
			href: `/editor/${p.id}`,
			type: "project" as const,
		})),
		...allAssets.map((a) => ({
			id: a.id,
			label: a.file_name,
			sub: `${a.file_type} · ${(a.file_size / 1024 / 1024).toFixed(1)} MB`,
			href: `/dashboard`,
			type: "asset" as const,
		})),
	];

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[#0e0e0e]">
				<div className="flex flex-col items-center gap-3">
					<div className="h-8 w-8 rounded-full border-2 border-[#ff6a00]/30 border-t-[#ff6a00] animate-spin" />
					<p className="text-sm text-[#707070]">Loading your workspace…</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#0e0e0e]">
			<DashboardNavbar searchItems={searchItems} />

			<main className="container mx-auto px-4 sm:px-6 pb-16 max-w-6xl">
				{/* Welcome */}
				<div className="mb-6">
					<h1 className="text-2xl font-bold text-white tracking-tight">
						{allProjects.length === 0
							? "Welcome to Fusion"
							: `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user?.displayName?.split(" ")[0] || "Editor"}`}
					</h1>
					<p className="text-sm text-[#707070] mt-0.5">
						{allProjects.length === 0
							? "Let's create your first project"
							: `${projectCount} project${projectCount !== 1 ? "s" : ""} · ${allAssets.length} asset${allAssets.length !== 1 ? "s" : ""}`}
					</p>
				</div>

				{/* Hero resume card */}
				{lastProject && <HeroResumeCard project={lastProject} />}

				{/* Stats */}
				<StatsBar
					projectCount={projectCount}
					assetCount={allAssets.length}
					assetBreakdown={assetBreakdown}
					storageUsed={storageUsed}
					renderCount={renders.length}
					rendersThisWeek={rendersThisWeek}
				/>

				{/* Main 2-column layout */}
				<div className="flex gap-5">
					{/* Left: Projects + Assets */}
					<div className="flex-1 min-w-0 space-y-8">
						{/* ── Projects ── */}
						<section>
							<div className="flex items-center justify-between gap-3 mb-4">
								<h2 className="text-base font-bold text-white">Projects</h2>
								<div className="flex items-center gap-2 ml-auto">
									{/* Sort */}
									<div className="relative">
										<select
											value={sortBy}
											onChange={(e) => setSortBy(e.target.value as SortBy)}
											className="appearance-none text-xs text-[#a0a0a0] bg-white/3 border border-white/8 rounded-lg pl-2.5 pr-6 py-1.5 focus:outline-none focus:border-white/20 cursor-pointer"
										>
											<option value="updated">Last edited</option>
											<option value="created">Newest</option>
											<option value="name">Name</option>
										</select>
										<SlidersHorizontal className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#606060] pointer-events-none" />
									</div>

									{/* View toggle */}
									<div className="flex items-center border border-white/8 rounded-lg overflow-hidden">
										<button
											onClick={() => setViewMode("grid")}
											className={cn(
												"flex items-center justify-center h-7 w-7 transition-colors",
												viewMode === "grid"
													? "bg-white/10 text-white"
													: "text-[#606060] hover:text-white",
											)}
										>
											<LayoutGrid className="h-3.5 w-3.5" />
										</button>
										<button
											onClick={() => setViewMode("list")}
											className={cn(
												"flex items-center justify-center h-7 w-7 transition-colors",
												viewMode === "list"
													? "bg-white/10 text-white"
													: "text-[#606060] hover:text-white",
											)}
										>
											<List className="h-3.5 w-3.5" />
										</button>
									</div>
								</div>
							</div>

							{allProjects.length === 0 ? (
								<FirstTimeJourney onNew={() => setShowNewProject(true)} />
							) : displayedProjects.length === 0 ? (
								<div className="py-12 text-center border border-dashed border-white/8 rounded-xl">
									<Folder className="h-8 w-8 text-[#303030] mx-auto mb-2" />
									<p className="text-sm text-[#505050]">No projects yet</p>
								</div>
							) : viewMode === "grid" ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
									{displayedProjects.map((project) => (
										<ProjectCard
											key={project.id}
											project={project}
											viewMode="grid"
											onDelete={handleDeleteProject}
											onRename={handleRenameProject}
										/>
									))}
									{/* Add new card */}
									<button
										onClick={() => setShowNewProject(true)}
										className="aspect-video border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-[#505050] hover:text-[#ff6a00] hover:border-[#ff6a00]/30 hover:bg-[#ff6a00]/3 transition-all duration-150"
									>
										<Plus className="h-6 w-6" />
										<span className="text-xs font-medium">New Project</span>
									</button>
								</div>
							) : (
								<div className="rounded-xl border border-white/8 bg-[#111111] overflow-hidden">
									{displayedProjects.map((project) => (
										<ProjectCard
											key={project.id}
											project={project}
											viewMode="list"
											onDelete={handleDeleteProject}
											onRename={handleRenameProject}
										/>
									))}
								</div>
							)}
						</section>

						{/* ── Assets ── */}
						{allAssets.length > 0 && (
							<section>
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-base font-bold text-white">
										Media Library
									</h2>
									<FilterTabs
										tabs={ASSET_TABS}
										active={assetFilter}
										onChange={setAssetFilter}
									/>
								</div>

								{displayedAssets.length === 0 ? (
									<div className="py-10 text-center border border-dashed border-white/8 rounded-xl">
										<p className="text-sm text-[#505050]">
											No {assetFilter} assets
										</p>
									</div>
								) : (
									<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
										{displayedAssets.map((asset) => (
											<AssetCard
												key={asset.id}
												asset={asset}
												onDelete={handleDeleteAsset}
											/>
										))}
									</div>
								)}
							</section>
						)}
					</div>

					{/* Right: Activity feed */}
					<aside className="hidden lg:flex flex-col w-72 shrink-0">
						<div className="sticky top-24">
							<h2 className="text-base font-bold text-white mb-4">Activity</h2>
							<ActivityFeed renders={renders} assets={allAssets.slice(0, 10)} />
						</div>
					</aside>
				</div>
			</main>

			<NewProjectModal
				isOpen={showNewProject}
				onClose={() => setShowNewProject(false)}
			/>
		</div>
	);
}

export default function DashboardPage() {
	return (
		<ProtectedRoute>
			<DashboardContent />
		</ProtectedRoute>
	);
}
