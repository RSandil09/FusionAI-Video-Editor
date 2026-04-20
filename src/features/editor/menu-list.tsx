import { memo, useCallback } from "react";
import useLayoutStore from "./store/use-layout-store";
import { useSmartEditStore } from "./store/use-smart-edit-store";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { MenuItem } from "./menu-item/menu-item";
import { useIsLargeScreen } from "@/hooks/use-media-query";

// Define menu items configuration for better maintainability
const MENU_ITEMS = [
	{
		id: "templates",
		icon: Icons.templates,
		label: "Templates",
		ariaLabel: "Browse ready-made templates",
	},
	{
		id: "uploads",
		icon: Icons.upload,
		label: "Uploads",
		ariaLabel: "Add and manage uploads",
	},
	{
		id: "texts",
		icon: Icons.type,
		label: "Texts",
		ariaLabel: "Add and edit text elements",
	},
	{
		id: "elements",
		icon: Icons.elements,
		label: "Elements",
		ariaLabel: "Add shapes, stickers and visualizers",
	},
	{
		id: "videos",
		icon: Icons.video,
		label: "Videos",
		ariaLabel: "Add and manage video content",
	},
	{
		id: "captions",
		icon: Icons.captions,
		label: "Captions",
		ariaLabel: "Add and edit captions",
	},
	{
		id: "images",
		icon: Icons.image,
		label: "Images",
		ariaLabel: "Add and manage images",
	},
	{
		id: "audios",
		icon: Icons.audio,
		label: "Audio",
		ariaLabel: "Add and manage audio content",
	},
	{
		id: "transitions",
		icon: Icons.transition, // Custom SVG for transitions
		label: "Transitions",
		ariaLabel: "Add transition effects",
	},
	{
		id: "filters",
		icon: Icons.filters,
		label: "Filters",
		ariaLabel: "Apply filters and color adjustments",
	},
	{
		id: "ai-image",
		icon: Icons.style,
		label: "AI Image",
		ariaLabel: "Generate images with AI",
	},
	{
		id: "ai-edit",
		icon: Icons.smart,
		label: "Smart Edit",
		ariaLabel: "AI-powered smart editing tools",
	},
] as const;

// Memoized menu button component for better performance
const MenuButton = memo<{
	item: (typeof MENU_ITEMS)[number];
	isActive: boolean;
	onClick: (menuItem: string) => void;
	badge?: number | null;
}>(({ item, isActive, onClick, badge }) => {
	const handleClick = useCallback(() => {
		onClick(item.id);
	}, [item.id, onClick]);

	const IconComponent = item.icon;

	return (
		<Button
			onClick={handleClick}
			className={cn(
				"w-full flex items-center justify-start rounded-xl transition-all duration-200 border-0",
				"h-10 px-0 hover:bg-secondary/50 mx-2",
				isActive
					? "bg-secondary/80 text-foreground font-medium shadow-sm"
					: "text-muted-foreground hover:text-foreground",
			)}
			variant="ghost"
			aria-label={item.ariaLabel}
			aria-pressed={isActive}
		>
			<div className="relative w-10 h-10 flex-none flex items-center justify-center shrink-0 rounded-lg">
				{IconComponent ? <IconComponent width={18} height={18} /> : null}
				{badge != null && badge > 0 && (
					<span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 flex items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
						{badge > 99 ? "99+" : badge}
					</span>
				)}
			</div>
			<span className="text-[13px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
				{item.label}
			</span>
		</Button>
	);
});

MenuButton.displayName = "MenuButton";

// Main MenuList component
function MenuList() {
	const {
		setActiveMenuItem,
		setShowMenuItem,
		activeMenuItem,
		showMenuItem,
		drawerOpen,
		setDrawerOpen,
	} = useLayoutStore();
	const { analysisResult } = useSmartEditStore();
	const isLargeScreen = useIsLargeScreen();

	const handleMenuItemClick = useCallback(
		(menuItem: string) => {
			setActiveMenuItem(menuItem as any);
			// Use drawer on mobile, sidebar on desktop
			if (!isLargeScreen) {
				setDrawerOpen(true);
			} else {
				setShowMenuItem(true);
			}
		},
		[isLargeScreen, setActiveMenuItem, setDrawerOpen, setShowMenuItem],
	);

	const handleDrawerOpenChange = useCallback(
		(open: boolean) => {
			setDrawerOpen(open);
		},
		[setDrawerOpen],
	);

	return (
		<>
			<div className="w-14 h-full relative z-40 shrink-0">
				<nav
					className="group absolute left-0 top-0 h-full w-14 hover:w-56 flex flex-col items-stretch gap-1 border-r border-border/60 py-3.5 bg-muted/50 backdrop-blur-sm transition-[width] duration-300 ease-out overflow-hidden"
					role="toolbar"
					aria-label="Editor tools"
				>
					{MENU_ITEMS.map((item) => {
						const isActive =
							(drawerOpen && activeMenuItem === item.id) ||
							(showMenuItem && activeMenuItem === item.id);

						return (
							<MenuButton
								key={item.id}
								item={item}
								isActive={isActive}
								onClick={handleMenuItemClick}
								badge={
									item.id === "ai-edit"
										? analysisResult?.segments?.length
										: undefined
								}
							/>
						);
					})}
				</nav>
			</div>

			{/* Drawer only on mobile/tablet - conditionally mounted */}
			{!isLargeScreen && (
				<Drawer open={drawerOpen} onOpenChange={handleDrawerOpenChange}>
					<DrawerContent className="max-h-[80vh]">
						<DrawerHeader>
							<DrawerTitle className="capitalize">{activeMenuItem}</DrawerTitle>
						</DrawerHeader>
						<div className="flex-1 overflow-auto">
							<MenuItem />
						</div>
					</DrawerContent>
				</Drawer>
			)}
		</>
	);
}

export default memo(MenuList);
