/**
 * Empty Editor State Generator
 * Creates clean, empty timeline state for new projects
 */

import { generateId } from "@designcombo/timeline";

export interface EditorState {
	id: string;
	fps: number;
	tracks: Track[];
	size: {
		width: number;
		height: number;
	};
	trackItemIds: string[];
	transitionsMap: Record<string, any>;
	trackItemsMap: Record<string, any>;
}

export interface Track {
	id: string;
	type: string;
	items: string[];
	name?: string;
	accepts: string[];
	magnetic: boolean;
	static: boolean;
}

/**
 * Create empty editor state with default configuration
 */
export function createEmptyEditorState(config?: {
	width?: number;
	height?: number;
	fps?: number;
}): EditorState {
	const width = config?.width || 1080;
	const height = config?.height || 1920;
	const fps = config?.fps || 30;

	return {
		id: generateId(),
		fps,
		tracks: [
			{
				id: generateId(),
				type: "video",
				items: [],
				name: "Main Track",
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
			},
		],
		size: {
			width,
			height,
		},
		trackItemIds: [],
		transitionsMap: {},
		trackItemsMap: {},
	};
}

/**
 * Check if editor state is empty (no items added)
 */
export function isEditorStateEmpty(state: EditorState | null): boolean {
	if (!state) return true;
	return state.trackItemIds.length === 0;
}

/**
 * Validate editor state structure
 */
export function validateEditorState(state: any): state is EditorState {
	if (!state || typeof state !== "object") {
		console.warn("⚠️ Validation Failed: state is not an object", state);
		return false;
	}
	if (typeof state.id !== "string") {
		console.warn("⚠️ Validation Failed: missing or invalid 'id'", state.id);
		return false;
	}
	if (typeof state.fps !== "number") {
		console.warn("⚠️ Validation Failed: missing or invalid 'fps'", state.fps);
		return false;
	}
	if (!Array.isArray(state.tracks)) {
		console.warn(
			"⚠️ Validation Failed: missing or invalid 'tracks'",
			state.tracks,
		);
		return false;
	}
	if (typeof state.size !== "object") {
		console.warn("⚠️ Validation Failed: missing or invalid 'size'", state.size);
		return false;
	}
	if (!Array.isArray(state.trackItemIds)) {
		console.warn(
			"⚠️ Validation Failed: missing or invalid 'trackItemIds'",
			state.trackItemIds,
		);
		return false;
	}
	if (typeof state.transitionsMap !== "object") {
		console.warn(
			"⚠️ Validation Failed: missing or invalid 'transitionsMap'",
			state.transitionsMap,
		);
		return false;
	}
	if (typeof state.trackItemsMap !== "object") {
		console.warn(
			"⚠️ Validation Failed: missing or invalid 'trackItemsMap'",
			state.trackItemsMap,
		);
		return false;
	}
	return true;
}
