/**
 * Database Types
 * Supabase v2-compatible type definitions
 */

export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export interface Database {
	public: {
		Tables: {
			users: {
				Row: {
					id: string;
					email: string;
					display_name: string | null;
					avatar_url: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					email: string;
					display_name?: string | null;
					avatar_url?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					email?: string;
					display_name?: string | null;
					avatar_url?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			projects: {
				Row: {
					id: string;
					user_id: string;
					name: string;
					description: string | null;
					thumbnail_url: string | null;
					editor_state: Json | null;
					duration: number | null;
					frame_rate: number | null;
					resolution_width: number | null;
					resolution_height: number | null;
					created_at: string;
					updated_at: string;
					last_accessed_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					name: string;
					description?: string | null;
					thumbnail_url?: string | null;
					editor_state?: Json | null;
					duration?: number | null;
					frame_rate?: number | null;
					resolution_width?: number | null;
					resolution_height?: number | null;
					created_at?: string;
					updated_at?: string;
					last_accessed_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					name?: string;
					description?: string | null;
					thumbnail_url?: string | null;
					editor_state?: Json | null;
					duration?: number | null;
					frame_rate?: number | null;
					resolution_width?: number | null;
					resolution_height?: number | null;
					created_at?: string;
					updated_at?: string;
					last_accessed_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "projects_user_id_fkey";
						columns: ["user_id"];
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
				];
			};
			assets: {
				Row: {
					id: string;
					user_id: string;
					project_id: string | null;
					file_name: string;
					file_url: string;
					file_type: string;
					content_type: string;
					file_size: number;
					width: number | null;
					height: number | null;
					duration_seconds: number | null;
					storage_key: string;
					uploaded_at: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					project_id?: string | null;
					file_name: string;
					file_url: string;
					file_type: string;
					content_type: string;
					file_size: number;
					width?: number | null;
					height?: number | null;
					duration_seconds?: number | null;
					storage_key: string;
					uploaded_at?: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					project_id?: string | null;
					file_name?: string;
					file_url?: string;
					file_type?: string;
					content_type?: string;
					file_size?: number;
					width?: number | null;
					height?: number | null;
					duration_seconds?: number | null;
					storage_key?: string;
					uploaded_at?: string;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "assets_user_id_fkey";
						columns: ["user_id"];
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "assets_project_id_fkey";
						columns: ["project_id"];
						referencedRelation: "projects";
						referencedColumns: ["id"];
					},
				];
			};
			renders: {
				Row: {
					id: string;
					user_id: string;
					project_id: string;
					status: string;
					progress: number | null;
					output_url: string | null;
					output_size: number | null;
					storage_key: string | null;
					error_message: string | null;
					error_stack: string | null;
					retry_count: number | null;
					started_at: string | null;
					completed_at: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					project_id: string;
					status?: string;
					progress?: number | null;
					output_url?: string | null;
					output_size?: number | null;
					storage_key?: string | null;
					error_message?: string | null;
					error_stack?: string | null;
					retry_count?: number | null;
					started_at?: string | null;
					completed_at?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					project_id?: string;
					status?: string;
					progress?: number | null;
					output_url?: string | null;
					output_size?: number | null;
					storage_key?: string | null;
					error_message?: string | null;
					error_stack?: string | null;
					retry_count?: number | null;
					started_at?: string | null;
					completed_at?: string | null;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "renders_user_id_fkey";
						columns: ["user_id"];
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "renders_project_id_fkey";
						columns: ["project_id"];
						referencedRelation: "projects";
						referencedColumns: ["id"];
					},
				];
			};
			analysis_history: {
				Row: {
					id: string;
					project_id: string;
					user_id: string;
					analysis_type: string;
					video_url: string;
					video_name: string | null;
					segments: Json;
					created_at: string;
				};
				Insert: {
					id?: string;
					project_id: string;
					user_id: string;
					analysis_type: string;
					video_url: string;
					video_name?: string | null;
					segments?: Json;
					created_at?: string;
				};
				Update: {
					id?: string;
					project_id?: string;
					user_id?: string;
					analysis_type?: string;
					video_url?: string;
					video_name?: string | null;
					segments?: Json;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "analysis_history_project_id_fkey";
						columns: ["project_id"];
						referencedRelation: "projects";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "analysis_history_user_id_fkey";
						columns: ["user_id"];
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
				];
			};
			user_settings: {
				Row: {
					user_id: string;
					onboarding_completed: boolean;
					onboarding_skipped: boolean;
					theme: string;
					email_notifications: boolean;
					render_complete_notifications: boolean;
					default_export_quality: string;
					default_export_format: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					user_id: string;
					onboarding_completed?: boolean;
					onboarding_skipped?: boolean;
					theme?: string;
					email_notifications?: boolean;
					render_complete_notifications?: boolean;
					default_export_quality?: string;
					default_export_format?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					user_id?: string;
					onboarding_completed?: boolean;
					onboarding_skipped?: boolean;
					theme?: string;
					email_notifications?: boolean;
					render_complete_notifications?: boolean;
					default_export_quality?: string;
					default_export_format?: string;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "user_settings_user_id_fkey";
						columns: ["user_id"];
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
				];
			};
			user_social_connections: {
				Row: {
					id: string;
					user_id: string;
					provider: string;
					access_token: string | null;
					refresh_token: string | null;
					token_expires_at: string | null;
					provider_user_id: string | null;
					provider_username: string | null;
					is_active: boolean;
					connected_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					provider: string;
					access_token?: string | null;
					refresh_token?: string | null;
					token_expires_at?: string | null;
					provider_user_id?: string | null;
					provider_username?: string | null;
					is_active?: boolean;
					connected_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					provider?: string;
					access_token?: string | null;
					refresh_token?: string | null;
					token_expires_at?: string | null;
					provider_user_id?: string | null;
					provider_username?: string | null;
					is_active?: boolean;
					connected_at?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: "user_social_connections_user_id_fkey";
						columns: ["user_id"];
						referencedRelation: "users";
						referencedColumns: ["id"];
					},
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			[_ in never]: never;
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
}
