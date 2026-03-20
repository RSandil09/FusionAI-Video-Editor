import { create } from "zustand";

export interface AnalysisSegment {
	start: number;
	end: number;
	label?: string;
	confidence?: number;
}

export interface AnalysisResult {
	type: string;
	segments: AnalysisSegment[];
	videoUrl: string;
}

interface SmartEditState {
	analysisResult: AnalysisResult | null;
	resultsExpanded: boolean;
	setAnalysisResult: (result: AnalysisResult | null) => void;
	setResultsExpanded: (expanded: boolean) => void;
	clearResults: () => void;
}

export const useSmartEditStore = create<SmartEditState>((set) => ({
	analysisResult: null,
	resultsExpanded: true,
	setAnalysisResult: (analysisResult) =>
		set({ analysisResult, resultsExpanded: true }),
	setResultsExpanded: (resultsExpanded) => set({ resultsExpanded }),
	clearResults: () => set({ analysisResult: null }),
}));
