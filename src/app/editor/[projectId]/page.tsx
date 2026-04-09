"use client";

/**
 * Dynamic Editor Route
 * Load and edit a specific project by ID
 */

import { useEffect, useState, Component, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Editor from "@/features/editor";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { getProject, updateLastAccessed } from "@/lib/db/projects";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "sonner";
import type { Database } from "@/lib/db/database.types";

// ── Error Boundary — catches render errors in the Editor so users see a
//    recoverable screen instead of a blank page ─────────────────────────────────
class EditorErrorBoundary extends Component<
	{ children: ReactNode },
	{ hasError: boolean; message: string }
> {
	constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { hasError: false, message: "" };
	}
	static getDerivedStateFromError(error: unknown) {
		return {
			hasError: true,
			message: error instanceof Error ? error.message : String(error),
		};
	}
	render() {
		if (this.state.hasError) {
			return (
				<div className="flex items-center justify-center h-screen bg-background">
					<div className="text-center max-w-md px-6">
						<h2 className="text-2xl font-semibold mb-2 text-destructive">Editor crashed</h2>
						<p className="text-muted-foreground mb-2 text-sm">
							Something went wrong while rendering the editor.
						</p>
						<p className="text-xs text-muted-foreground font-mono bg-muted rounded p-2 mb-6 break-all">
							{this.state.message}
						</p>
						<button
							onClick={() => window.location.reload()}
							className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
						>
							Reload editor
						</button>
					</div>
				</div>
			);
		}
		return this.props.children;
	}
}

type Project = Database["public"]["Tables"]["projects"]["Row"];

function EditorContent() {
	const params = useParams();
	const router = useRouter();
	const { user } = useAuth();
	const projectId = params.projectId as string;
	const [project, setProject] = useState<Project | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		if (projectId && user) {
			loadProject();
		}
	}, [projectId, user]);

	const loadProject = async () => {
		if (!user) return;
		setLoading(true);
		setError(false);

		try {
			// Pass userId so the query filters by ownership — prevents reading other users' projects
			const projectData = await getProject(projectId, user.uid);

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
		<EditorErrorBoundary>
			<div className="flex flex-col h-screen">
				<div className="flex-1 overflow-hidden">
					<Editor
						initialState={project.editor_state}
						projectId={project.id}
						projectName={project.name}
					/>
				</div>
			</div>
		</EditorErrorBoundary>
	);
}

export default function EditorPage() {
	return (
		<ProtectedRoute>
			<EditorContent />
		</ProtectedRoute>
	);
}
