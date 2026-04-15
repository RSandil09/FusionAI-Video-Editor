"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { useState, useEffect } from "react";
import {
	Menu,
	X,
	ArrowRight,
	Sparkles,
	ChevronRight,
	Zap,
	Check,
	ChevronDown,
	Wand2,
	UploadCloud,
	Globe,
	LayoutDashboard,
	Scissors,
	Captions,
	Mic,
	Image as ImageIcon,
	Music,
	Layers,
	Film,
	Type,
	Cpu,
	PlusCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────

const NAV_LINKS = [
	{ label: "About", href: "#about" },
	{ label: "Features", href: "#features" },
	{ label: "Pricing", href: "#pricing" },
];

const STATS = [
	{ value: "11", label: "AI-Powered Tools" },
	{ value: "50+", label: "Languages Supported" },
	{ value: "40+", label: "Transition Effects" },
	{ value: "100%", label: "Free in Beta" },
];

const FEATURES = [
	{
		icon: Captions,
		title: "AI Auto-Captions",
		description:
			"Generate accurate captions in 50+ languages automatically from your video's audio. Style them with 3 font presets, colors, and animations — synced frame-perfect to your timeline.",
		badge: "AI",
	},
	{
		icon: Scissors,
		title: "Smart Scene Detection",
		description:
			"Fusion's AI scans your footage and detects every scene change, silent gap, and highlight moment. One click to auto-cut and tighten your edit.",
		badge: "AI",
	},
	{
		icon: Wand2,
		title: "AI Image Generator",
		description:
			"Generate stunning visuals from a text prompt directly inside the editor. Choose from 8 styles — Cinematic, Anime, 3D Render, Illustration, and more — in any aspect ratio.",
		badge: "AI",
	},
	{
		icon: Mic,
		title: "AI Voice Over",
		description:
			"Turn any script into natural-sounding voice overs in 28 languages. Choose from dozens of voices by gender, tone, and use case. Generate and drop onto the timeline in seconds.",
		badge: "AI",
	},
	{
		icon: Cpu,
		title: "Silence & Highlight Removal",
		description:
			"Automatically detect and remove silent gaps from your footage, or let the AI extract only the highlight moments. Reduce a 30-minute recording to a 2-minute reel automatically.",
		badge: "AI",
	},
	{
		icon: ImageIcon,
		title: "Background Removal",
		description:
			"Remove the background from any video or image in one click using AI. Perfect for green-screen effects, product showcases, and professional portrait content.",
		badge: "AI",
	},
	{
		icon: Film,
		title: "40+ Transitions",
		description:
			"Add professional transitions between clips — fade, slide, wipe, flip, zoom, blur, and more in every direction. Configure direction and duration per clip.",
		badge: "Core",
	},
	{
		icon: Type,
		title: "30+ Text Animations",
		description:
			"Bring your captions and text overlays to life with entrance, loop, and exit animations. Typewriter, Drop In, Pulse, Glitch, Wave, and many more — all configurable.",
		badge: "Core",
	},
	{
		icon: Music,
		title: "Audio Visualizers",
		description:
			"Add dynamic audio visualizers that react to your soundtrack in real-time. Choose from Linear Bars, Wave, Hill, and Radial styles — fully customizable colors and shapes.",
		badge: "Core",
	},
	{
		icon: ImageIcon,
		title: "Stock Library",
		description:
			"Access millions of royalty-free videos and images from Pexels and animated stickers and GIFs from GIPHY — all searchable and addable to your timeline without leaving the editor.",
		badge: "Core",
	},
	{
		icon: Mic,
		title: "Voice Recorder",
		description:
			"Record your voice directly inside the editor. Capture narration, commentary, or voiceovers in real-time with instant timeline placement.",
		badge: "Core",
	},
	{
		icon: Layers,
		title: "Multi-Format Export",
		description:
			"Export your final video as MP4 in portrait (9:16), landscape (16:9), or square (1:1) — optimized for TikTok, YouTube, Instagram Reels, and YouTube Ads.",
		badge: "Core",
	},
];

const HOW_IT_WORKS = [
	{
		step: "01",
		icon: UploadCloud,
		title: "Upload your footage",
		description:
			"Drop in your raw clips, images, and audio. Fusion supports all major formats. Your files live in the cloud — accessible from anywhere, any time.",
	},
	{
		step: "02",
		icon: Sparkles,
		title: "AI does the heavy lifting",
		description:
			"Auto-captions, scene detection, silence removal, highlight extraction, and background removal — all triggered with one click. Fusion handles the tedious parts.",
	},
	{
		step: "03",
		icon: Scissors,
		title: "Refine in the timeline",
		description:
			"Jump into the multi-track timeline editor. Adjust captions, add transitions and animations, drop in stock footage, overlay music, and fine-tune every frame.",
	},
	{
		step: "04",
		icon: Globe,
		title: "Export for any platform",
		description:
			"Choose your output format — 9:16 for TikTok and Reels, 16:9 for YouTube, 1:1 for Instagram. Export to MP4 and publish.",
	},
];


const FAQ_ITEMS = [
	{
		question: "Is Fusion really free during beta?",
		answer:
			"Yes — 100% free, no credit card required. Every feature, every AI tool, unlimited exports. We're in open beta and want creators to try everything. Pricing tiers will be introduced after beta, and early users will get generous grandfather rates.",
	},
	{
		question: "What video formats does Fusion support?",
		answer:
			"Fusion supports all major formats for import — MP4, MOV, WebM, AVI, MKV, and more. Export is currently MP4 at your chosen resolution. Direct cloud storage means no local file size limits.",
	},
	{
		question: "How accurate are the AI captions?",
		answer:
			"Our AI transcription achieves high accuracy on clear audio across 50+ languages. For technical terms or noisy environments, use the built-in caption editor to review and fix any words in seconds.",
	},
	{
		question: "Can I use Fusion for portrait content (TikTok, Reels)?",
		answer:
			"Fusion was built portrait-first. The default canvas is 9:16 (1080×1920). You can switch to 16:9 for YouTube or 1:1 for Instagram posts at any time from the navbar resize menu.",
	},
	{
		question: "What AI tools are included?",
		answer:
			"Auto-captions, scene detection, silence removal, highlight extraction, AI image generation (text-to-image with 8 styles), AI voice over (TTS in 28 languages), and background removal — all included free in beta.",
	},
	{
		question: "Does Fusion work on mobile?",
		answer:
			"The editor is currently optimised for desktop browsers. A simplified mobile view is available, but for the full timeline and AI features, desktop is recommended. A native mobile app is on our roadmap.",
	},
];

const FOOTER_LINKS = {
	Product: ["Features", "Pricing", "Changelog", "Roadmap"],
	Company: ["About", "Blog", "Careers", "Contact"],
	Resources: ["Documentation", "Tutorials", "Community", "Templates"],
	Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
};

// ─────────────────────────────────────────────────────────────
// EDITOR MOCKUP COMPONENT
// ─────────────────────────────────────────────────────────────

function EditorMockup() {
	const toolIcons = [
		{ label: "Templates", icon: "▤" },
		{ label: "Uploads", icon: "⬆" },
		{ label: "Text", icon: "T" },
		{ label: "Captions", icon: "CC" },
		{ label: "Elements", icon: "✦" },
		{ label: "Audio", icon: "♪" },
		{ label: "AI", icon: "✧" },
	];

	const tracks = [
		{ label: "V", color: "#ff6a00", clips: [{ left: 0, width: 55 }, { left: 58, width: 30 }] },
		{ label: "A", color: "#3b82f6", clips: [{ left: 5, width: 70 }] },
		{ label: "CC", color: "#a855f7", clips: [{ left: 0, width: 45 }, { left: 48, width: 30 }] },
	];

	return (
		<div
			className="w-full rounded-2xl overflow-hidden"
			style={{
				background: "#0e0e0e",
				border: "1px solid rgba(255,255,255,0.08)",
				boxShadow: "0 40px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,106,0,0.08)",
			}}
		>
			{/* ── Navbar ── */}
			<div
				className="flex items-center justify-between px-3 h-11"
				style={{ background: "#141414", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
			>
				<div className="flex items-center gap-3">
					<Image src="/FusionAI.svg" alt="Fusion" width={20} height={20} />
					<div
						className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
						style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
					>
						My First Vlog.mp4
					</div>
				</div>
				<div className="flex items-center gap-2">
					{/* Undo/redo */}
					<div className="flex items-center gap-1">
						{["↩", "↪"].map((s, i) => (
							<div
								key={i}
								className="h-7 w-7 rounded-lg flex items-center justify-center text-xs"
								style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
							>
								{s}
							</div>
						))}
					</div>
					{/* Format badge */}
					<div
						className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium"
						style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
					>
						9:16 ▾
					</div>
					{/* Export */}
					<div
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
						style={{ background: "#ff6a00", color: "#fff" }}
					>
						Export
					</div>
					{/* Save status */}
					<div
						className="text-[10px] px-2 py-1 rounded-lg"
						style={{ color: "#16a34a", background: "rgba(22,163,74,0.1)" }}
					>
						✓ Saved
					</div>
				</div>
			</div>

			{/* ── Body ── */}
			<div className="flex" style={{ height: "380px" }}>
				{/* Left icon sidebar */}
				<div
					className="flex flex-col items-center gap-1 py-3 flex-shrink-0"
					style={{ width: "52px", background: "#111", borderRight: "1px solid rgba(255,255,255,0.05)" }}
				>
					{toolIcons.map((t, i) => (
						<div
							key={i}
							className="h-10 w-10 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all"
							style={{
								background: i === 3 ? "rgba(255,106,0,0.15)" : "transparent",
								color: i === 3 ? "#ff6a00" : "rgba(255,255,255,0.3)",
							}}
						>
							<span className="text-[11px] font-bold">{t.icon}</span>
						</div>
					))}
				</div>

				{/* Captions panel (open) */}
				<div
					className="flex-shrink-0 flex flex-col"
					style={{ width: "180px", background: "#111", borderRight: "1px solid rgba(255,255,255,0.05)" }}
				>
					<div className="px-3 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
						<span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>AI Captions</span>
					</div>
					<div className="px-3 py-2 flex flex-col gap-1.5">
						{/* Language selector */}
						<div className="rounded-lg px-2.5 py-2 text-[10px] flex items-center justify-between" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
							<span>English (US)</span><span>▾</span>
						</div>
						{/* Generate button */}
						<div
							className="rounded-lg px-2.5 py-2 text-[10px] font-semibold flex items-center gap-1.5 justify-center"
							style={{ background: "rgba(255,106,0,0.15)", color: "#ff6a00", border: "1px solid rgba(255,106,0,0.25)" }}
						>
							<span>✧</span> Generate Captions
						</div>
						{/* Caption list items */}
						<div className="mt-1 flex flex-col gap-1">
							{[
								"Hey guys, welcome back—",
								"to my channel! Today",
								"we're going to explore",
								"the city and try some",
							].map((line, i) => (
								<div
									key={i}
									className="rounded-md px-2 py-1.5 text-[9px] leading-relaxed"
									style={{
										background: i === 1 ? "rgba(255,106,0,0.1)" : "rgba(255,255,255,0.03)",
										color: i === 1 ? "#ff6a00" : "rgba(255,255,255,0.4)",
										border: i === 1 ? "1px solid rgba(255,106,0,0.2)" : "1px solid transparent",
									}}
								>
									{line}
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Canvas area */}
				<div
					className="flex-1 flex items-center justify-center relative overflow-hidden"
					style={{
						background: "radial-gradient(ellipse 60% 60% at 50% 45%, rgba(255,106,0,0.04) 0%, transparent 70%)",
					}}
				>
					{/* Grid dots */}
					<div
						className="absolute inset-0 pointer-events-none"
						style={{
							backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
							backgroundSize: "24px 24px",
						}}
					/>

					{/* Portrait video canvas */}
					<div
						className="relative flex-shrink-0"
						style={{
							width: "130px",
							height: "231px",
							borderRadius: "12px",
							background: "linear-gradient(160deg, #1a1a2e 0%, #0e0e1a 100%)",
							border: "1.5px solid rgba(255,106,0,0.25)",
							boxShadow: "0 0 40px rgba(255,106,0,0.08)",
							overflow: "hidden",
						}}
					>
						{/* Video frame gradient */}
						<div
							className="absolute inset-0"
							style={{
								background: "linear-gradient(180deg, rgba(20,20,40,0.9) 0%, rgba(10,10,25,0.95) 100%)",
							}}
						/>
						{/* Play button */}
						<div className="absolute inset-0 flex items-center justify-center">
							<div
								className="h-10 w-10 rounded-full flex items-center justify-center"
								style={{ background: "rgba(255,106,0,0.15)", border: "1.5px solid rgba(255,106,0,0.3)" }}
							>
								<div
									className="ml-0.5"
									style={{
										width: 0,
										height: 0,
										borderTop: "6px solid transparent",
										borderBottom: "6px solid transparent",
										borderLeft: "10px solid #ff6a00",
									}}
								/>
							</div>
						</div>
						{/* Caption overlay */}
						<div
							className="absolute bottom-4 left-2 right-2 flex flex-col items-center gap-1"
						>
							<div
								className="px-2 py-1 rounded text-center text-[8px] font-bold leading-tight"
								style={{ background: "rgba(0,0,0,0.75)", color: "#fff", backdropFilter: "blur(4px)" }}
							>
								<span style={{ color: "#ff6a00" }}>Today</span> we&apos;re going to
								<br />explore the city!
							</div>
						</div>
						{/* Frame counter */}
						<div
							className="absolute top-2 right-2 text-[7px] px-1.5 py-0.5 rounded"
							style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.5)" }}
						>
							00:12
						</div>
					</div>

					{/* AI badge floating */}
					<div
						className="absolute flex items-center gap-2"
						style={{
							top: "18px",
							right: "16px",
							background: "#141414",
							border: "1px solid rgba(255,106,0,0.2)",
							borderRadius: "12px",
							padding: "8px 12px",
							boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
						}}
					>
						<div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: "#ff6a00" }}>
							<span className="text-white text-[10px] font-bold">✧</span>
						</div>
						<div>
							<div className="text-[10px] font-semibold text-white">Captions Ready</div>
							<div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>34 segments • EN</div>
						</div>
					</div>

					{/* Scene detection badge */}
					<div
						className="absolute flex items-center gap-2"
						style={{
							bottom: "18px",
							right: "16px",
							background: "#141414",
							border: "1px solid rgba(59,130,246,0.25)",
							borderRadius: "12px",
							padding: "8px 12px",
							boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
						}}
					>
						<div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,0.2)" }}>
							<span style={{ color: "#3b82f6", fontSize: "10px" }}>⚡</span>
						</div>
						<div>
							<div className="text-[10px] font-semibold text-white">12 Scenes Detected</div>
							<div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>Silence removed</div>
						</div>
					</div>
				</div>

				{/* Right properties panel */}
				<div
					className="hidden xl:flex flex-col flex-shrink-0"
					style={{ width: "180px", background: "#111", borderLeft: "1px solid rgba(255,255,255,0.05)" }}
				>
					<div className="px-3 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
						<span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Properties</span>
					</div>
					<div className="px-3 py-3 flex flex-col gap-3">
						{[
							{ label: "Position X", value: "540" },
							{ label: "Position Y", value: "960" },
							{ label: "Scale", value: "100%" },
							{ label: "Opacity", value: "100%" },
							{ label: "Duration", value: "3.2s" },
						].map((p) => (
							<div key={p.label} className="flex items-center justify-between">
								<span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>{p.label}</span>
								<div
									className="text-[9px] px-2 py-0.5 rounded"
									style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
								>
									{p.value}
								</div>
							</div>
						))}
						<div className="h-px my-1" style={{ background: "rgba(255,255,255,0.05)" }} />
						<div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.25)" }}>
							Caption Style
						</div>
						{[
							{ label: "Font", value: "Bold" },
							{ label: "Color", value: "#FFFFFF" },
							{ label: "Animation", value: "TypeWriter" },
						].map((p) => (
							<div key={p.label} className="flex items-center justify-between">
								<span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>{p.label}</span>
								<div
									className="text-[9px] px-2 py-0.5 rounded"
									style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
								>
									{p.value}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* ── Timeline ── */}
			<div
				style={{ background: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.05)" }}
			>
				{/* Playhead ruler */}
				<div
					className="flex items-center px-3 gap-2"
					style={{ height: "28px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
				>
					<div
						className="flex items-center gap-1 text-[10px] flex-shrink-0"
						style={{ width: "52px", color: "rgba(255,255,255,0.35)" }}
					>
						<span>▶</span>
						<span>0:12</span>
					</div>
					<div className="flex-1 relative h-full flex items-center">
						{/* Time markers */}
						<div className="w-full flex justify-between px-1">
							{["0:00", "0:10", "0:20", "0:30", "0:40", "0:50"].map((t) => (
								<span key={t} className="text-[8px]" style={{ color: "rgba(255,255,255,0.2)" }}>{t}</span>
							))}
						</div>
						{/* Playhead */}
						<div
							className="absolute top-0 bottom-0 w-px"
							style={{ left: "38%", background: "#ff6a00" }}
						>
							<div className="w-2 h-2 rounded-full -ml-[3px] -mt-0.5" style={{ background: "#ff6a00" }} />
						</div>
					</div>
				</div>

				{/* Track rows */}
				<div className="flex flex-col gap-px py-1.5">
					{tracks.map((track, ti) => (
						<div key={ti} className="flex items-center" style={{ height: "26px" }}>
							{/* Label */}
							<div
								className="flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
								style={{ width: "52px", color: "rgba(255,255,255,0.25)" }}
							>
								{track.label}
							</div>
							{/* Clips */}
							<div className="flex-1 relative h-full">
								{track.clips.map((clip, ci) => (
									<div
										key={ci}
										className="absolute top-0.5 bottom-0.5 rounded-md"
										style={{
											left: `${clip.left}%`,
											width: `${clip.width}%`,
											background: `${track.color}22`,
											border: `1px solid ${track.color}55`,
										}}
									>
										<div
											className="absolute inset-y-0 left-0 w-1 rounded-l-md"
											style={{ background: track.color, opacity: 0.7 }}
										/>
									</div>
								))}
								{/* Playhead overlay */}
								<div
									className="absolute top-0 bottom-0 w-px pointer-events-none"
									style={{ left: "38%", background: "rgba(255,106,0,0.5)" }}
								/>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────
// FEATURE CARD VISUALS
// ─────────────────────────────────────────────────────────────

function FeatureVisual({ index }: { index: number }) {
	const visuals = [
		// 0 — AI Captions: caption lines with one highlighted
		<div key={0} className="flex flex-col gap-1.5 px-4 py-5">
			{["Hey guys, welcome back—", "to my channel! Today", "we're going to explore", "the city and try some"].map((line, i) => (
				<div key={i} className="rounded-md px-3 py-2 text-[10px] font-medium" style={{
					background: i === 1 ? "rgba(255,106,0,0.18)" : "rgba(255,255,255,0.04)",
					color: i === 1 ? "#ff6a00" : "rgba(255,255,255,0.35)",
					border: i === 1 ? "1px solid rgba(255,106,0,0.3)" : "1px solid transparent",
				}}>{line}</div>
			))}
			<div className="mt-1 flex items-center gap-2 px-1">
				<div className="flex-1 h-px" style={{ background: "rgba(255,106,0,0.2)" }} />
				<span className="text-[9px]" style={{ color: "#ff6a00" }}>34 segments • EN</span>
			</div>
		</div>,

		// 1 — Scene Detection: filmstrip with markers
		<div key={1} className="flex flex-col gap-3 px-4 py-5">
			<div className="flex gap-1">
				{[40, 65, 30, 55, 45, 70, 35, 60].map((h, i) => (
					<div key={i} className="flex-1 rounded-sm" style={{ height: `${h}px`, background: i === 2 || i === 5 ? "rgba(255,106,0,0.6)" : "rgba(255,255,255,0.08)", border: i === 2 || i === 5 ? "1px solid rgba(255,106,0,0.4)" : "none" }} />
				))}
			</div>
			<div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
				<span style={{ color: "#60a5fa", fontSize: "10px" }}>⚡</span>
				<span className="text-[10px] font-medium" style={{ color: "#60a5fa" }}>12 scenes detected</span>
			</div>
			<div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,106,0,0.08)", border: "1px solid rgba(255,106,0,0.15)" }}>
				<span style={{ color: "#ff6a00", fontSize: "10px" }}>✂</span>
				<span className="text-[10px] font-medium" style={{ color: "#ff6a00" }}>Silence removed</span>
			</div>
		</div>,

		// 2 — AI Image Generator: style grid
		<div key={2} className="grid grid-cols-3 gap-1.5 px-4 py-4">
			{[
				{ label: "Cinematic", bg: "linear-gradient(135deg,#1a1a2e,#16213e)" },
				{ label: "Anime", bg: "linear-gradient(135deg,#2d1b69,#11998e)" },
				{ label: "3D", bg: "linear-gradient(135deg,#0f0c29,#302b63)", active: true },
				{ label: "Illustr.", bg: "linear-gradient(135deg,#1a1a2e,#4a0072)" },
				{ label: "Realistic", bg: "linear-gradient(135deg,#0f2027,#203a43)" },
				{ label: "Abstract", bg: "linear-gradient(135deg,#232526,#414345)" },
			].map((s, i) => (
				<div key={i} className="rounded-lg flex items-end p-1.5 cursor-pointer" style={{ height: "52px", background: s.bg, border: s.active ? "1.5px solid #ff6a00" : "1px solid rgba(255,255,255,0.07)" }}>
					<span className="text-[8px] font-medium" style={{ color: s.active ? "#ff6a00" : "rgba(255,255,255,0.45)" }}>{s.label}</span>
				</div>
			))}
		</div>,

		// 3 — AI Voice Over: waveform + voice selector
		<div key={3} className="flex flex-col gap-3 px-4 py-4">
			<div className="flex items-center gap-1 justify-center" style={{ height: "52px" }}>
				{[3,6,10,14,18,22,16,12,8,20,24,18,10,6,14,20,16,8,12,18,10,6].map((h, i) => (
					<div key={i} className="w-1 rounded-full flex-shrink-0" style={{ height: `${h}px`, background: i > 4 && i < 17 ? "#ff6a00" : "rgba(255,255,255,0.15)", opacity: i > 4 && i < 17 ? 1 : 0.5 }} />
				))}
			</div>
			<div className="grid grid-cols-2 gap-1.5">
				{[{ name: "Sarah", tone: "Warm" }, { name: "Marcus", tone: "Deep" }, { name: "Aria", tone: "Clear", active: true }, { name: "James", tone: "Calm" }].map((v, i) => (
					<div key={i} className="rounded-lg px-2.5 py-1.5" style={{ background: v.active ? "rgba(255,106,0,0.12)" : "rgba(255,255,255,0.04)", border: v.active ? "1px solid rgba(255,106,0,0.25)" : "1px solid rgba(255,255,255,0.06)" }}>
						<div className="text-[9px] font-semibold" style={{ color: v.active ? "#ff6a00" : "rgba(255,255,255,0.6)" }}>{v.name}</div>
						<div className="text-[8px]" style={{ color: "rgba(255,255,255,0.3)" }}>{v.tone}</div>
					</div>
				))}
			</div>
		</div>,

		// 4 — Silence Removal: timeline with gaps
		<div key={4} className="flex flex-col gap-3 px-4 py-4">
			<div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Before</div>
			<div className="h-6 rounded-lg overflow-hidden flex" style={{ background: "rgba(255,255,255,0.04)" }}>
				{[30,8,20,5,22,10,25,15,18,6,20].map((w, i) => (
					<div key={i} className="h-full flex-shrink-0" style={{ width: `${w}px`, background: i % 2 === 0 ? "rgba(255,255,255,0.15)" : "transparent", borderRight: i % 2 !== 0 ? "1px dashed rgba(255,255,255,0.08)" : "none" }} />
				))}
			</div>
			<div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "#ff6a00" }}>After</div>
			<div className="h-6 rounded-lg overflow-hidden flex" style={{ background: "rgba(255,255,255,0.04)" }}>
				{[30,20,22,25,18,20].map((w, i) => (
					<div key={i} className="h-full flex-shrink-0 mr-px" style={{ width: `${w + 8}px`, background: "rgba(255,106,0,0.35)", borderRadius: "3px" }} />
				))}
			</div>
			<div className="text-[10px] font-medium text-center" style={{ color: "rgba(255,255,255,0.4)" }}>32% shorter · same story</div>
		</div>,

		// 5 — Background Removal: before/after split
		<div key={5} className="relative px-4 py-3 flex gap-2">
			<div className="flex-1 rounded-xl overflow-hidden" style={{ height: "110px", background: "linear-gradient(160deg,#1a1a2e,#0e0e1a)", border: "1px solid rgba(255,255,255,0.07)" }}>
				<div className="w-full h-full flex items-center justify-center">
					<div className="w-10 h-16 rounded-full" style={{ background: "rgba(255,255,255,0.12)", boxShadow: "0 0 0 4px rgba(255,255,255,0.04)" }} />
				</div>
				<div className="absolute bottom-5 left-5 text-[8px]" style={{ color: "rgba(255,255,255,0.3)" }}>Original</div>
			</div>
			<div className="flex-1 rounded-xl overflow-hidden" style={{ height: "110px", backgroundImage: "linear-gradient(45deg,rgba(255,255,255,0.04) 25%,transparent 25%,transparent 75%,rgba(255,255,255,0.04) 75%),linear-gradient(45deg,rgba(255,255,255,0.04) 25%,transparent 25%,transparent 75%,rgba(255,255,255,0.04) 75%)", backgroundSize: "10px 10px", backgroundPosition: "0 0, 5px 5px", border: "1px solid rgba(255,106,0,0.15)" }}>
				<div className="w-full h-full flex items-center justify-center">
					<div className="w-10 h-16 rounded-full" style={{ background: "rgba(255,106,0,0.25)", border: "1px solid rgba(255,106,0,0.4)" }} />
				</div>
				<div className="absolute bottom-5 right-5 text-[8px]" style={{ color: "#ff6a00" }}>Removed</div>
			</div>
		</div>,

		// 6 — Transitions: two frames with diagonal split
		<div key={6} className="relative px-4 py-3 flex gap-2">
			<div className="flex-1 rounded-xl overflow-hidden flex items-center justify-center" style={{ height: "110px", background: "linear-gradient(135deg,#1a1a2e,#0e1a2e)", border: "1px solid rgba(255,255,255,0.07)" }}>
				<span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Scene A</span>
			</div>
			<div className="flex flex-col items-center justify-center gap-1" style={{ width: "28px" }}>
				<div className="h-px w-full" style={{ background: "rgba(255,106,0,0.4)" }} />
				<span className="text-[9px] font-bold" style={{ color: "#ff6a00" }}>→</span>
				<div className="h-px w-full" style={{ background: "rgba(255,106,0,0.4)" }} />
			</div>
			<div className="flex-1 rounded-xl overflow-hidden flex items-center justify-center" style={{ height: "110px", background: "linear-gradient(135deg,#2e1a0e,#1a0e0e)", border: "1px solid rgba(255,106,0,0.15)" }}>
				<span className="text-[10px] font-semibold" style={{ color: "rgba(255,106,0,0.6)" }}>Scene B</span>
			</div>
			<div className="absolute bottom-4 left-0 right-0 text-center text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>Slide · Fade · Wipe · Flip +37</div>
		</div>,

		// 7 — Text Animations: floating text elements
		<div key={7} className="relative px-4 py-3 flex flex-col gap-2">
			{[
				{ text: "TypeWriter", opacity: 1, color: "#ff6a00", x: "0px" },
				{ text: "Drop In", opacity: 0.7, color: "rgba(255,255,255,0.6)", x: "8px" },
				{ text: "Glitch", opacity: 0.5, color: "rgba(255,255,255,0.4)", x: "4px" },
				{ text: "Wave", opacity: 0.35, color: "rgba(255,255,255,0.3)", x: "12px" },
			].map((t, i) => (
				<div key={i} className="rounded-lg px-3 py-2 text-[11px] font-semibold" style={{ background: i === 0 ? "rgba(255,106,0,0.1)" : "rgba(255,255,255,0.03)", color: t.color, border: i === 0 ? "1px solid rgba(255,106,0,0.2)" : "1px solid transparent", transform: `translateX(${t.x})` }}>
					{t.text}
				</div>
			))}
		</div>,

		// 8 — Audio Visualizers: bar chart
		<div key={8} className="px-4 py-3 flex flex-col gap-3">
			<div className="flex items-end gap-1 justify-center" style={{ height: "70px" }}>
				{[20,35,55,42,68,80,58,72,45,62,38,50,30,44,60,48,35,25].map((h, i) => (
					<div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}px`, background: `rgba(255,106,0,${0.3 + (h / 80) * 0.7})` }} />
				))}
			</div>
			<div className="flex items-center gap-2">
				{["Linear Bars", "Wave", "Radial", "Hill"].map((s, i) => (
					<div key={i} className="flex-1 text-center py-1 rounded-lg text-[8px] font-semibold" style={{ background: i === 0 ? "rgba(255,106,0,0.15)" : "rgba(255,255,255,0.04)", color: i === 0 ? "#ff6a00" : "rgba(255,255,255,0.3)", border: i === 0 ? "1px solid rgba(255,106,0,0.2)" : "none" }}>{s}</div>
				))}
			</div>
		</div>,

		// 9 — Stock Library: thumbnail grid
		<div key={9} className="px-4 py-3 grid grid-cols-3 gap-1.5">
			{[
				"linear-gradient(135deg,#1a1a2e,#16213e)",
				"linear-gradient(135deg,#0f2027,#203a43)",
				"linear-gradient(135deg,#1a0a2e,#2d1b69)",
				"linear-gradient(135deg,#0a1a0a,#1a3a1a)",
				"linear-gradient(135deg,#2a0a0a,#3a1a1a)",
				"linear-gradient(135deg,#1a1a0a,#2a2a1a)",
			].map((bg, i) => (
				<div key={i} className="rounded-lg flex items-end p-1.5" style={{ height: "52px", background: bg, border: "1px solid rgba(255,255,255,0.06)" }}>
					<div className="h-1.5 w-full rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
				</div>
			))}
			<div className="col-span-3 text-center text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>Pexels · GIPHY · Millions of assets</div>
		</div>,

		// 10 — Voice Recorder: mic with pulse
		<div key={10} className="flex flex-col items-center justify-center gap-3 px-4 py-4" style={{ height: "140px" }}>
			<div className="relative flex items-center justify-center">
				<div className="absolute rounded-full" style={{ width: "64px", height: "64px", background: "rgba(255,106,0,0.06)", border: "1px solid rgba(255,106,0,0.12)" }} />
				<div className="absolute rounded-full" style={{ width: "48px", height: "48px", background: "rgba(255,106,0,0.1)", border: "1px solid rgba(255,106,0,0.2)" }} />
				<div className="h-9 w-9 rounded-full flex items-center justify-center relative z-10" style={{ background: "#ff6a00" }}>
					<Mic className="h-4 w-4 text-white" />
				</div>
			</div>
			<div className="flex items-center gap-1">
				{[4,7,11,8,14,10,6,12,9,5].map((h, i) => (
					<div key={i} className="w-1 rounded-full" style={{ height: `${h}px`, background: "rgba(255,106,0,0.5)" }} />
				))}
			</div>
			<div className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>Recording • 0:14</div>
		</div>,

		// 11 — Multi-Format Export: platform format badges
		<div key={11} className="flex flex-col gap-2 px-4 py-3">
			{[
				{ label: "TikTok · Reels", ratio: "9:16", color: "#ff6a00", w: "70%" },
				{ label: "YouTube", ratio: "16:9", color: "#60a5fa", w: "100%" },
				{ label: "Instagram", ratio: "1:1", color: "#a78bfa", w: "55%" },
			].map((p, i) => (
				<div key={i} className="flex items-center gap-2.5">
					<div className="rounded flex-shrink-0 flex items-center justify-center text-[8px] font-bold" style={{ width: "32px", height: "20px", background: `${p.color}20`, color: p.color, border: `1px solid ${p.color}40` }}>{p.ratio}</div>
					<div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
						<div className="h-full rounded-full" style={{ width: p.w, background: `${p.color}60` }} />
					</div>
					<span className="text-[9px] w-14 text-right" style={{ color: "rgba(255,255,255,0.35)" }}>{p.label}</span>
				</div>
			))}
			<div className="mt-1 rounded-xl py-2 text-center text-[10px] font-semibold" style={{ background: "rgba(255,106,0,0.12)", color: "#ff6a00", border: "1px solid rgba(255,106,0,0.2)" }}>Export as MP4</div>
		</div>,
	];
	return visuals[index] ?? visuals[0];
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────

export default function LandingPage() {
	const { user, loading } = useAuth();
	const router = useRouter();
	const [menuOpen, setMenuOpen] = useState(false);
	const [openFaq, setOpenFaq] = useState<number | null>(null);

	useEffect(() => {
		if (!loading && user) {
			router.replace("/dashboard");
		}
	}, [user, loading, router]);

	if (loading || user) return null;

	return (
		<div className="min-h-screen bg-white text-[#0e0e0e] overflow-x-hidden font-sans">

			{/* ═══════════════════════════════════════════════════════
			    NAVBAR
			═══════════════════════════════════════════════════════ */}
			<nav
				className="fixed top-0 left-0 right-0 z-50"
				style={{
					background: "rgba(255,255,255,0.88)",
					backdropFilter: "blur(20px)",
					WebkitBackdropFilter: "blur(20px)",
					borderBottom: "1px solid rgba(14,14,14,0.07)",
				}}
			>
				<div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
					<div className="flex items-center gap-10">
						<Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
							<Image src="/FusionAI.svg" alt="Fusion" width={30} height={30} />
							<span className="font-bold text-[15px] tracking-tight hidden sm:block text-[#0e0e0e]">
								Fusion
							</span>
							<span
								className="text-[10px] font-semibold px-2 py-0.5 rounded-full hidden sm:block"
								style={{ background: "rgba(255,106,0,0.1)", color: "#ff6a00", border: "1px solid rgba(255,106,0,0.2)" }}
							>
								BETA
							</span>
						</Link>
						<div className="hidden lg:flex items-center gap-1">
							{NAV_LINKS.map((l) => (
								<Link
									key={l.label}
									href={l.href}
									className="px-3 py-2 rounded-lg text-sm transition-colors"
									style={{ color: "rgba(14,14,14,0.55)" }}
									onMouseEnter={(e) => (e.currentTarget.style.color = "#0e0e0e")}
									onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(14,14,14,0.55)")}
								>
									{l.label}
								</Link>
							))}
						</div>
					</div>

					<div className="hidden md:flex items-center gap-3">
						{user ? (
							<Link
								href="/dashboard"
								className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
								style={{ background: "#ff6a00", color: "#fff" }}
							>
								<LayoutDashboard className="h-3.5 w-3.5" />
								Dashboard
							</Link>
						) : (
							<>
								<Link
									href="/login"
									className="text-sm px-3 py-2 rounded-lg transition-colors"
									style={{ color: "rgba(14,14,14,0.55)" }}
									onMouseEnter={(e) => (e.currentTarget.style.color = "#0e0e0e")}
									onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(14,14,14,0.55)")}
								>
									Sign in
								</Link>
								<Link
									href="/login"
									className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
									style={{ background: "#ff6a00", color: "#fff", boxShadow: "0 2px 12px rgba(255,106,0,0.3)" }}
								>
									Try Free — No Card
								</Link>
							</>
						)}
					</div>

					<button
						className="md:hidden p-2 rounded-lg"
						onClick={() => setMenuOpen(!menuOpen)}
						style={{ color: "rgba(14,14,14,0.6)" }}
					>
						{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</button>
				</div>

				{menuOpen && (
					<div
						className="md:hidden px-6 py-5 flex flex-col gap-3"
						style={{ background: "#fff", borderTop: "1px solid rgba(14,14,14,0.07)" }}
					>
						{NAV_LINKS.map((l) => (
							<Link
								key={l.label}
								href={l.href}
								className="text-sm py-1"
								style={{ color: "rgba(14,14,14,0.6)" }}
								onClick={() => setMenuOpen(false)}
							>
								{l.label}
							</Link>
						))}
						<div className="flex flex-col gap-2 pt-3 border-t border-black/6">
							<Link
								href="/login"
								className="px-4 py-2.5 rounded-lg text-sm font-semibold text-center"
								style={{ background: "#ff6a00", color: "#fff" }}
							>
								Try Free — No Card Required
							</Link>
							<Link
								href="/login"
								className="px-4 py-2.5 rounded-lg text-sm text-center"
								style={{ border: "1px solid rgba(14,14,14,0.10)", color: "rgba(14,14,14,0.6)" }}
							>
								Sign in
							</Link>
						</div>
					</div>
				)}
			</nav>

			{/* ═══════════════════════════════════════════════════════
			    HERO
			═══════════════════════════════════════════════════════ */}
			<section className="relative min-h-screen flex flex-col justify-center pt-16 overflow-hidden bg-white">
				{/* Glow top-right */}
				<div
					className="absolute pointer-events-none"
					style={{
						top: "-100px", right: "-100px",
						width: "700px", height: "700px",
						background: "radial-gradient(ellipse, rgba(255,106,0,0.12) 0%, rgba(255,106,0,0.03) 45%, transparent 70%)",
						borderRadius: "50%",
					}}
				/>
				{/* Glow bottom-left */}
				<div
					className="absolute pointer-events-none"
					style={{
						bottom: "-80px", left: "15%",
						width: "500px", height: "400px",
						background: "radial-gradient(ellipse, rgba(255,106,0,0.05) 0%, transparent 65%)",
						borderRadius: "50%",
					}}
				/>

				<div className="max-w-7xl mx-auto px-6 w-full py-16">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-16 items-center">

						{/* Copy */}
						<div>
							{/* Beta badge */}
							<div className="flex items-center gap-2 mb-7">
								<div
									className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
									style={{
										background: "rgba(255,106,0,0.08)",
										border: "1px solid rgba(255,106,0,0.2)",
										color: "#ff6a00",
									}}
								>
									<span className="h-1.5 w-1.5 rounded-full bg-[#ff6a00] animate-pulse" />
									Now in Open Beta — Completely Free
								</div>
							</div>

							{/* Headline */}
							<h1
								className="font-display font-bold leading-[1.05] mb-6 tracking-tight text-[#0e0e0e]"
								style={{ fontSize: "clamp(2.6rem, 4.5vw, 4rem)" }}
							>
								Seamless AI editing
								<br />
								with our{" "}
								<span className="relative inline-block" style={{ color: "#ff6a00" }}>
									magic!
									<svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none" aria-hidden>
										<path d="M 2 6 Q 50 2 100 5 Q 150 8 198 3" stroke="#ff6a00" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
									</svg>
								</span>
							</h1>

							<p
								className="text-lg leading-relaxed mb-9"
								style={{ color: "rgba(14,14,14,0.55)", maxWidth: "440px" }}
							>
								Fusion is a professional AI video editor — auto-captions in 50+ languages,
								smart scene detection, AI voice generation, background removal, and
								multi-platform export. Free for everyone during beta.
							</p>

							{/* CTAs */}
							<div className="flex flex-wrap gap-3 mb-10">
								<Link
									href="/login"
									className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
									style={{ background: "#ff6a00", color: "#fff", boxShadow: "0 4px 24px rgba(255,106,0,0.30)" }}
								>
									Start Editing Free
									<ArrowRight className="h-4 w-4" />
								</Link>
								<Link
									href="#features"
									className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm transition-all"
									style={{ border: "1.5px solid rgba(14,14,14,0.12)", color: "rgba(14,14,14,0.65)" }}
								>
									See All Features
									<ChevronRight className="h-4 w-4" />
								</Link>
							</div>

							{/* Platform trust bar */}
							<div className="flex items-center gap-5 flex-wrap">
								<span className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: "rgba(14,14,14,0.4)" }}>
									For creators on
								</span>
								<div className="flex items-center gap-5">
									{/* Instagram */}
									<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" style={{ color: "rgba(14,14,14,0.4)" }}>
										<path fill="currentColor" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
									</svg>
									{/* TikTok */}
									<svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" style={{ color: "rgba(14,14,14,0.4)" }}>
										<path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.19 8.19 0 004.79 1.52V6.82a4.85 4.85 0 01-1.02-.13z"/>
									</svg>
									{/* Facebook */}
									<svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" style={{ color: "rgba(14,14,14,0.4)" }}>
										<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
									</svg>
								</div>
							</div>
						</div>

						{/* Editor Mockup — 3D perspective tilt */}
						<div
							style={{
								transform: "perspective(1400px) rotateX(6deg) rotateY(-12deg) rotateZ(1deg)",
								transformOrigin: "60% 50%",
								filter: "drop-shadow(0 60px 80px rgba(0,0,0,0.22)) drop-shadow(0 20px 30px rgba(0,0,0,0.12))",
								willChange: "transform",
							}}
						>
							<EditorMockup />
						</div>
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    STATS BAR
			═══════════════════════════════════════════════════════ */}
			<section style={{ background: "#ff6a00" }}>
				<div className="max-w-7xl mx-auto px-6">
					<div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/20">
						{STATS.map((s, i) => (
							<div key={i} className="flex flex-col items-center justify-center py-7 px-6">
								<div className="font-display font-bold text-3xl text-white mb-1">{s.value}</div>
								<div className="text-sm text-white/75">{s.label}</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    FEATURES
			═══════════════════════════════════════════════════════ */}
			<section id="features" className="relative py-24 overflow-hidden bg-white">
				{/* Subtle top glow */}
				<div className="absolute pointer-events-none" style={{ top: "-120px", left: "50%", transform: "translateX(-50%)", width: "900px", height: "400px", background: "radial-gradient(ellipse, rgba(255,106,0,0.05) 0%, transparent 65%)", borderRadius: "50%" }} />

				<div className="max-w-4xl mx-auto px-6 text-center mb-14 relative z-10">
					<div
						className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-5"
						style={{ background: "rgba(255,106,0,0.08)", border: "1px solid rgba(255,106,0,0.18)", color: "#ff6a00" }}
					>
						<Zap className="h-3 w-3" />
						Full Feature Suite
					</div>
					<h2
						className="font-display font-bold leading-tight mb-4 text-[#0e0e0e]"
						style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)" }}
					>
						Everything you need to create
						<br />
						<span style={{ color: "rgba(14,14,14,0.35)" }}>incredible content — all in one place</span>
					</h2>
					<p className="text-base max-w-xl mx-auto" style={{ color: "rgba(14,14,14,0.5)" }}>
						From AI-powered captions to stock footage, voice generation to audio visualizers —
						Fusion packs a full professional studio into your browser.
					</p>
				</div>

				{/* Row 1 — scrolls left */}
				<div className="relative overflow-hidden mb-4">
					<div className="flex gap-4" style={{ animation: "marquee 40s linear infinite", width: "max-content" }}>
						{[...Array(2)].flatMap((_, copy) =>
							FEATURES.slice(0, 6).map((f, i) => (
								<div
									key={`r1-${copy}-${i}`}
									className="flex-shrink-0 rounded-2xl overflow-hidden"
									style={{ width: "260px", background: "#111", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
								>
									{/* Visual area */}
									<div style={{ height: "170px", borderBottom: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", position: "relative" }}>
										<FeatureVisual index={i} />
									</div>
									{/* Label area */}
									<div className="px-4 py-3 flex items-center justify-between">
										<div>
											<h3 className="font-semibold text-sm text-white">{f.title}</h3>
										</div>
										<span
											className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
											style={{
												background: f.badge === "AI" ? "rgba(59,130,246,0.12)" : "rgba(255,106,0,0.12)",
												color: f.badge === "AI" ? "#60a5fa" : "#ff6a00",
												border: `1px solid ${f.badge === "AI" ? "rgba(59,130,246,0.2)" : "rgba(255,106,0,0.2)"}`,
											}}
										>
											{f.badge}
										</span>
									</div>
								</div>
							))
						)}
					</div>
				</div>

				{/* Row 2 — scrolls right */}
				<div className="relative overflow-hidden">
					<div className="flex gap-4" style={{ animation: "marquee-reverse 44s linear infinite", width: "max-content" }}>
						{[...Array(2)].flatMap((_, copy) =>
							FEATURES.slice(6).map((f, i) => (
								<div
									key={`r2-${copy}-${i}`}
									className="flex-shrink-0 rounded-2xl overflow-hidden"
									style={{ width: "260px", background: "#111", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
								>
									{/* Visual area */}
									<div style={{ height: "170px", borderBottom: "1px solid rgba(255,255,255,0.06)", overflow: "hidden", position: "relative" }}>
										<FeatureVisual index={i + 6} />
									</div>
									{/* Label area */}
									<div className="px-4 py-3 flex items-center justify-between">
										<div>
											<h3 className="font-semibold text-sm text-white">{f.title}</h3>
										</div>
										<span
											className="text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
											style={{
												background: f.badge === "AI" ? "rgba(59,130,246,0.12)" : "rgba(255,106,0,0.12)",
												color: f.badge === "AI" ? "#60a5fa" : "#ff6a00",
												border: `1px solid ${f.badge === "AI" ? "rgba(59,130,246,0.2)" : "rgba(255,106,0,0.2)"}`,
											}}
										>
											{f.badge}
										</span>
									</div>
								</div>
							))
						)}
					</div>
				</div>

				{/* Edge fades */}
				<div className="absolute inset-y-0 left-0 w-16 pointer-events-none z-10" style={{ background: "linear-gradient(to right, rgba(255,255,255,0.6), transparent)" }} />
				<div className="absolute inset-y-0 right-0 w-16 pointer-events-none z-10" style={{ background: "linear-gradient(to left, rgba(255,255,255,0.6), transparent)" }} />
			</section>

			{/* ═══════════════════════════════════════════════════════
			    HOW IT WORKS
			═══════════════════════════════════════════════════════ */}
			<section className="relative py-28 overflow-hidden bg-white" id="about">
				<div className="max-w-6xl mx-auto px-6">

					{/* Header */}
					<div className="text-center mb-20">
						<div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-5" style={{ background: "rgba(255,106,0,0.08)", border: "1px solid rgba(255,106,0,0.18)", color: "#ff6a00" }}>
							<Zap className="h-3 w-3" /> How It Works
						</div>
						<h2 className="font-display font-bold leading-tight mb-4 text-[#0e0e0e]" style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)" }}>
							From raw footage to final export
							<br /><span style={{ color: "rgba(14,14,14,0.3)" }}>in minutes — not hours</span>
						</h2>
						<p className="text-base max-w-lg mx-auto" style={{ color: "rgba(14,14,14,0.5)" }}>
							Fusion&apos;s AI pipeline handles the repetitive work. You focus on the story.
						</p>
					</div>

					{/* Step cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
						{HOW_IT_WORKS.map((step, i) => (
							<div
								key={i}
								className="relative rounded-3xl p-7 flex flex-col overflow-hidden group"
								style={{
									background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(200,200,200,0.18) 0%, #fff 65%)",
									border: "1.5px solid rgba(14,14,14,0.07)",
									boxShadow: "0 4px 24px rgba(14,14,14,0.05)",
								}}
							>
								{/* Giant background number */}
								<div
									className="absolute -bottom-3 -right-2 font-display font-bold select-none pointer-events-none leading-none"
									style={{ fontSize: "7rem", color: "rgba(255,106,0,0.06)", letterSpacing: "-0.04em" }}
								>
									{step.step}
								</div>

								{/* Top row: icon + step pill */}
								<div className="flex items-center justify-between mb-8">
									<div
										className="h-12 w-12 rounded-2xl flex items-center justify-center"
										style={{ background: "rgba(255,106,0,0.08)", border: "1px solid rgba(255,106,0,0.15)" }}
									>
										<step.icon className="h-5 w-5" style={{ color: "#ff6a00" }} />
									</div>
									<div
										className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold"
										style={{ background: "#ff6a00", color: "#fff" }}
									>
										{i + 1}
									</div>
								</div>

								{/* Orange accent line */}
								<div className="w-8 h-0.5 mb-5 rounded-full" style={{ background: "#ff6a00", opacity: 0.5 }} />

								{/* Title */}
								<h3 className="font-semibold text-base mb-3 text-[#0e0e0e] leading-snug">{step.title}</h3>

								{/* Description */}
								<p className="text-sm leading-relaxed relative z-10" style={{ color: "rgba(14,14,14,0.5)" }}>
									{step.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    INTEGRATIONS — BENTO GRID
			═══════════════════════════════════════════════════════ */}
			<section className="relative py-24 overflow-hidden bg-white">
				<div className="max-w-6xl mx-auto px-6">
					{/* Header */}
					<div className="text-center mb-14">
						<div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-5" style={{ background: "rgba(255,106,0,0.08)", border: "1px solid rgba(255,106,0,0.18)", color: "#ff6a00" }}>
							<Layers className="h-3 w-3" /> Integrations
						</div>
						<h2 className="font-display font-bold leading-tight mb-4 text-[#0e0e0e]" style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)" }}>
							Built-in access to the
							<br />tools creators already use
						</h2>
						<p className="text-base max-w-lg mx-auto" style={{ color: "rgba(14,14,14,0.5)" }}>
							Stock footage, GIFs, music, and platform exports — all wired directly into the editor.
						</p>
					</div>

					{/* Bento Grid */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[200px]">

						{/* Pexels — 2 cols */}
						<div
							className="col-span-2 rounded-3xl flex flex-col justify-between p-6"
							style={{
								backgroundImage: `linear-gradient(160deg, rgba(5,25,18,0.88) 0%, rgba(5,25,18,0.55) 50%, rgba(5,25,18,0.25) 100%), url(/images/pex-int.png)`,
								backgroundSize: "cover",
								backgroundPosition: "center",
								border: "1.5px solid rgba(5,160,129,0.2)",
							}}
						>
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#05A081" }}>
									<svg viewBox="0 0 32 32" className="h-5 w-5" fill="white"><path d="M13 7h6.4A5.6 5.6 0 0 1 25 12.6A5.6 5.6 0 0 1 19.4 18H16v7h-3V7zm3 8h3.4A2.6 2.6 0 0 0 22 12.6A2.6 2.6 0 0 0 19.4 10H16v5z"/></svg>
								</div>
								<div>
									<div className="font-semibold text-sm text-white">Pexels</div>
									<div className="text-[11px]" style={{ color: "rgba(255,255,255,0.65)" }}>Stock videos &amp; images</div>
								</div>
							</div>
							<div className="text-xs font-semibold" style={{ color: "#4adeaa" }}>Millions of royalty-free assets →</div>
						</div>

						{/* GIPHY — 1 col */}
						<div className="rounded-3xl overflow-hidden relative flex flex-col justify-end" style={{ backgroundImage: `url(/images/giphy-int.png)`, backgroundSize: "cover", backgroundPosition: "center", border: "1.5px solid rgba(155,89,255,0.2)" }}>
							<div className="px-4 py-3" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.0) 100%)" }}>
								<div className="font-bold text-sm text-white">GIPHY</div>
								<div className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>Stickers &amp; GIFs</div>
							</div>
						</div>

						{/* YouTube Audio — 1 col */}
						<div className="rounded-3xl overflow-hidden" style={{ backgroundImage: `url(/images/yt-audio-int.jpg)`, backgroundSize: "cover", backgroundPosition: "center", border: "1.5px solid rgba(0,180,0,0.2)" }} />

						{/* TikTok — 1 col */}
						<div className="rounded-3xl overflow-hidden relative flex flex-col justify-between p-5" style={{ backgroundImage: `linear-gradient(160deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.2) 100%), url(/images/TikTok-int.png)`, backgroundSize: "cover", backgroundPosition: "center", border: "1.5px solid rgba(255,255,255,0.08)" }}>
							<div className="flex items-center gap-2.5">
								<div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "#010101" }}>
									<svg viewBox="0 0 24 24" className="h-4 w-4" fill="white"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.75a8.19 8.19 0 0 0 4.79 1.52V6.82a4.85 4.85 0 0 1-1.02-.13z"/></svg>
								</div>
								<div>
									<div className="font-semibold text-sm text-white">TikTok</div>
									<div className="text-[10px]" style={{ color: "rgba(255,255,255,0.65)" }}>Export ready</div>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<div className="flex-shrink-0 rounded-lg flex items-center justify-center font-bold text-[10px]" style={{ width: "36px", height: "56px", background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.22)" }}>9:16</div>
								<div className="text-[11px] leading-relaxed font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>Portrait-first canvas for the For You Page</div>
							</div>
						</div>

						{/* Instagram — 1 col */}
						<div className="rounded-3xl flex flex-col justify-between overflow-hidden" style={{ position: "relative", border: "1.5px solid rgba(225,48,108,0.22)", background: "linear-gradient(145deg, #2d1b3e 0%, #1a1025 30%, #2e0d1f 60%, #1a0e28 100%)" }}>
							<div style={{ position: "absolute", top: "-20%", right: "-10%", width: "120px", height: "120px", borderRadius: "50%", background: "radial-gradient(circle, rgba(240,148,51,0.35) 0%, transparent 70%)", filter: "blur(20px)" }} />
							<div style={{ position: "absolute", bottom: "-10%", left: "-10%", width: "100px", height: "100px", borderRadius: "50%", background: "radial-gradient(circle, rgba(188,24,136,0.4) 0%, transparent 70%)", filter: "blur(18px)" }} />
							<div style={{ position: "absolute", top: "40%", left: "30%", width: "80px", height: "80px", borderRadius: "50%", background: "radial-gradient(circle, rgba(220,39,67,0.25) 0%, transparent 70%)", filter: "blur(16px)" }} />
							<div className="relative z-10 p-5 flex flex-col justify-between h-full">
								<div className="flex items-center gap-2.5">
									<div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
										<svg viewBox="0 0 24 24" className="h-4 w-4" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
									</div>
									<div>
										<div className="font-semibold text-sm text-white">Instagram</div>
										<div className="text-[10px]" style={{ color: "rgba(255,255,255,0.65)" }}>Reels &amp; Posts</div>
									</div>
								</div>
								<div className="flex items-end gap-2">
									<div className="rounded-lg flex items-center justify-center font-bold text-[10px]" style={{ width: "36px", height: "56px", background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.22)" }}>9:16</div>
									<div className="rounded-lg flex items-center justify-center font-bold text-[10px]" style={{ width: "46px", height: "46px", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.18)" }}>1:1</div>
								</div>
							</div>
						</div>

						{/* YouTube Shorts — 2 cols */}
						<div
							className="col-span-2 rounded-3xl flex flex-col justify-between p-6"
							style={{
								backgroundImage: `linear-gradient(160deg, rgba(25,5,5,0.88) 0%, rgba(25,5,5,0.55) 50%, rgba(25,5,5,0.25) 100%), url(/images/yt-shorts-int.webp)`,
								backgroundSize: "cover",
								backgroundPosition: "center",
								border: "1.5px solid rgba(255,0,0,0.18)",
							}}
						>
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#FF0000" }}>
									<svg viewBox="0 0 24 24" className="h-5 w-5" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
								</div>
								<div>
									<div className="font-semibold text-sm text-white">YouTube Shorts</div>
									<div className="text-[11px]" style={{ color: "rgba(255,255,255,0.65)" }}>Shorts format — export in one click</div>
								</div>
							</div>
							<div className="text-xs font-semibold" style={{ color: "#ff8080" }}>Optimised for YouTube Shorts algorithm →</div>
						</div>

					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    PRICING
			═══════════════════════════════════════════════════════ */}
			<section id="pricing" className="relative py-24 overflow-hidden bg-white">
				<div className="max-w-4xl mx-auto px-6">
					<div className="text-center mb-14">
						<div
							className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-5"
							style={{ background: "rgba(255,106,0,0.08)", border: "1px solid rgba(255,106,0,0.18)", color: "#ff6a00" }}
						>
							<Zap className="h-3 w-3" />
							Pricing
						</div>
						<h2
							className="font-display font-bold leading-tight mb-4 text-[#0e0e0e]"
							style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)" }}
						>
							Free during beta.
							<br />No strings attached.
						</h2>
						<p className="text-base max-w-lg mx-auto" style={{ color: "rgba(14,14,14,0.5)" }}>
							Fusion is in open beta. Every feature — every AI tool, every export — is
							completely free while we build and improve. Paid plans will be introduced
							after beta, and early users will always get a generous deal.
						</p>
					</div>

					{/* Single pricing card */}
					<div
						className="rounded-2xl p-8 relative mx-auto max-w-lg"
						style={{
							background: "#0e0e0e",
							border: "2px solid #ff6a00",
							boxShadow: "0 8px 48px rgba(255,106,0,0.18)",
						}}
					>
						<div
							className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold text-white"
							style={{ background: "#ff6a00" }}
						>
							Open Beta — Everything Free
						</div>

						<div className="flex items-baseline gap-1 mb-2 mt-2">
							<span className="font-display font-bold text-5xl text-white">$0</span>
							<span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>/month during beta</span>
						</div>
						<p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
							Full access to every feature. No credit card. No limits.
						</p>

						<Link
							href="/login"
							className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold mb-8 transition-all"
							style={{ background: "#ff6a00", color: "#fff", boxShadow: "0 4px 20px rgba(255,106,0,0.3)" }}
						>
							Start Editing Free
							<ArrowRight className="h-4 w-4" />
						</Link>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{[
								"AI Auto-Captions (50+ languages)",
								"Smart Scene Detection",
								"AI Image Generator",
								"AI Voice Over (28 languages)",
								"Silence & Highlight Removal",
								"Background Removal",
								"40+ Transitions",
								"30+ Text Animations",
								"Audio Visualizers",
								"Pexels Stock Library",
								"GIPHY Stickers & GIFs",
								"Unlimited MP4 Exports",
								"Auto-save to cloud",
								"All canvas formats (9:16, 16:9, 1:1)",
							].map((feature, j) => (
								<div key={j} className="flex items-start gap-2.5">
									<div
										className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
										style={{ background: "rgba(255,106,0,0.2)" }}
									>
										<Check className="h-3 w-3" style={{ color: "#ff6a00" }} />
									</div>
									<span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{feature}</span>
								</div>
							))}
						</div>

						<div
							className="mt-6 pt-5 border-t text-center text-xs"
							style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
						>
							Paid tiers launching post-beta. Early users get priority pricing.
						</div>
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    FAQ
			═══════════════════════════════════════════════════════ */}
			<section className="py-24 bg-white" id="resources">
				<div className="max-w-4xl mx-auto px-6">
					<div className="text-center mb-14">
						<div
							className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-5"
							style={{ background: "rgba(255,106,0,0.08)", border: "1px solid rgba(255,106,0,0.18)", color: "#ff6a00" }}
						>
							<PlusCircle className="h-3 w-3" />
							FAQ
						</div>
						<h2
							className="font-display font-bold leading-tight text-[#0e0e0e]"
							style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)" }}
						>
							Frequently asked questions
						</h2>
					</div>

					<div className="space-y-3">
						{FAQ_ITEMS.map((faq, i) => (
							<div
								key={i}
								className="rounded-2xl overflow-hidden transition-all"
								style={{
									background: "#fff",
									border: openFaq === i ? "1.5px solid rgba(255,106,0,0.3)" : "1px solid rgba(14,14,14,0.07)",
									boxShadow: openFaq === i ? "0 4px 20px rgba(255,106,0,0.08)" : "0 1px 6px rgba(14,14,14,0.03)",
								}}
							>
								<button
									className="w-full flex items-center justify-between px-6 py-5 text-left"
									onClick={() => setOpenFaq(openFaq === i ? null : i)}
								>
									<span className="font-semibold text-base text-[#0e0e0e] pr-4">{faq.question}</span>
									<div
										className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
										style={{ background: openFaq === i ? "#ff6a00" : "rgba(14,14,14,0.06)" }}
									>
										<ChevronDown
											className="h-4 w-4 transition-transform"
											style={{
												color: openFaq === i ? "#fff" : "rgba(14,14,14,0.5)",
												transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)",
											}}
										/>
									</div>
								</button>
								{openFaq === i && (
									<div className="px-6 pb-6 text-sm leading-relaxed" style={{ color: "rgba(14,14,14,0.55)" }}>
										{faq.answer}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    FINAL CTA
			═══════════════════════════════════════════════════════ */}
			<section
				className="relative py-20 overflow-hidden"
				style={{ background: "#ff6a00" }}
			>
				<div
					className="absolute pointer-events-none"
					style={{ top: "-60%", right: "-5%", width: "400px", height: "400px", borderRadius: "50%", border: "60px solid rgba(255,255,255,0.08)" }}
				/>
				<div
					className="absolute pointer-events-none"
					style={{ bottom: "-60%", left: "-5%", width: "300px", height: "300px", borderRadius: "50%", border: "50px solid rgba(255,255,255,0.06)" }}
				/>
				<div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
					<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
						<span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
						Open Beta — Free Access Now
					</div>
					<h2
						className="font-display font-bold text-white mb-5 leading-tight"
						style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
					>
						The AI video editor
						<br />you&apos;ve been waiting for.
					</h2>
					<p className="text-white/70 text-lg mb-8 max-w-lg mx-auto">
						Join thousands of creators already using Fusion in beta.
						No credit card. No limits. Start editing in 30 seconds.
					</p>
					<Link
						href="/login"
						className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-base transition-all"
						style={{ background: "#fff", color: "#ff6a00", boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }}
					>
						Start Editing Free
						<ArrowRight className="h-5 w-5" />
					</Link>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    FOOTER
			═══════════════════════════════════════════════════════ */}
			<footer className="pt-16 pb-10" style={{ background: "#0e0e0e" }}>
				<div className="max-w-7xl mx-auto px-6">
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 mb-14">
						<div className="col-span-2 md:col-span-1">
							<Link href="/" className="flex items-center gap-2.5 mb-4">
								<Image src="/FusionAI.svg" alt="Fusion" width={28} height={28} />
								<span className="font-bold text-sm text-white">Fusion</span>
							</Link>
							<p className="text-sm leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
								The AI-powered video editor for modern creators. Built for portrait-first content.
							</p>
							<span
								className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold"
								style={{ background: "rgba(255,106,0,0.15)", color: "#ff6a00", border: "1px solid rgba(255,106,0,0.2)" }}
							>
								<span className="h-1.5 w-1.5 rounded-full bg-[#ff6a00] animate-pulse" />
								Open Beta
							</span>
						</div>

						{Object.entries(FOOTER_LINKS).map(([section, links]) => (
							<div key={section}>
								<div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
									{section}
								</div>
								<div className="flex flex-col gap-2.5">
									{links.map((link) => (
										<Link
											key={link}
											href="#"
											className="text-sm transition-colors"
											style={{ color: "rgba(255,255,255,0.4)" }}
											onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
											onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
										>
											{link}
										</Link>
									))}
								</div>
							</div>
						))}
					</div>

					<div
						className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8"
						style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
					>
						<span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
							© 2025 Fusion. All rights reserved. Currently in open beta.
						</span>
						<div className="flex items-center gap-4">
							{["Privacy", "Terms", "Cookies"].map((l) => (
								<Link key={l} href="#" className="text-xs transition-colors" style={{ color: "rgba(255,255,255,0.25)" }}
									onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
									onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
								>
									{l}
								</Link>
							))}
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
