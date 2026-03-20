"use client";

/**
 * New Project Modal
 * Comprehensive project creation: Blank or from Template, with aspect ratio, duration, FPS
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, FileVideo, Sparkles, ChevronRight } from "lucide-react";
import { useAuth } from "../auth/auth-provider";
import { createProject } from "@/lib/db/projects";
import { createEmptyEditorState } from "@/features/editor/utils/empty-state";
import {
	TEMPLATES,
	TEMPLATE_CATEGORIES,
	type TemplateDefinition,
} from "@/features/editor/data/templates-data";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface NewProjectModalProps {
	isOpen: boolean;
	onClose: () => void;
}

// ─── Aspect Ratio Presets ────────────────────────────────────────────────────
interface AspectRatioPreset {
	id: string;
	label: string;
	ratio: string;
	description: string;
	width: number;
	height: number;
	previewW: number;
	previewH: number;
}

const ASPECT_RATIOS: AspectRatioPreset[] = [
	{
		id: "portrait",
		label: "Mobile",
		ratio: "9:16",
		description: "TikTok · Reels · Shorts",
		width: 1080,
		height: 1920,
		previewW: 27,
		previewH: 48,
	},
	{
		id: "landscape",
		label: "Landscape",
		ratio: "16:9",
		description: "YouTube · Desktop",
		width: 1920,
		height: 1080,
		previewW: 48,
		previewH: 27,
	},
	{
		id: "square",
		label: "Square",
		ratio: "1:1",
		description: "Instagram feed",
		width: 1080,
		height: 1080,
		previewW: 40,
		previewH: 40,
	},
	{
		id: "instagram",
		label: "Instagram",
		ratio: "4:5",
		description: "IG portrait posts",
		width: 1080,
		height: 1350,
		previewW: 32,
		previewH: 40,
	},
];

// ─── Duration Presets (seconds) ──────────────────────────────────────────────
const DURATIONS = [
	{ label: "15s", value: 15 },
	{ label: "30s", value: 30 },
	{ label: "60s", value: 60 },
	{ label: "90s", value: 90 },
	{ label: "2 min", value: 120 },
	{ label: "5 min", value: 300 },
	{ label: "Custom", value: 0 },
];

type StartMode = "blank" | "template";

function buildEditorStateFromTemplate(
	template: TemplateDefinition,
	width: number,
	height: number,
	fps: number,
) {
	const base = createEmptyEditorState({ width, height, fps });
	const partial = template.state();
	const trackItemIds = partial.tracks.flatMap((t) => t.items);
	const tracks = partial.tracks.map((t) => ({
		...t,
		name: t.type === "text" ? "Text Track" : "Main Track",
		accepts: [
			"video",
			"image",
			"audio",
			"text",
			"caption",
			"template",
			"composition",
		],
		magnetic: false,
		static: false,
	}));
	return {
		...base,
		duration: partial.duration,
		tracks,
		trackItemsMap: partial.trackItemsMap,
		trackItemIds,
		transitionsMap: {},
	};
}

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
	const router = useRouter();
	const { user } = useAuth();
	const [loading, setLoading] = useState(false);

	const [name, setName] = useState("");
	const [startMode, setStartMode] = useState<StartMode>("blank");
	const [selectedTemplate, setSelectedTemplate] =
		useState<TemplateDefinition | null>(null);
	const [templateCategory, setTemplateCategory] = useState("All");
	const [selectedRatio, setSelectedRatio] = useState<string>("portrait");
	const [frameRate, setFrameRate] = useState<30 | 60>(30);
	const [durationPreset, setDurationPreset] = useState<number>(30);

	const activeRatio = ASPECT_RATIOS.find((r) => r.id === selectedRatio)!;
	const filteredTemplates =
		templateCategory === "All"
			? TEMPLATES
			: TEMPLATES.filter((t) => t.category === templateCategory);

	const handleCreate = async () => {
		if (!user) {
			toast.error("You must be logged in to create a project");
			return;
		}
		if (!name.trim()) {
			toast.error("Please enter a project name");
			return;
		}
		if (startMode === "template" && !selectedTemplate) {
			toast.error("Please select a template");
			return;
		}

		setLoading(true);
		try {
			const { width, height } = activeRatio;
			const durationMs =
				startMode === "template" && selectedTemplate
					? selectedTemplate.state().duration
					: durationPreset > 0
						? durationPreset * 1000
						: 30_000;

			let editorState;
			if (startMode === "template" && selectedTemplate) {
				editorState = buildEditorStateFromTemplate(
					selectedTemplate,
					width,
					height,
					frameRate,
				);
			} else {
				editorState = createEmptyEditorState({
					width,
					height,
					fps: frameRate,
				});
			}

			const project = await createProject({
				user_id: user.uid,
				name: name.trim(),
				resolution_width: width,
				resolution_height: height,
				frame_rate: frameRate,
				editor_state: editorState as any,
			});

			if (project) {
				toast.success("Project created!");
				router.push(`/editor/${project.id}`);
				onClose();
				resetForm();
			} else {
				toast.error("Failed to create project");
			}
		} catch (error) {
			console.error("Error creating project:", error);
			toast.error("Failed to create project");
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setName("");
		setStartMode("blank");
		setSelectedTemplate(null);
		setTemplateCategory("All");
		setSelectedRatio("portrait");
		setFrameRate(30);
		setDurationPreset(30);
	};

	const handleClose = () => {
		if (!loading) {
			onClose();
			resetForm();
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
			<div className="relative w-full max-w-xl max-h-[80vh] rounded-xl bg-card border border-border shadow-2xl flex flex-col mx-auto overflow-hidden">
				{/* Header */}
				<div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
					<div>
						<h2 className="text-xl font-semibold text-foreground">
							New Project
						</h2>
						<p className="text-xs text-muted-foreground mt-0.5">
							Choose your canvas settings and start from blank or a template
						</p>
					</div>
					<button
						onClick={handleClose}
						disabled={loading}
						className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1.5 hover:bg-accent"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Body - scrollable */}
				<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
					<div className="px-6 py-5 space-y-6 pb-2">
						{/* Project Name */}
						<div className="space-y-1.5">
							<label className="block text-sm font-medium text-foreground">
								Project Name
							</label>
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleCreate()}
								placeholder="My Awesome Video"
								className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
								disabled={loading}
								autoFocus
							/>
						</div>

						{/* Start from: Blank | Template */}
						<div className="space-y-2">
							<label className="block text-sm font-medium text-foreground">
								Start from
							</label>
							<div className="flex gap-2">
								<button
									onClick={() => {
										setStartMode("blank");
										setSelectedTemplate(null);
									}}
									disabled={loading}
									className={`flex-1 flex items-center gap-3 p-4 rounded-lg border transition-all ${
										startMode === "blank"
											? "border-primary bg-primary/10 text-primary"
											: "border-border bg-background hover:border-primary/40 hover:bg-accent text-muted-foreground"
									}`}
								>
									<div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
										<FileVideo className="h-5 w-5" />
									</div>
									<div className="text-left">
										<div className="font-semibold text-sm">Blank</div>
										<div className="text-xs opacity-80">
											Empty timeline, start from scratch
										</div>
									</div>
								</button>
								<button
									onClick={() => setStartMode("template")}
									disabled={loading}
									className={`flex-1 flex items-center gap-3 p-4 rounded-lg border transition-all ${
										startMode === "template"
											? "border-primary bg-primary/10 text-primary"
											: "border-border bg-background hover:border-primary/40 hover:bg-accent text-muted-foreground"
									}`}
								>
									<div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
										<Sparkles className="h-5 w-5" />
									</div>
									<div className="text-left">
										<div className="font-semibold text-sm">Template</div>
										<div className="text-xs opacity-80">
											Pre-made layouts you can customize
										</div>
									</div>
								</button>
							</div>
						</div>

						{/* Template picker (when start from template) */}
						{startMode === "template" && (
							<div className="space-y-2">
								<label className="block text-sm font-medium text-foreground">
									Choose template
								</label>
								<div className="flex gap-1.5 px-0.5 overflow-x-auto no-scrollbar pb-1">
									{TEMPLATE_CATEGORIES.map((cat) => (
										<button
											key={cat}
											onClick={() => setTemplateCategory(cat)}
											className={`flex-none py-1.5 px-3 text-xs font-semibold rounded-full transition-colors ${
												templateCategory === cat
													? "bg-primary text-primary-foreground"
													: "bg-muted text-muted-foreground hover:bg-muted/80"
											}`}
										>
											{cat}
										</button>
									))}
								</div>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
									{filteredTemplates.map((t) => {
										const isSelected = selectedTemplate?.id === t.id;
										return (
											<button
												key={t.id}
												onClick={() => setSelectedTemplate(t)}
												disabled={loading}
												className={`flex flex-col rounded-xl overflow-hidden border transition-all text-left ${
													isSelected
														? "border-primary ring-2 ring-primary/30"
														: "border-border hover:border-primary/50"
												}`}
											>
												<div
													className={`h-16 bg-gradient-to-br ${t.color} flex items-center justify-center text-2xl relative`}
												>
													{t.emoji}
													{isSelected && (
														<div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
															<ChevronRight className="h-6 w-6 text-primary-foreground" />
														</div>
													)}
												</div>
												<div className="p-2 bg-card">
													<div className="font-semibold text-xs truncate">
														{t.name}
													</div>
													<Badge
														variant="secondary"
														className="text-[9px] mt-0.5"
													>
														{t.category}
													</Badge>
												</div>
											</button>
										);
									})}
								</div>
							</div>
						)}

						{/* Aspect Ratio */}
						<div className="space-y-2">
							<label className="block text-sm font-medium text-foreground">
								Canvas Format
							</label>
							<div className="grid grid-cols-4 gap-2">
								{ASPECT_RATIOS.map((preset) => {
									const isActive = selectedRatio === preset.id;
									return (
										<button
											key={preset.id}
											onClick={() => setSelectedRatio(preset.id)}
											disabled={loading}
											className={`flex flex-col items-center gap-2.5 p-3 rounded-lg border transition-all duration-150 ${
												isActive
													? "border-primary bg-primary/10 text-primary"
													: "border-border bg-background hover:border-primary/40 hover:bg-accent text-muted-foreground"
											}`}
										>
											<div className="flex items-end justify-center h-12 w-full">
												<div
													className={`rounded-sm border-2 transition-colors ${
														isActive
															? "border-primary bg-primary/20"
															: "border-muted-foreground/40 bg-muted"
													}`}
													style={{
														width: `${preset.previewW}px`,
														height: `${preset.previewH}px`,
													}}
												/>
											</div>
											<div className="text-center">
												<div
													className={`text-xs font-semibold leading-tight ${
														isActive ? "text-primary" : "text-foreground"
													}`}
												>
													{preset.label}
												</div>
												<div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
													{preset.ratio}
												</div>
											</div>
										</button>
									);
								})}
							</div>
							<p className="text-xs text-muted-foreground mt-1 pl-0.5">
								{activeRatio.width}×{activeRatio.height}px ·{" "}
								{activeRatio.description}
							</p>
						</div>

						{/* Duration + FPS (only when blank) */}
						{startMode === "blank" && (
							<div className="grid grid-cols-2 gap-5">
								<div className="space-y-1.5">
									<label className="block text-sm font-medium text-foreground">
										Duration
									</label>
									<div className="grid grid-cols-3 gap-1.5">
										{DURATIONS.map((d) => (
											<button
												key={d.value}
												onClick={() => setDurationPreset(d.value)}
												disabled={loading}
												className={`px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
													durationPreset === d.value
														? "bg-primary text-primary-foreground border-primary"
														: "bg-background border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
												}`}
											>
												{d.label}
											</button>
										))}
									</div>
								</div>
								<div className="space-y-1.5">
									<label className="block text-sm font-medium text-foreground">
										Frame Rate
									</label>
									<div className="flex gap-1.5">
										{([30, 60] as const).map((fps) => (
											<button
												key={fps}
												onClick={() => setFrameRate(fps)}
												disabled={loading}
												className={`flex-1 px-2 py-2 rounded-lg border text-xs font-medium transition-all ${
													frameRate === fps
														? "bg-primary text-primary-foreground border-primary"
														: "bg-background border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
												}`}
											>
												{fps} FPS
											</button>
										))}
									</div>
								</div>
							</div>
						)}

						{/* FPS when template (templates have their own duration) */}
						{startMode === "template" && (
							<div className="space-y-1.5">
								<label className="block text-sm font-medium text-foreground">
									Frame Rate
								</label>
								<div className="flex gap-2">
									{([30, 60] as const).map((fps) => (
										<button
											key={fps}
											onClick={() => setFrameRate(fps)}
											disabled={loading}
											className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
												frameRate === fps
													? "bg-primary text-primary-foreground border-primary"
													: "bg-background border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
											}`}
										>
											{fps} FPS
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="flex gap-3 px-6 py-4 border-t border-border shrink-0 bg-card">
					<button
						onClick={handleClose}
						disabled={loading}
						className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onClick={handleCreate}
						disabled={
							loading ||
							!name.trim() ||
							(startMode === "template" && !selectedTemplate)
						}
						className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
					>
						{loading && <Loader2 className="h-4 w-4 animate-spin" />}
						{loading ? "Creating..." : "Create Project"}
					</button>
				</div>
			</div>
		</div>
	);
}
