import { create } from "zustand";
import type {
	AIOperationStatus,
	AnalysisSegment,
	ImageStyle,
	AspectRatio,
} from "@/lib/ai/types";

/**
 * AI Store - Centralized state management for AI features
 */

interface GeneratedImage {
	id: string;
	url: string;
	prompt: string;
	style: ImageStyle;
	aspectRatio: AspectRatio;
	width: number;
	height: number;
	createdAt: Date;
}

interface GeneratedVoice {
	id: string;
	url: string;
	text: string;
	voiceId: string;
	voiceName: string;
	duration: number;
	createdAt: Date;
}

interface VideoAnalysis {
	id: string;
	videoUrl: string;
	analysisType: "scenes" | "silences" | "highlights";
	segments: AnalysisSegment[];
	createdAt: Date;
}

interface AIState {
	// Image generation
	imageGeneration: {
		status: AIOperationStatus;
		generatedImages: GeneratedImage[];
		error: string | null;
	};

	// Voice generation
	voiceGeneration: {
		status: AIOperationStatus;
		generatedVoices: GeneratedVoice[];
		error: string | null;
	};

	// Background removal
	backgroundRemoval: {
		status: AIOperationStatus;
		processedImages: Array<{ original: string; processed: string }>;
		error: string | null;
	};

	// Video analysis
	videoAnalysis: {
		status: AIOperationStatus;
		analyses: VideoAnalysis[];
		currentAnalysis: VideoAnalysis | null;
		error: string | null;
	};

	// Transcription
	transcription: {
		status: AIOperationStatus;
		error: string | null;
	};
}

interface AIActions {
	// Image generation actions
	setImageGenerationStatus: (status: AIOperationStatus) => void;
	addGeneratedImage: (image: GeneratedImage) => void;
	setImageGenerationError: (error: string | null) => void;
	clearGeneratedImages: () => void;

	// Voice generation actions
	setVoiceGenerationStatus: (status: AIOperationStatus) => void;
	addGeneratedVoice: (voice: GeneratedVoice) => void;
	setVoiceGenerationError: (error: string | null) => void;
	clearGeneratedVoices: () => void;

	// Background removal actions
	setBackgroundRemovalStatus: (status: AIOperationStatus) => void;
	addProcessedImage: (original: string, processed: string) => void;
	setBackgroundRemovalError: (error: string | null) => void;

	// Video analysis actions
	setVideoAnalysisStatus: (status: AIOperationStatus) => void;
	addVideoAnalysis: (analysis: VideoAnalysis) => void;
	setCurrentAnalysis: (analysis: VideoAnalysis | null) => void;
	setVideoAnalysisError: (error: string | null) => void;
	clearVideoAnalyses: () => void;

	// Transcription actions
	setTranscriptionStatus: (status: AIOperationStatus) => void;
	setTranscriptionError: (error: string | null) => void;

	// Global actions
	resetAllAIState: () => void;
}

const initialState: AIState = {
	imageGeneration: {
		status: "idle",
		generatedImages: [],
		error: null,
	},
	voiceGeneration: {
		status: "idle",
		generatedVoices: [],
		error: null,
	},
	backgroundRemoval: {
		status: "idle",
		processedImages: [],
		error: null,
	},
	videoAnalysis: {
		status: "idle",
		analyses: [],
		currentAnalysis: null,
		error: null,
	},
	transcription: {
		status: "idle",
		error: null,
	},
};

export const useAIStore = create<AIState & AIActions>((set) => ({
	...initialState,

	// Image generation actions
	setImageGenerationStatus: (status) =>
		set((state) => ({
			imageGeneration: { ...state.imageGeneration, status },
		})),
	addGeneratedImage: (image) =>
		set((state) => ({
			imageGeneration: {
				...state.imageGeneration,
				generatedImages: [image, ...state.imageGeneration.generatedImages],
				status: "success",
				error: null,
			},
		})),
	setImageGenerationError: (error) =>
		set((state) => ({
			imageGeneration: { ...state.imageGeneration, error, status: "error" },
		})),
	clearGeneratedImages: () =>
		set((state) => ({
			imageGeneration: { ...state.imageGeneration, generatedImages: [] },
		})),

	// Voice generation actions
	setVoiceGenerationStatus: (status) =>
		set((state) => ({
			voiceGeneration: { ...state.voiceGeneration, status },
		})),
	addGeneratedVoice: (voice) =>
		set((state) => ({
			voiceGeneration: {
				...state.voiceGeneration,
				generatedVoices: [voice, ...state.voiceGeneration.generatedVoices],
				status: "success",
				error: null,
			},
		})),
	setVoiceGenerationError: (error) =>
		set((state) => ({
			voiceGeneration: { ...state.voiceGeneration, error, status: "error" },
		})),
	clearGeneratedVoices: () =>
		set((state) => ({
			voiceGeneration: { ...state.voiceGeneration, generatedVoices: [] },
		})),

	// Background removal actions
	setBackgroundRemovalStatus: (status) =>
		set((state) => ({
			backgroundRemoval: { ...state.backgroundRemoval, status },
		})),
	addProcessedImage: (original, processed) =>
		set((state) => ({
			backgroundRemoval: {
				...state.backgroundRemoval,
				processedImages: [
					{ original, processed },
					...state.backgroundRemoval.processedImages,
				],
				status: "success",
				error: null,
			},
		})),
	setBackgroundRemovalError: (error) =>
		set((state) => ({
			backgroundRemoval: { ...state.backgroundRemoval, error, status: "error" },
		})),

	// Video analysis actions
	setVideoAnalysisStatus: (status) =>
		set((state) => ({
			videoAnalysis: { ...state.videoAnalysis, status },
		})),
	addVideoAnalysis: (analysis) =>
		set((state) => ({
			videoAnalysis: {
				...state.videoAnalysis,
				analyses: [analysis, ...state.videoAnalysis.analyses],
				currentAnalysis: analysis,
				status: "success",
				error: null,
			},
		})),
	setCurrentAnalysis: (analysis) =>
		set((state) => ({
			videoAnalysis: { ...state.videoAnalysis, currentAnalysis: analysis },
		})),
	setVideoAnalysisError: (error) =>
		set((state) => ({
			videoAnalysis: { ...state.videoAnalysis, error, status: "error" },
		})),
	clearVideoAnalyses: () =>
		set((state) => ({
			videoAnalysis: {
				...state.videoAnalysis,
				analyses: [],
				currentAnalysis: null,
			},
		})),

	// Transcription actions
	setTranscriptionStatus: (status) =>
		set((state) => ({
			transcription: { ...state.transcription, status },
		})),
	setTranscriptionError: (error) =>
		set((state) => ({
			transcription: { ...state.transcription, error, status: "error" },
		})),

	// Global actions
	resetAllAIState: () => set(initialState),
}));

export default useAIStore;
