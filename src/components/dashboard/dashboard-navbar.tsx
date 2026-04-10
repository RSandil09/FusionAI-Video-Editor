"use client";

import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { LogoIcons } from "@/components/shared/logos";
import { Button } from "@/components/ui/button";
import { Plus, Search, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import NewProjectModal from "@/components/dashboard/new-project-modal";
import { cn } from "@/lib/utils";

interface SearchResult {
	id: string;
	label: string;
	sub: string;
	href: string;
	type: "project" | "asset";
}

interface DashboardNavbarProps {
	searchItems?: SearchResult[];
}

export function DashboardNavbar({ searchItems = [] }: DashboardNavbarProps) {
	const router = useRouter();
	const [showNewProject, setShowNewProject] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const results = query.trim()
		? searchItems.filter((item) =>
				item.label.toLowerCase().includes(query.toLowerCase()),
			)
		: [];

	// ⌘K / Ctrl+K opens search
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setSearchOpen(true);
				setTimeout(() => inputRef.current?.focus(), 0);
			}
			if (e.key === "Escape") {
				setSearchOpen(false);
				setQuery("");
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, []);

	const handleSelect = (href: string) => {
		setSearchOpen(false);
		setQuery("");
		router.push(href);
	};

	return (
		<>
			<div className="sticky top-4 z-50 w-full px-4 mb-8">
				<nav className="mx-auto max-w-6xl flex items-center justify-between h-14 px-4 sm:px-5 rounded-2xl border border-border/50 bg-background/70 backdrop-blur-xl shadow-sm transition-all duration-200 hover:border-border/80">
					{/* Left: Logo */}
					<Link
						href="/dashboard"
						className="flex items-center gap-2.5 transition-opacity hover:opacity-80 shrink-0"
					>
						<LogoIcons.scenify size={26} />
						<span className="font-bold text-base tracking-tight hidden sm:block">
							Fusion
						</span>
					</Link>

					{/* Center: Search bar */}
					<div className="flex-1 max-w-sm mx-4 relative">
						<button
							onClick={() => {
								setSearchOpen(true);
								setTimeout(() => inputRef.current?.focus(), 0);
							}}
							className={cn(
								"w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-sm transition-all duration-150",
								searchOpen
									? "border-[#ff6a00]/40 bg-[#ff6a00]/5"
									: "border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15",
							)}
						>
							<Search className="h-3.5 w-3.5 text-[#606060] shrink-0" />
							{searchOpen ? (
								<input
									ref={inputRef}
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									placeholder="Search projects & assets…"
									className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-[#505050]"
									onKeyDown={(e) => {
										if (e.key === "Enter" && results[0])
											handleSelect(results[0].href);
										if (e.key === "Escape") {
											setSearchOpen(false);
											setQuery("");
										}
									}}
								/>
							) : (
								<span className="flex-1 text-left text-[#505050]">Search…</span>
							)}
							<kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-[#404040] font-mono border border-white/8 rounded px-1 py-0.5">
								⌘K
							</kbd>
						</button>

						{/* Dropdown results */}
						{searchOpen && query.trim() && (
							<>
								<div
									className="fixed inset-0 z-40"
									onClick={() => {
										setSearchOpen(false);
										setQuery("");
									}}
								/>
								<div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-white/10 bg-[#111111] shadow-2xl shadow-black/60 overflow-hidden">
									{results.length === 0 ? (
										<div className="px-4 py-6 text-center text-sm text-[#505050]">
											No results for "{query}"
										</div>
									) : (
										<div className="py-1 max-h-64 overflow-y-auto">
											{results.map((item) => (
												<button
													key={item.id}
													onClick={() => handleSelect(item.href)}
													className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
												>
													<div className="h-7 w-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
														{item.type === "project" ? (
															<svg
																className="h-3.5 w-3.5 text-[#ff6a00]"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
																/>
															</svg>
														) : (
															<svg
																className="h-3.5 w-3.5 text-[#a0a0a0]"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
																/>
															</svg>
														)}
													</div>
													<div className="min-w-0">
														<p className="text-sm font-medium text-white truncate">
															{item.label}
														</p>
														<p className="text-xs text-[#606060] truncate">
															{item.sub}
														</p>
													</div>
												</button>
											))}
										</div>
									)}
								</div>
							</>
						)}
					</div>

					{/* Right: Actions */}
					<div className="flex items-center gap-2 shrink-0">
						<Link
							href="/settings"
							className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/8 bg-white/3 hover:bg-white/8 hover:border-white/15 transition-colors"
							title="Settings"
						>
							<Settings className="h-3.5 w-3.5 text-[#a0a0a0]" />
						</Link>

						<div className="h-5 w-px bg-white/8 mx-1 hidden sm:block" />

						<Button
							size="sm"
							onClick={() => setShowNewProject(true)}
							className="h-8 px-3.5 rounded-xl bg-[#ff6a00] hover:bg-[#ff7a1a] text-white text-xs font-semibold shadow-md shadow-[#ff6a00]/20 hover:shadow-[#ff6a00]/30 border-0 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
						>
							<Plus className="h-3.5 w-3.5 mr-1" />
							<span className="hidden sm:inline">New Project</span>
							<span className="sm:hidden">New</span>
						</Button>

						<div className="h-5 w-px bg-white/8 mx-1 hidden sm:block" />
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
