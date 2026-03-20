"use client";

/**
 * User Menu Component
 * Shows user avatar and sign-out button in header
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { signOut } from "@/lib/auth/actions";
import { LogOut, Settings } from "lucide-react";
import { toast } from "sonner";

export function UserMenu() {
	const { user, isAuthenticated } = useAuth();
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	if (!isAuthenticated || !user) {
		return null;
	}

	const handleSignOut = async () => {
		setLoading(true);
		try {
			await signOut();
			toast.success("Signed out successfully");
			router.push("/login");
		} catch (error) {
			toast.error("Failed to sign out");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="relative">
			{/* User Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors group"
			>
				<div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm group-hover:shadow-md transition-all">
					{user.displayName
						? user.displayName.charAt(0).toUpperCase()
						: user.email?.charAt(0).toUpperCase()}
				</div>
				<div className="hidden md:block text-left">
					<div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
						{user.displayName || "User"}
					</div>
					<div className="text-xs text-muted-foreground truncate max-w-[120px]">
						{user.email}
					</div>
				</div>
			</button>

			{/* Dropdown Menu */}
			{isOpen && (
				<>
					{/* Backdrop */}
					<div
						className="fixed inset-0 z-10"
						onClick={() => setIsOpen(false)}
					/>

					{/* Menu */}
					<div className="absolute right-0 mt-2 w-64 rounded-xl shadow-2xl bg-popover border border-border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
						{/* User Info */}
						<div className="px-4 py-4 border-b border-border bg-muted/30">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
									{user.displayName
										? user.displayName.charAt(0).toUpperCase()
										: user.email?.charAt(0).toUpperCase()}
								</div>
								<div className="overflow-hidden">
									<div className="text-sm font-bold text-foreground truncate">
										{user.displayName || "User"}
									</div>
									<div className="text-xs text-muted-foreground truncate">
										{user.email}
									</div>
								</div>
							</div>
						</div>

						{/* Settings */}
						<div className="p-2">
							<Link
								href="/settings"
								className="w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors"
							>
								<Settings size={16} />
								Settings
							</Link>
						</div>

						{/* Sign Out */}
						<div className="p-2">
							<button
								onClick={handleSignOut}
								disabled={loading}
								className="w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg hover:bg-destructive/10 text-destructive font-medium transition-colors disabled:opacity-50"
							>
								<LogOut size={16} />
								{loading ? "Signing out..." : "Sign out"}
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
