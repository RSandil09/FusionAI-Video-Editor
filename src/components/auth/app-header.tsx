"use client";

/**
 * App Header Component
 * Comprehensive navigation bar with links and actions
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserMenu } from "./user-menu";
import { LogoIcons } from "@/components/shared/logos";
import { Button } from "@/components/ui/button";
import { Plus, Bell, LayoutGrid, FolderOpen, FileImage } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { NewProjectModal } from "@/components/dashboard/new-project-modal";

const NAV_LINKS = [
	{ href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
	{ href: "/projects", label: "Projects", icon: FolderOpen },
	{ href: "/assets", label: "Assets", icon: FileImage },
];

export function AppHeader() {
	const pathname = usePathname();
	const [showNewProject, setShowNewProject] = useState(false);

	return (
		<>
			<header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
				<div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
					{/* Left Section: Logo & Nav */}
					<div className="flex items-center gap-8">
						{/* Logo */}
						<Link
							href="/dashboard"
							className="flex items-center gap-2 transition-opacity hover:opacity-90"
						>
							<LogoIcons.scenify className="h-8 w-8 text-primary" />
							<span className="font-display font-bold text-lg tracking-tight">
								Fusion
							</span>
						</Link>
					</div>

					{/* Right Section: Actions */}
					<div className="flex items-center gap-3">
						{/* New Project Button (Mobile/Desktop) */}
						<Button
							size="sm"
							onClick={() => setShowNewProject(true)}
							className="hidden sm:flex bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
						>
							<Plus className="h-4 w-4 mr-1.5" />
							New Project
						</Button>

						{/* Mobile New Project Icon */}
						<Button
							size="icon"
							variant="default"
							onClick={() => setShowNewProject(true)}
							className="sm:hidden h-8 w-8 bg-primary text-primary-foreground hover:bg-primary/90"
						>
							<Plus className="h-4 w-4" />
						</Button>

						{/* Notifications */}
						<Button
							variant="ghost"
							size="icon"
							className="text-muted-foreground hover:text-foreground relative"
						>
							<Bell className="h-5 w-5" />
							<span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-primary border-2 border-background" />
						</Button>

						{/* Divider */}
						<div className="h-6 w-px bg-border/50 hidden sm:block" />

						{/* User Menu */}
						<UserMenu />
					</div>
				</div>
			</header>

			<NewProjectModal
				isOpen={showNewProject}
				onClose={() => setShowNewProject(false)}
			/>
		</>
	);
}
