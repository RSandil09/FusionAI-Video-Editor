"use client";

/**
 * Dynamic Editor Route
 * Load and edit a specific project by ID
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Editor from "@/features/editor";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppHeader } from "@/components/auth/app-header";
import { getProject, updateLastAccessed } from "@/lib/db/projects";
import { toast } from "sonner";
import type { Database } from "@/lib/db/database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

function EditorContent() {
	const params = useParams();
	const router = useRouter();
	const projectId = params.projectId as string;
	const [project, setProject] = useState<Project | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		if (projectId) {
			loadProject();
		}
	}, [projectId]);

	const loadProject = async () => {
		setLoading(true);
		setError(false);

		try {
			const projectData = await getProject(projectId);

			if (projectData) {
				console.log("📦 DB Project Data Loaded:", {
					id: projectData.id,
					name: projectData.name,
					hasEditorState: !!projectData.editor_state,
					editorStateKeys: projectData.editor_state
						? Object.keys(projectData.editor_state as object)
						: [],
				});

				setProject(projectData);
				// Update last accessed timestamp
				await updateLastAccessed(projectId);
			} else {
				console.error("❌ Project not found in DB");
				setError(true);
				toast.error("Project not found");
			}
		} catch (err) {
			console.error("Error loading project:", err);
			setError(true);
			toast.error("Failed to load project");
		} finally {
			setLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<div className="text-center">
					<Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
					<p className="text-muted-foreground">Loading project...</p>
				</div>
			</div>
		);
	}

	if (error || !project) {
		return (
			<div className="flex items-center justify-center h-screen bg-background">
				<div className="text-center max-w-md">
					<div className="mb-4">
						<svg
							className="h-16 w-16 text-muted-foreground mx-auto"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
					<h2 className="text-2xl font-semibold mb-2">Project Not Found</h2>
					<p className="text-muted-foreground mb-6">
						The project you're looking for doesn't exist or has been deleted.
					</p>
					<button
						onClick={() => router.push("/dashboard")}
						className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
					>
						<ArrowLeft className="h-5 w-5" />
						Back to Dashboard
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-screen">
			{/* Editor */}
			<div className="flex-1 overflow-hidden">
				<Editor
					initialState={project.editor_state}
					projectId={project.id}
					projectName={project.name}
				/>
			</div>
		</div>
	);
}

export default function EditorPage() {
	return (
		<ProtectedRoute>
			<EditorContent />
		</ProtectedRoute>
	);
}
