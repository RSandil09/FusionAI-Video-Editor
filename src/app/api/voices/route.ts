import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";

// Google Cloud TTS voices - these work with the TTS API
const GOOGLE_TTS_VOICES = [
	{
		id: "en-US-Neural2-A",
		name: "Aria - Warm & Friendly",
		accent: "American",
		gender: "Female",
		age: "Young Adult",
		descriptive: "Warm and friendly",
		useCase: "Narration",
		category: "Neural",
		language: "English",
		locale: "en-US",
		description: "A warm, friendly female voice",
		previewUrl: "",
	},
	{
		id: "en-US-Neural2-D",
		name: "Daniel - Professional",
		accent: "American",
		gender: "Male",
		age: "Adult",
		descriptive: "Professional and clear",
		useCase: "Business",
		category: "Neural",
		language: "English",
		locale: "en-US",
		description: "A professional male voice",
		previewUrl: "",
	},
	{
		id: "en-US-Neural2-C",
		name: "Clara - Confident",
		accent: "American",
		gender: "Female",
		age: "Adult",
		descriptive: "Confident and articulate",
		useCase: "Corporate",
		category: "Neural",
		language: "English",
		locale: "en-US",
		description: "A confident female voice",
		previewUrl: "",
	},
	{
		id: "en-US-Neural2-I",
		name: "Ian - Energetic",
		accent: "American",
		gender: "Male",
		age: "Young Adult",
		descriptive: "Energetic and engaging",
		useCase: "Marketing",
		category: "Neural",
		language: "English",
		locale: "en-US",
		description: "An energetic male voice",
		previewUrl: "",
	},
	{
		id: "en-GB-Neural2-A",
		name: "Emily - British Elegant",
		accent: "British",
		gender: "Female",
		age: "Adult",
		descriptive: "Elegant and sophisticated",
		useCase: "Documentary",
		category: "Neural",
		language: "English",
		locale: "en-GB",
		description: "An elegant British female voice",
		previewUrl: "",
	},
	{
		id: "en-GB-Neural2-B",
		name: "George - British Authority",
		accent: "British",
		gender: "Male",
		age: "Adult",
		descriptive: "Authoritative and refined",
		useCase: "News",
		category: "Neural",
		language: "English",
		locale: "en-GB",
		description: "An authoritative British male voice",
		previewUrl: "",
	},
	{
		id: "en-AU-Neural2-A",
		name: "Olivia - Australian Friendly",
		accent: "Australian",
		gender: "Female",
		age: "Young Adult",
		descriptive: "Friendly and casual",
		useCase: "Podcast",
		category: "Neural",
		language: "English",
		locale: "en-AU",
		description: "A friendly Australian female voice",
		previewUrl: "",
	},
	{
		id: "en-AU-Neural2-B",
		name: "James - Australian Relaxed",
		accent: "Australian",
		gender: "Male",
		age: "Adult",
		descriptive: "Relaxed and approachable",
		useCase: "Tutorial",
		category: "Neural",
		language: "English",
		locale: "en-AU",
		description: "A relaxed Australian male voice",
		previewUrl: "",
	},
	{
		id: "es-ES-Neural2-A",
		name: "Sofia - Spanish Clear",
		accent: "Spanish",
		gender: "Female",
		age: "Adult",
		descriptive: "Clear and expressive",
		useCase: "E-learning",
		category: "Neural",
		language: "Spanish",
		locale: "es-ES",
		description: "A clear Spanish female voice",
		previewUrl: "",
	},
	{
		id: "es-ES-Neural2-B",
		name: "Carlos - Spanish Professional",
		accent: "Spanish",
		gender: "Male",
		age: "Adult",
		descriptive: "Professional",
		useCase: "Business",
		category: "Neural",
		language: "Spanish",
		locale: "es-ES",
		description: "A professional Spanish male voice",
		previewUrl: "",
	},
	{
		id: "fr-FR-Neural2-A",
		name: "Amelie - French Elegant",
		accent: "French",
		gender: "Female",
		age: "Adult",
		descriptive: "Elegant and melodic",
		useCase: "Narration",
		category: "Neural",
		language: "French",
		locale: "fr-FR",
		description: "An elegant French female voice",
		previewUrl: "",
	},
	{
		id: "fr-FR-Neural2-B",
		name: "Louis - French Refined",
		accent: "French",
		gender: "Male",
		age: "Adult",
		descriptive: "Refined and sophisticated",
		useCase: "Documentary",
		category: "Neural",
		language: "French",
		locale: "fr-FR",
		description: "A refined French male voice",
		previewUrl: "",
	},
	{
		id: "de-DE-Neural2-A",
		name: "Hannah - German Professional",
		accent: "German",
		gender: "Female",
		age: "Adult",
		descriptive: "Professional and precise",
		useCase: "Corporate",
		category: "Neural",
		language: "German",
		locale: "de-DE",
		description: "A professional German female voice",
		previewUrl: "",
	},
	{
		id: "de-DE-Neural2-B",
		name: "Hans - German Clear",
		accent: "German",
		gender: "Male",
		age: "Adult",
		descriptive: "Clear and articulate",
		useCase: "Technical",
		category: "Neural",
		language: "German",
		locale: "de-DE",
		description: "A clear German male voice",
		previewUrl: "",
	},
	{
		id: "ja-JP-Neural2-B",
		name: "Yuki - Japanese Polite",
		accent: "Japanese",
		gender: "Female",
		age: "Young Adult",
		descriptive: "Polite and clear",
		useCase: "Anime",
		category: "Neural",
		language: "Japanese",
		locale: "ja-JP",
		description: "A polite Japanese female voice",
		previewUrl: "",
	},
	{
		id: "ja-JP-Neural2-C",
		name: "Kenji - Japanese Professional",
		accent: "Japanese",
		gender: "Male",
		age: "Adult",
		descriptive: "Professional",
		useCase: "Business",
		category: "Neural",
		language: "Japanese",
		locale: "ja-JP",
		description: "A professional Japanese male voice",
		previewUrl: "",
	},
	{
		id: "hi-IN-Neural2-A",
		name: "Priya - Hindi Warm",
		accent: "Indian",
		gender: "Female",
		age: "Adult",
		descriptive: "Warm and expressive",
		useCase: "Narration",
		category: "Neural",
		language: "Hindi",
		locale: "hi-IN",
		description: "A warm Hindi female voice",
		previewUrl: "",
	},
	{
		id: "hi-IN-Neural2-B",
		name: "Raj - Hindi Clear",
		accent: "Indian",
		gender: "Male",
		age: "Adult",
		descriptive: "Clear and professional",
		useCase: "E-learning",
		category: "Neural",
		language: "Hindi",
		locale: "hi-IN",
		description: "A clear Hindi male voice",
		previewUrl: "",
	},
	{
		id: "pt-BR-Neural2-A",
		name: "Ana - Portuguese Friendly",
		accent: "Brazilian",
		gender: "Female",
		age: "Young Adult",
		descriptive: "Friendly and warm",
		useCase: "Marketing",
		category: "Neural",
		language: "Portuguese",
		locale: "pt-BR",
		description: "A friendly Brazilian Portuguese female voice",
		previewUrl: "",
	},
	{
		id: "pt-BR-Neural2-B",
		name: "Pedro - Portuguese Professional",
		accent: "Brazilian",
		gender: "Male",
		age: "Adult",
		descriptive: "Professional",
		useCase: "Business",
		category: "Neural",
		language: "Portuguese",
		locale: "pt-BR",
		description: "A professional Brazilian Portuguese male voice",
		previewUrl: "",
	},
];

export async function POST(request: NextRequest) {
	const user = await requireAuth();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { limit = 20, page = 1, query = {} } = body;

		// Use built-in Google TTS voices
		let filteredVoices = [...GOOGLE_TTS_VOICES];

		// Apply language filter
		if (query.languages?.length) {
			filteredVoices = filteredVoices.filter((v) => {
				const voiceLang = v.locale?.split("-")[0].toLowerCase() || "";
				return query.languages.some(
					(lang: string) =>
						voiceLang === lang.toLowerCase() ||
						v.language.toLowerCase().includes(lang.toLowerCase()),
				);
			});
		}

		// Apply gender filter
		if (query.genders?.length) {
			filteredVoices = filteredVoices.filter((v) =>
				query.genders.some(
					(g: string) => v.gender.toLowerCase() === g.toLowerCase(),
				),
			);
		}

		// Paginate
		const startIndex = (page - 1) * limit;
		const paginatedVoices = filteredVoices.slice(
			startIndex,
			startIndex + limit,
		);

		return NextResponse.json({
			voices: paginatedVoices,
			total: filteredVoices.length,
			page,
			limit,
		});
	} catch (error) {
		console.error("Error in voices API:", error);
		return NextResponse.json(
			{ error: "Failed to fetch voices" },
			{ status: 500 },
		);
	}
}
