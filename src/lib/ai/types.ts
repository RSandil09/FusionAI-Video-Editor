/**
 * Shared TypeScript types for AI features
 */

// Voice generation types
export interface Voice {
	id: string;
	name: string;
	accent: string;
	gender: string;
	age: string;
	descriptive: string;
	useCase: string;
	category: string;
	language: string;
	locale: string | null;
	description: string;
	previewUrl: string;
}

export interface VoiceGenerationRequest {
	text: string;
	voiceId: string;
	folder?: string;
}

export interface VoiceGenerationResponse {
	agent: {
		url: string;
		duration: number;
	};
}

// Image generation types
export interface ImageGenerationRequest {
	prompt: string;
	style?: ImageStyle;
	aspectRatio?: AspectRatio;
}

export interface ImageGenerationResponse {
	image: {
		url: string;
		width: number;
		height: number;
	};
}

export type ImageStyle =
	| "realistic"
	| "illustration"
	| "3d"
	| "anime"
	| "cartoon"
	| "cinematic"
	| "minimalist"
	| "vintage";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";

// Background removal types
export interface BackgroundRemovalRequest {
	imageUrl: string;
}

export interface BackgroundRemovalResponse {
	image: {
		url: string;
		originalUrl: string;
	};
}

// Video analysis types
export interface VideoAnalysisRequest {
	videoUrl: string;
	analysisType: AnalysisType;
	options?: AnalysisOptions;
}

export interface VideoAnalysisResponse {
	analysis: {
		type: AnalysisType;
		segments: AnalysisSegment[];
		videoUrl: string;
	};
}

export type AnalysisType = "scenes" | "silences" | "highlights";

export interface AnalysisOptions {
	threshold?: number;
	minDuration?: number;
}

export interface AnalysisSegment {
	start: number;
	end: number;
	label?: string;
	confidence?: number;
}

// Transcription types
export interface TranscriptionRequest {
	url: string;
	targetLanguage?: string;
}

export interface TranscriptionResponse {
	transcribe: {
		url: string;
	};
}

export interface TranscriptionWord {
	word: string;
	start: number;
	end: number;
}

export interface TranscriptionResult {
	results: {
		main: {
			words: TranscriptionWord[];
		};
	};
}

// AI operation status
export type AIOperationStatus = "idle" | "loading" | "success" | "error";

export interface AIOperationState<T = unknown> {
	status: AIOperationStatus;
	data: T | null;
	error: string | null;
}

// AI feature configuration
export interface AIFeatureConfig {
	enabled: boolean;
	apiKeyConfigured: boolean;
	rateLimit?: {
		requestsPerMinute: number;
		remaining: number;
	};
}

export interface AIFeaturesConfig {
	voice: AIFeatureConfig;
	image: AIFeatureConfig;
	backgroundRemoval: AIFeatureConfig;
	videoAnalysis: AIFeatureConfig;
	transcription: AIFeatureConfig;
}
