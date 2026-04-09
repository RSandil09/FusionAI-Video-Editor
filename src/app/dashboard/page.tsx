"use client";

/**
 * Dashboard Page
 * Main dashboard with projects, assets, and stats
 */

import React, { useEffect, useState } from "react";
import { Plus, Folder, File, HardDrive, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardNavbar } from "@/components/dashboard/dashboard-navbar";
import NewProjectModal from "@/components/dashboard/new-project-modal";
import { ProjectCard } from "@/components/dashboard/project-card";
import { AssetCard } from "@/components/dashboard/asset-card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { getProjects, deleteProject, getProjectCount } from "@/lib/db/projects";
import { getAssets, deleteAsset } from "@/lib/db/assets";
import { toast } from "sonner";
import type { Database } from "@/lib/db/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Asset = Database["public"]["Tables"]["assets"]["Row"];

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + " " + sizes[i];
}

function DashboardContent() {
	const { user } = useAuth();
	const router = useRouter();
	const [showNewProject, setShowNewProject] = useState(false);
	const [projects, setProjects] = useState<Project[]>([]);
	const [assets, setAssets] = useState<Asset[]>([]);
	const [stats, setStats] = useState({
		projectCount: 0,
		assetCount: 0,
		storageUsed: 0,
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (user) {
			loadData();
		}
	}, [user]);

	const loadData = async () => {
		if (!user) return;

		setLoading(true);
		try {
			// Load projects and assets in parallel
			const [projectsData, assetsData, projectCount] = await Promise.all([
				getProjects(user.uid, { sortBy: "updated_at", limit: 6 }),
				getAssets(user.uid),
				getProjectCount(user.uid),
			]);

			setProjects(projectsData);
			setAssets(assetsData.slice(0, 8)); // Show first 8 assets

			// Calculate stats
			const totalStorage = assetsData.reduce(
				(sum, asset) => sum + asset.file_size,
				0,
			);
			setStats({
				projectCount,
				assetCount: assetsData.length,
				storageUsed: totalStorage,
			});
		} catch (error) {
			console.error("Error loading dashboard data:", error);
			toast.error("Failed to load dashboard");
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteProject = async (projectId: string) => {
		if (!user) return;
		const success = await deleteProject(projectId, user.uid);
		if (success) {
			toast.success("Project deleted");
			loadData(); // Reload
		} else {
			toast.error("Failed to delete project");
		}
	};

	const handleRenameProject = (projectId: string, newName: string) => {
		// Optimistically update the local list so the card reflects the new name immediately
		setProjects((prev) =>
			prev.map((p) => (p.id === projectId ? { ...p, name: newName } : p)),
		);
	};

	const handleDeleteAsset = async (assetId: string) => {
		const success = await deleteAsset(assetId);
		if (success) {
			toast.success("Asset deleted");
			loadData(); // Reload
		} else {
			toast.error("Failed to delete asset");
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background font-sans selection:bg-primary/20">
			<DashboardNavbar />

			<main className="container mx-auto px-6 py-10 max-w-6xl">
				{/* Header Actions */}
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-foreground">
							Dashboard
						</h1>
						<p className="text-muted-foreground mt-1 text-base">
							Welcome back,{" "}
							<span className="text-foreground font-medium">
								{user?.displayName?.split(" ")[0] || "Editor"}
							</span>
						</p>
					</div>
					<div className="flex items-center gap-3">
						<button
							onClick={() => setShowNewProject(true)}
							className="inline-flex items-center justify-center rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] h-11 px-5 py-2 shadow-lg shadow-primary/20"
						>
							<Plus className="mr-2 h-4 w-4" />
							New Project
						</button>
					</div>
				</div>

				{/* Stats Overview */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
					<div className="p-1 rounded-2xl bg-gradient-to-b from-border/50 to-border/10">
						<StatsCard
							icon={Folder}
							label="Active Projects"
							value={stats.projectCount}
						/>
					</div>
					<div className="p-1 rounded-2xl bg-gradient-to-b from-border/50 to-border/10">
						<StatsCard
							icon={File}
							label="Total Assets"
							value={stats.assetCount}
						/>
					</div>
					<div className="p-1 rounded-2xl bg-gradient-to-b from-border/50 to-border/10">
						<StatsCard
							icon={HardDrive}
							label="Storage Usage"
							value={formatBytes(stats.storageUsed)}
						/>
					</div>
				</div>

				{/* Projects Section */}
				<section className="mb-16">
					<div className="flex items-end justify-between mb-6 border-b border-border pb-4">
						<div>
							<h2 className="text-xl font-semibold tracking-tight">
								Recent Projects
							</h2>
							<p className="text-muted-foreground text-sm mt-1">
								Continue where you left off
							</p>
						</div>
						{projects.length > 0 && (
							<button
								onClick={() => router.push("/projects")}
								className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
							>
								View all projects
							</button>
						)}
					</div>

					{projects.length === 0 ? (
						<div className="bg-card/30 border border-dashed border-border rounded-xl p-12 backdrop-blur-sm">
							<EmptyState
								icon={Folder}
								title="No projects created yet"
								description="Start your first video editing project to see it here."
								action={{
									label: "Create Project",
									onClick: () => setShowNewProject(true),
								}}
							/>
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
							{projects.map((project) => (
								<ProjectCard
									key={project.id}
									project={project}
									onDelete={handleDeleteProject}
									onRename={handleRenameProject}
								/>
							))}
						</div>
					)}
				</section>

				{/* Assets Section */}
				<section>
					<div className="flex items-end justify-between mb-6 border-b border-border pb-4">
						<div>
							<h2 className="text-xl font-semibold tracking-tight">
								Recent Assets
							</h2>
							<p className="text-muted-foreground text-sm mt-1">
								Media you've uploaded
							</p>
						</div>
						{assets.length > 0 && (
							<button
								onClick={() => router.push("/assets")}
								className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
							>
								View all assets
							</button>
						)}
					</div>

					{assets.length === 0 ? (
						<div className="bg-card/30 border border-dashed border-border rounded-xl p-12 backdrop-blur-sm">
							<EmptyState
								icon={File}
								title="Your library is empty"
								description="Upload media files to use in your projects."
								action={{
									label: "Upload File",
									onClick: () => {
										toast.info("Please go to a project to upload assets");
									},
								}}
							/>
						</div>
					) : (
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
							{assets.map((asset) => (
								<AssetCard
									key={asset.id}
									asset={asset}
									onDelete={handleDeleteAsset}
								/>
							))}
						</div>
					)}
				</section>
			</main>

			{/* New Project Modal */}
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
