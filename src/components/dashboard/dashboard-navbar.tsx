"use client";

import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { LogoIcons } from "@/components/shared/logos";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import NewProjectModal from "@/components/dashboard/new-project-modal";

export function DashboardNavbar() {
	const [showNewProject, setShowNewProject] = useState(false);

	return (
		<>
			<div className="sticky top-6 z-50 w-full px-4 mb-8">
				<nav className="mx-auto max-w-6xl flex items-center justify-between h-16 px-4 sm:px-6 rounded-2xl border border-border/50 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40 shadow-sm backdrop-saturate-150 transition-all duration-200 hover:bg-background/80 hover:border-border/80 hover:shadow-md">
					{/* Left: Logo */}
					<div className="flex items-center gap-8">
						{/* Logo */}
						<Link
							href="/dashboard"
							className="flex items-center gap-3 transition-opacity hover:opacity-80"
						>
							<LogoIcons.scenify size={28} className="text-primary" />
							<span className="font-display font-bold text-lg tracking-tight">
								Fusion
							</span>
						</Link>
					</div>

					{/* Right: Actions */}
					<div className="flex items-center gap-3">
						{/* New Project Button */}
						<Button
							size="sm"
							onClick={() => setShowNewProject(true)}
							className="hidden sm:flex bg-white/5 hover:bg-white/10 text-foreground border border-white/10 backdrop-blur-md shadow-lg shadow-black/5 rounded-full px-5 transition-all duration-300 hover:scale-105 hover:shadow-primary/20 hover:border-primary/30"
						>
							<Plus className="h-4 w-4 mr-1.5" />
							New Project
						</Button>

						{/* Mobile New Project Icon */}
						<Button
							size="icon"
							variant="default"
							onClick={() => setShowNewProject(true)}
							className="sm:hidden h-9 w-9 bg-white/5 hover:bg-white/10 text-foreground border border-white/10 backdrop-blur-md shadow-lg rounded-full transition-all duration-300"
						>
							<Plus className="h-4 w-4" />
						</Button>

						<div className="h-6 w-px bg-border/50 hidden sm:block mx-1" />

						{/* User Menu */}
						<UserMenu />
					</div>
				</nav>
			</div>

			<NewProjectModal
				isOpen={showNewProject}
				onClose={() => setShowNewProject(false)}
			/>
		</>
	);
}
