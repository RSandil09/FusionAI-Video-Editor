"use client";

/**
 * Stats Card Component
 * Displays a single stat with icon and label
 */

import React from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
	icon: LucideIcon;
	label: string;
	value: string | number;
	trend?: {
		value: number;
		isPositive: boolean;
	};
}

export function StatsCard({ icon: Icon, label, value, trend }: StatsCardProps) {
	return (
		<div className="bg-card border border-border rounded-lg p-6 hover:border-primary/30 transition-colors">
			<div className="flex items-start justify-between">
				<div className="p-2.5 bg-primary/10 rounded-lg">
					<Icon className="h-5 w-5 text-primary" />
				</div>
				{trend && (
					<span
						className={`text-xs font-medium ${
							trend.isPositive ? "text-green-500" : "text-red-500"
						}`}
					>
						{trend.isPositive ? "+" : ""}
						{trend.value}%
					</span>
				)}
			</div>
			<div className="mt-4">
				<p className="text-3xl font-bold">{value}</p>
				<p className="text-sm text-muted-foreground mt-1">{label}</p>
			</div>
		</div>
	);
}
