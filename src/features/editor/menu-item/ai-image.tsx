import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Sparkles, ImageIcon, Download } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ADD_IMAGE } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { generateId } from "@designcombo/timeline";
import { Card } from "@/components/ui/card";

interface GeneratedImage {
	id: string;
	url: string;
	prompt: string;
	style: string;
	width: number;
	height: number;
	createdAt: Date;
}

const STYLE_OPTIONS = [
	{
		value: "realistic",
		label: "Realistic",
		description: "Photorealistic imagery",
	},
	{
		value: "illustration",
		label: "Illustration",
		description: "Digital art style",
	},
	{ value: "3d", label: "3D Render", description: "CGI and 3D graphics" },
	{ value: "anime", label: "Anime", description: "Japanese animation style" },
	{ value: "cartoon", label: "Cartoon", description: "Fun and playful" },
	{ value: "cinematic", label: "Cinematic", description: "Movie-like visuals" },
	{ value: "minimalist", label: "Minimalist", description: "Clean and simple" },
	{ value: "vintage", label: "Vintage", description: "Retro aesthetics" },
];

const ASPECT_RATIO_OPTIONS = [
	{ value: "16:9", label: "16:9 Landscape", icon: "🖥️" },
	{ value: "9:16", label: "9:16 Portrait", icon: "📱" },
	{ value: "1:1", label: "1:1 Square", icon: "⬜" },
	{ value: "4:3", label: "4:3 Standard", icon: "📺" },
	{ value: "21:9", label: "21:9 Ultrawide", icon: "🎬" },
];

export const AiImage = () => {
	const [prompt, setPrompt] = useState("");
	const [style, setStyle] = useState("realistic");
	const [aspectRatio, setAspectRatio] = useState("16:9");
	const [isGenerating, setIsGenerating] = useState(false);
	const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

	const handleGenerate = async () => {
		if (!prompt.trim()) {
			toast.error("Please enter a prompt");
			return;
		}

		setIsGenerating(true);

		try {
			const response = await fetch("/api/generate-image", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					prompt: prompt.trim(),
					style,
					aspectRatio,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `HTTP ${response.status}`);
			}

			const data = await response.json();

			if (data.image?.url) {
				const newImage: GeneratedImage = {
					id: generateId(),
					url: data.image.url,
					prompt: prompt.trim(),
					style,
					width: data.image.width,
					height: data.image.height,
					createdAt: new Date(),
				};

				setGeneratedImages((prev) => [newImage, ...prev]);
				toast.success("Image generated successfully!");

				// Automatically add to timeline
				handleAddToTimeline(newImage);
			} else {
				toast.error("Image generation completed but no image URL received");
			}
		} catch (error) {
			console.error("Error generating image:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to generate image. Please try again.",
			);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleAddToTimeline = (image: GeneratedImage) => {
		dispatch(ADD_IMAGE, {
			payload: {
				id: generateId(),
				type: "image",
				display: { from: 0, to: 5000 },
				details: {
					src: image.url,
					width: image.width,
					height: image.height,
				},
				metadata: {
					aiGenerated: true,
					prompt: image.prompt,
					style: image.style,
				},
			},
			options: {},
		});
		toast.success("Image added to timeline");
	};

	return (
		<div className="flex flex-1 flex-col max-w-full">
			<div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium gap-2">
				<Sparkles className="w-4 h-4" />
				AI Image Generation
			</div>

			<div className="space-y-4 p-4">
				{/* Prompt Input */}
				<div className="space-y-2">
					<Label className="font-sans text-xs font-semibold">
						Describe your image
					</Label>
					<Textarea
						placeholder="A futuristic cityscape at sunset with flying cars and neon lights..."
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						className="min-h-[100px] resize-none"
						disabled={isGenerating}
					/>
					<p className="text-xs text-muted-foreground">
						Be specific and descriptive for better results
					</p>
				</div>

				{/* Style Selection */}
				<div className="space-y-2">
					<Label className="font-sans text-xs font-semibold">Style</Label>
					<Select
						value={style}
						onValueChange={setStyle}
						disabled={isGenerating}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select style" />
						</SelectTrigger>
						<SelectContent className="z-[200]">
							{STYLE_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									<div className="flex flex-col">
										<span>{option.label}</span>
										<span className="text-xs text-muted-foreground">
											{option.description}
										</span>
									</div>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Aspect Ratio Selection */}
				<div className="space-y-2">
					<Label className="font-sans text-xs font-semibold">
						Aspect Ratio
					</Label>
					<Select
						value={aspectRatio}
						onValueChange={setAspectRatio}
						disabled={isGenerating}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select aspect ratio" />
						</SelectTrigger>
						<SelectContent className="z-[200]">
							{ASPECT_RATIO_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									<span className="flex items-center gap-2">
										<span>{option.icon}</span>
										<span>{option.label}</span>
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Generate Button */}
				<Button
					onClick={handleGenerate}
					disabled={!prompt.trim() || isGenerating}
					className="w-full"
				>
					{isGenerating ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Generating...
						</>
					) : (
						<>
							<Sparkles className="mr-2 h-4 w-4" />
							Generate Image
						</>
					)}
				</Button>
			</div>

			{/* Generated Images Gallery */}
			{generatedImages.length > 0 && (
				<div className="flex-1 border-t border-border">
					<div className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
						Generated Images ({generatedImages.length})
					</div>
					<ScrollArea className="h-[300px]">
						<div className="grid grid-cols-2 gap-3 px-4 pb-4">
							{generatedImages.map((image) => (
								<Card
									key={image.id}
									className="group relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
									onClick={() => handleAddToTimeline(image)}
								>
									<img
										src={image.url}
										alt={image.prompt}
										className="w-full aspect-video object-cover"
									/>
									<div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
										<div className="text-center text-white">
											<ImageIcon className="w-6 h-6 mx-auto mb-1" />
											<span className="text-xs">Add to Timeline</span>
										</div>
									</div>
									<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
										<p className="text-[10px] text-white/80 line-clamp-2">
											{image.prompt}
										</p>
									</div>
								</Card>
							))}
						</div>
					</ScrollArea>
				</div>
			)}

			{/* Empty State */}
			{generatedImages.length === 0 && !isGenerating && (
				<div className="flex-1 flex items-center justify-center p-8">
					<div className="text-center text-muted-foreground">
						<Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
						<p className="text-sm font-medium">No images generated yet</p>
						<p className="text-xs mt-1">
							Enter a prompt and click Generate to create AI images
						</p>
					</div>
				</div>
			)}
		</div>
	);
};
