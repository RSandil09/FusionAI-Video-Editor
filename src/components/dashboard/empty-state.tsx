"use client";

/**
 * Empty State Component
 * Shows when there's no data to display
 */

import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description: string;
	action?: {
		label: string;
		onClick: () => void;
	};
}

export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
}: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center p-12 text-center">
			<div className="p-4 bg-muted rounded-full mb-4">
				<Icon className="h-8 w-8 text-muted-foreground" />
			</div>
			<h3 className="text-lg font-semibold mb-2">{title}</h3>
			<p className="text-sm text-muted-foreground mb-6 max-w-sm">
				{description}
			</p>
			{action && (
				<button
					onClick={action.onClick}
					className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
				>
					{action.label}
				</button>
			)}
		</div>
	);
}
