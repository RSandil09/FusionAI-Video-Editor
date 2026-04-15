"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { useState } from "react";
import {
	Star,
	Menu,
	X,
	ArrowRight,
	Play,
	Film,
	Sparkles,
	Share2,
	ChevronRight,
	TrendingUp,
	Layers,
	Zap,
	Clock,
	Check,
	ChevronDown,
	Mail,
	Wand2,
	MousePointerClick,
	UploadCloud,
	BadgeCheck,
	Globe,
	LayoutDashboard,
	Scissors,
	Captions,
	Repeat2,
	LineChart,
	PlusCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// DATA CONSTANTS
// ─────────────────────────────────────────────────────────────

const NAV_LINKS = [
	{
		label: "About Fusion",
		href: "#about",
		dropdown: [
			{ label: "Our Story", href: "#" },
			{ label: "Team", href: "#" },
			{ label: "Careers", href: "#" },
		],
	},
	{
		label: "Features",
		href: "#features",
		dropdown: [
			{ label: "AI Captions", href: "#" },
			{ label: "Auto-Resize", href: "#" },
			{ label: "Multi-Export", href: "#" },
		],
	},
	{
		label: "Resources",
		href: "#resources",
		dropdown: [
			{ label: "Blog", href: "#" },
			{ label: "Tutorials", href: "#" },
			{ label: "Changelog", href: "#" },
		],
	},
	{ label: "Pricing", href: "#pricing", dropdown: [] },
];

const HERO_STATS = [
	{ value: "10K+", label: "Active Creators" },
	{ value: "2.4M", label: "Videos Exported" },
	{ value: "99.2%", label: "Caption Accuracy" },
	{ value: "12+", label: "Platform Integrations" },
];

const FEATURES = [
	{
		icon: Scissors,
		title: "AI Timeline Editor",
		description:
			"Intelligent auto-cut, scene detection, and B-roll suggestions powered by our proprietary AI model trained on millions of creator videos.",
		badge: "Core",
		color: "#ff6a00",
	},
	{
		icon: Captions,
		title: "Auto AI Captions",
		description:
			"99.2% accurate transcription in 50+ languages. Styled, animated captions that match your brand — generated in seconds, not hours.",
		badge: "Popular",
		color: "#ff6a00",
	},
	{
		icon: Repeat2,
		title: "Smart Auto-Resize",
		description:
			"One portrait master clip, instantly reformatted for YouTube Shorts, TikTok, Instagram Reels, and more with intelligent reframing.",
		badge: "Exclusive",
		color: "#ff6a00",
	},
	{
		icon: UploadCloud,
		title: "One-Click Publishing",
		description:
			"Connect your YouTube, TikTok, and Instagram accounts and publish directly from the editor — complete with metadata, thumbnails, and scheduling.",
		badge: "New",
		color: "#ff6a00",
	},
	{
		icon: LineChart,
		title: "Creator Analytics",
		description:
			"Track views, engagement, and growth across all platforms from a single unified dashboard. Know what content works and do more of it.",
		badge: "Pro",
		color: "#ff6a00",
	},
	{
		icon: Wand2,
		title: "AI B-Roll Generator",
		description:
			"Automatically source and insert relevant B-roll footage based on your script. Powered by a library of 50M+ royalty-free clips.",
		badge: "Beta",
		color: "#ff6a00",
	},
];

const HOW_IT_WORKS = [
	{
		step: "01",
		icon: UploadCloud,
		title: "Upload your footage",
		description:
			"Drag and drop your portrait video clips directly into Fusion. We support all major formats — MP4, MOV, WebM, and more. Cloud storage means your files are always accessible.",
	},
	{
		step: "02",
		icon: Wand2,
		title: "AI does the heavy lifting",
		description:
			"Our AI engine automatically transcribes, generates captions, detects scenes, suggests cuts, and prepares platform-specific versions — all without you lifting a finger.",
	},
	{
		step: "03",
		icon: MousePointerClick,
		title: "Review and refine",
		description:
			"Jump into the timeline editor to fine-tune. Adjust captions, trim clips, add music, overlay text, apply filters, and brand your content exactly how you want it.",
	},
	{
		step: "04",
		icon: Globe,
		title: "Publish everywhere",
		description:
			"Hit publish once and Fusion pushes your video to every connected platform simultaneously — with the right format, aspect ratio, and metadata for each one.",
	},
];

const TESTIMONIALS = [
	{
		quote:
			"Fusion saved me weeks of editing time every month. The AI captions are incredibly accurate and the auto-resize is a total game changer for my workflow.",
		author: "Sarah Chen",
		role: "Content Creator",
		platform: "2M YouTube subscribers",
		initial: "S",
		stars: 5,
	},
	{
		quote:
			"Finally a video editor built specifically for portrait content. My TikTok growth skyrocketed after switching to Fusion — the AI just gets what works.",
		author: "Marcus Williams",
		role: "TikTok Creator",
		platform: "5M TikTok followers",
		initial: "M",
		stars: 5,
	},
	{
		quote:
			"The one-click publish to all platforms feature alone saves me 3+ hours per week. I can't imagine going back to my old editing workflow.",
		author: "Priya Patel",
		role: "Social Media Manager",
		platform: "Managing 8 brand accounts",
		initial: "P",
		stars: 5,
	},
	{
		quote:
			"The B-roll AI is genuinely magical. It finds clips that match exactly what I'm talking about. My production quality went from amateur to professional overnight.",
		author: "Jake Morrison",
		role: "Creator & Educator",
		platform: "YouTube & Instagram",
		initial: "J",
		stars: 5,
	},
];

const PRICING_TIERS = [
	{
		name: "Starter",
		price: "Free",
		period: "",
		description: "Perfect for creators just getting started with AI editing.",
		features: [
			"5 exports per month",
			"AI captions (basic)",
			"720p export quality",
			"2 platform integrations",
			"Community support",
			"1GB cloud storage",
		],
		cta: "Start for free",
		highlighted: false,
	},
	{
		name: "Creator",
		price: "$29",
		period: "/month",
		description:
			"Everything you need to grow your audience across all platforms.",
		features: [
			"Unlimited exports",
			"AI captions (99.2% accuracy)",
			"4K export quality",
			"All platform integrations",
			"Auto-resize for every platform",
			"Priority support",
			"50GB cloud storage",
			"AI B-Roll generator",
			"Creator Analytics dashboard",
		],
		cta: "Start free trial",
		highlighted: true,
	},
	{
		name: "Studio",
		price: "$79",
		period: "/month",
		description: "For agencies and power creators managing multiple channels.",
		features: [
			"Everything in Creator",
			"5 team seats",
			"Custom brand presets",
			"White-label exports",
			"API access",
			"Dedicated account manager",
			"500GB cloud storage",
			"Custom AI model training",
			"SLA 99.9% uptime",
		],
		cta: "Contact sales",
		highlighted: false,
	},
];

const PLATFORM_ROWS = [
	[
		{ name: "YouTube", color: "#FF0000", letter: "Y" },
		{ name: "TikTok", color: "#1a1a1a", letter: "T" },
		{ name: "Instagram", color: "#E1306C", letter: "I" },
		{ name: "Notion", color: "#1f1f1f", letter: "N" },
		{ name: "Slack", color: "#4A154B", letter: "S" },
	],
	[
		{ name: "Figma", color: "#F24E1E", letter: "F" },
		{ name: "Evernote", color: "#00A82D", letter: "E" },
		{ name: "Discord", color: "#5865F2", letter: "D" },
		{ name: "Twitter", color: "#1DA1F2", letter: "X" },
		{ name: "Notion", color: "#1f1f1f", letter: "N" },
	],
];

const FAQ_ITEMS = [
	{
		question: "What video formats does Fusion support?",
		answer:
			"Fusion supports all major video formats including MP4, MOV, WebM, AVI, MKV, and more. We also support importing directly from your iPhone camera roll, Google Drive, and Dropbox. Maximum file size is 10GB per upload on the Creator plan.",
	},
	{
		question: "How accurate is the AI caption generation?",
		answer:
			"Our AI caption engine achieves 99.2% accuracy on clear audio in 50+ languages. For technical jargon, accents, or noisy environments, accuracy may vary — but we provide a full caption editor so you can review and correct anything in seconds. Most creators find they need to fix fewer than 3 words per video.",
	},
	{
		question: "Can I cancel my subscription at any time?",
		answer:
			"Yes, absolutely. You can cancel your subscription at any time from your account settings. Your plan remains active until the end of your current billing period, after which you'll be moved to the free Starter plan. We never charge cancellation fees.",
	},
	{
		question: "Do I own the content I create with Fusion?",
		answer:
			"100% yes. All content you create using Fusion is entirely yours. We claim no rights to your videos, captions, or any other content you produce. We also don't use your content to train our AI models without your explicit consent.",
	},
	{
		question: "Which platforms can I publish to directly?",
		answer:
			"Currently Fusion supports direct publishing to YouTube, TikTok, Instagram Reels, and Facebook Reels. We're actively building integrations for Snapchat Spotlight, LinkedIn Video, Pinterest Idea Pins, and Twitter/X Video. Check our roadmap for the latest.",
	},
	{
		question: "Is there a free trial for the Creator plan?",
		answer:
			"Yes! We offer a 14-day free trial of the Creator plan — no credit card required. You'll get full access to all features including unlimited exports, AI captions, auto-resize, and direct publishing. After 14 days, you can choose to subscribe or drop back to the free Starter plan.",
	},
];

const FOOTER_LINKS = {
	Product: [
		"Features",
		"Pricing",
		"Changelog",
		"Roadmap",
		"API",
		"Status",
	],
	Company: [
		"About",
		"Blog",
		"Careers",
		"Press",
		"Partners",
		"Contact",
	],
	Resources: [
		"Documentation",
		"Tutorials",
		"Community",
		"Templates",
		"Affiliate",
		"Brand Assets",
	],
	Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"],
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export default function LandingPage() {
	const { user } = useAuth();
	const [menuOpen, setMenuOpen] = useState(false);
	const [openFaq, setOpenFaq] = useState<number | null>(null);
	const [email, setEmail] = useState("");
	const [activeNav, setActiveNav] = useState<string | null>(null);

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
				<div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
					{/* Logo */}
					<div className="flex items-center gap-10">
						<Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
							<Image src="/FusionAI.svg" alt="Fusion" width={30} height={30} />
							<span className="font-heading font-bold text-[15px] tracking-tight hidden sm:block text-[#0e0e0e]">
								Fusion
							</span>
						</Link>

						{/* Desktop nav */}
						<div className="hidden lg:flex items-center gap-1">
							{NAV_LINKS.map((l) => (
								<div
									key={l.label}
									className="relative"
									onMouseEnter={() => setActiveNav(l.label)}
									onMouseLeave={() => setActiveNav(null)}
								>
									<Link
										href={l.href}
										className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors"
										style={{
											color:
												activeNav === l.label
													? "#0e0e0e"
													: "rgba(14,14,14,0.55)",
											background:
												activeNav === l.label
													? "rgba(14,14,14,0.05)"
													: "transparent",
										}}
									>
										{l.label}
										{l.dropdown.length > 0 && (
											<ChevronDown className="h-3.5 w-3.5 opacity-50" />
										)}
									</Link>
									{/* Dropdown */}
									{l.dropdown.length > 0 && activeNav === l.label && (
										<div
											className="absolute top-full left-0 mt-1 w-44 rounded-xl py-1.5 shadow-xl"
											style={{
												background: "#fff",
												border: "1px solid rgba(14,14,14,0.08)",
												boxShadow:
													"0 8px 32px rgba(14,14,14,0.10)",
											}}
										>
											{l.dropdown.map((d) => (
												<Link
													key={d.label}
													href={d.href}
													className="flex items-center px-4 py-2 text-sm transition-colors"
													style={{ color: "rgba(14,14,14,0.65)" }}
													onMouseEnter={(e) =>
														(e.currentTarget.style.color = "#ff6a00")
													}
													onMouseLeave={(e) =>
														(e.currentTarget.style.color =
															"rgba(14,14,14,0.65)")
													}
												>
													{d.label}
												</Link>
											))}
										</div>
									)}
								</div>
							))}
						</div>
					</div>

					{/* CTA buttons */}
					<div className="hidden md:flex items-center gap-3">
						{user ? (
							<Link
								href="/dashboard"
								className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
								style={{ background: "#ff6a00", color: "#fff" }}
							>
								<LayoutDashboard className="h-3.5 w-3.5" />
								Go to Dashboard
							</Link>
						) : (
							<>
								<Link
									href="/login"
									className="text-sm px-3 py-2 rounded-lg transition-colors"
									style={{ color: "rgba(14,14,14,0.55)" }}
									onMouseEnter={(e) =>
										(e.currentTarget.style.color = "#0e0e0e")
									}
									onMouseLeave={(e) =>
										(e.currentTarget.style.color = "rgba(14,14,14,0.55)")
									}
								>
									Sign in
								</Link>
								<Link
									href="/login"
									className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
									style={{
										background: "#ff6a00",
										color: "#fff",
										boxShadow: "0 2px 12px rgba(255,106,0,0.25)",
									}}
								>
									Get Demo
								</Link>
								<Link
									href="/login"
									className="px-4 py-2 rounded-lg text-sm transition-colors"
									style={{
										border: "1px solid rgba(14,14,14,0.12)",
										color: "rgba(14,14,14,0.65)",
									}}
								>
									Contact Sales
								</Link>
							</>
						)}
					</div>

					{/* Mobile hamburger */}
					<button
						className="md:hidden p-2 rounded-lg"
						onClick={() => setMenuOpen(!menuOpen)}
						style={{ color: "rgba(14,14,14,0.6)" }}
					>
						{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</button>
				</div>

				{/* Mobile menu */}
				{menuOpen && (
					<div
						className="md:hidden px-8 py-5 flex flex-col gap-3"
						style={{
							background: "#fff",
							borderTop: "1px solid rgba(14,14,14,0.07)",
						}}
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
								className="px-4 py-2.5 rounded-lg text-sm font-medium text-center"
								style={{ background: "#ff6a00", color: "#fff" }}
							>
								Get Demo — it&apos;s free
							</Link>
							<Link
								href="/login"
								className="px-4 py-2.5 rounded-lg text-sm text-center"
								style={{
									border: "1px solid rgba(14,14,14,0.10)",
									color: "rgba(14,14,14,0.6)",
								}}
							>
								Sign in
							</Link>
						</div>
					</div>
				)}
			</nav>

			{/* ═══════════════════════════════════════════════════════
			    HERO SECTION
			═══════════════════════════════════════════════════════ */}
			<section className="relative min-h-screen flex flex-col justify-center pt-16 overflow-hidden bg-white">
				{/* Orange glow — top right */}
				<div
					className="absolute pointer-events-none"
					style={{
						top: "-80px",
						right: "-80px",
						width: "700px",
						height: "700px",
						background:
							"radial-gradient(ellipse, rgba(255,106,0,0.14) 0%, rgba(255,106,0,0.04) 45%, transparent 70%)",
						borderRadius: "50%",
					}}
				/>
				{/* Soft glow — bottom left */}
				<div
					className="absolute pointer-events-none"
					style={{
						bottom: "-100px",
						left: "20%",
						width: "500px",
						height: "400px",
						background:
							"radial-gradient(ellipse, rgba(255,106,0,0.06) 0%, transparent 65%)",
						borderRadius: "50%",
					}}
				/>

				<div className="max-w-7xl mx-auto px-8 w-full py-24">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-20 items-center">

						{/* ── Left copy ── */}
						<div>
							{/* Stars */}
							<div className="flex items-center gap-2.5 mb-7">
								<div className="flex gap-0.5">
									{[...Array(5)].map((_, i) => (
										<Star
											key={i}
											className="h-4 w-4 fill-yellow-400 text-yellow-400"
										/>
									))}
								</div>
								<span className="text-[13px] text-[#0e0e0e]/45">
									Based on 10,000+ reviews
								</span>
							</div>

							{/* Headline */}
							<h1
								className="font-heading font-bold leading-[1.05] mb-6 tracking-tight text-[#0e0e0e]"
								style={{ fontSize: "clamp(2.6rem, 4.5vw, 4rem)" }}
							>
								Seamless solution
								<br />
								with our{" "}
								<span
									className="relative inline-block"
									style={{ color: "#ff6a00" }}
								>
									magic!
									{/* Underline decoration */}
									<svg
										className="absolute -bottom-1 left-0 w-full"
										viewBox="0 0 200 8"
										fill="none"
										aria-hidden
									>
										<path
											d="M 2 6 Q 50 2 100 5 Q 150 8 198 3"
											stroke="#ff6a00"
											strokeWidth="2.5"
											strokeLinecap="round"
											opacity="0.4"
										/>
									</svg>
								</span>
							</h1>

							<p
								className="text-lg leading-relaxed mb-9"
								style={{ color: "rgba(14,14,14,0.55)", maxWidth: "430px" }}
							>
								Fusion is the AI-powered video editor for portrait creators —
								automate captions, resize for any platform, and publish
								everywhere in one click.
							</p>

							{/* CTAs */}
							<div className="flex flex-wrap gap-3 mb-10">
								<Link
									href="/login"
									className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
									style={{
										background: "#ff6a00",
										color: "#fff",
										boxShadow: "0 4px 24px rgba(255,106,0,0.30)",
									}}
								>
									Get a Free Demo
									<ArrowRight className="h-4 w-4" />
								</Link>
								<Link
									href="#features"
									className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm transition-all"
									style={{
										border: "1.5px solid rgba(14,14,14,0.12)",
										color: "rgba(14,14,14,0.65)",
									}}
								>
									<Play className="h-3.5 w-3.5" />
									Start work efficiently
								</Link>
							</div>

							{/* Trust badges */}
							<div className="flex items-center gap-6 flex-wrap">
								<span
									className="text-[11px] uppercase tracking-widest"
									style={{ color: "rgba(14,14,14,0.3)" }}
								>
									Trusted by creators at
								</span>
								{["logolpsum™", "logolpsum™", "logolpsum™"].map((b, i) => (
									<span
										key={i}
										className="font-heading font-semibold text-sm"
										style={{ color: "rgba(14,14,14,0.22)" }}
									>
										{b}
									</span>
								))}
							</div>
						</div>

						{/* ── Right: floating UI composite ── */}
						<div className="relative h-[520px] hidden lg:block">

							{/* Main editor dashboard card */}
							<div
								className="absolute"
								style={{
									top: "10px",
									right: "0px",
									width: "320px",
									borderRadius: "20px",
									background: "#fff",
									border: "1px solid rgba(14,14,14,0.08)",
									padding: "20px",
									boxShadow: "0 20px 64px rgba(14,14,14,0.10)",
								}}
							>
								<div
									className="flex items-center justify-between mb-4"
									style={{
										borderBottom: "1px solid rgba(14,14,14,0.06)",
										paddingBottom: "12px",
									}}
								>
									<div className="flex items-center gap-2">
										<Image src="/FusionAI.svg" alt="" width={16} height={16} />
										<span
											className="text-[11px] font-heading font-semibold"
											style={{ color: "rgba(14,14,14,0.5)" }}
										>
											fusion editor
										</span>
									</div>
									<div className="flex gap-1.5">
										<div className="h-2.5 w-2.5 rounded-full bg-[#ff6a00]/70" />
										<div className="h-2.5 w-2.5 rounded-full bg-black/10" />
										<div className="h-2.5 w-2.5 rounded-full bg-black/10" />
									</div>
								</div>

								{/* Chart area */}
								<div
									className="mb-4 rounded-xl p-3"
									style={{ background: "#fafafa", border: "1px solid rgba(14,14,14,0.05)" }}
								>
									<div className="flex items-center justify-between mb-1">
										<span className="text-[10px]" style={{ color: "rgba(14,14,14,0.4)" }}>
											Total views this week
										</span>
										<span className="text-[10px] font-medium" style={{ color: "#ff6a00" }}>
											+24%
										</span>
									</div>
									<div
										className="font-heading font-bold text-[22px] mb-3"
										style={{ color: "#0e0e0e" }}
									>
										2,481,290
									</div>
									<svg viewBox="0 0 270 55" className="w-full" aria-hidden>
										<defs>
											<linearGradient id="heroChartGrad" x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stopColor="#ff6a00" stopOpacity="0.2" />
												<stop offset="100%" stopColor="#ff6a00" stopOpacity="0" />
											</linearGradient>
										</defs>
										<polyline
											points="0,48 28,36 55,42 85,18 110,30 140,8 170,22 205,12 240,6 270,3"
											fill="none"
											stroke="#ff6a00"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
										<polygon
											points="0,48 28,36 55,42 85,18 110,30 140,8 170,22 205,12 240,6 270,3 270,55 0,55"
											fill="url(#heroChartGrad)"
										/>
									</svg>
								</div>

								{/* Quick publish rows */}
								<div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(14,14,14,0.3)" }}>
									Quick Publish
								</div>
								{[
									{ name: "YouTube", color: "#FF0000", status: "Published" },
									{ name: "TikTok", color: "#1a1a1a", status: "Scheduled" },
									{ name: "Instagram", color: "#E1306C", status: "Uploading" },
								].map((p) => (
									<div
										key={p.name}
										className="flex items-center justify-between mb-1.5"
										style={{
											background: "rgba(14,14,14,0.025)",
											borderRadius: "8px",
											padding: "7px 10px",
										}}
									>
										<div className="flex items-center gap-2">
											<div
												className="h-5 w-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white"
												style={{ background: p.color }}
											>
												{p.name[0]}
											</div>
											<span className="text-xs" style={{ color: "rgba(14,14,14,0.7)" }}>
												{p.name}
											</span>
										</div>
										<span
											className="text-[10px] font-medium"
											style={{
												color:
													p.status === "Published"
														? "#16a34a"
														: p.status === "Uploading"
														? "#ff6a00"
														: "rgba(14,14,14,0.4)",
											}}
										>
											{p.status}
										</span>
									</div>
								))}
							</div>

							{/* Caption accuracy card — top left */}
							<div
								className="absolute"
								style={{
									top: "30px",
									left: "0px",
									width: "196px",
									borderRadius: "16px",
									background: "#fff",
									border: "1px solid rgba(14,14,14,0.08)",
									padding: "16px",
									boxShadow: "0 12px 40px rgba(14,14,14,0.09)",
								}}
							>
								<div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(14,14,14,0.35)" }}>
									Caption accuracy
								</div>
								<div className="font-heading font-bold text-3xl mb-0.5" style={{ color: "#0e0e0e" }}>
									99.2%
								</div>
								<div className="text-[11px] mb-3" style={{ color: "rgba(14,14,14,0.4)" }}>
									AI transcription
								</div>
								<div className="flex gap-1.5">
									{[
										{ label: "Auto", active: true },
										{ label: "Manual" },
										{ label: "Edit" },
									].map((b) => (
										<div
											key={b.label}
											className="flex-1 h-7 rounded-md flex items-center justify-center text-[9px] font-semibold"
											style={{
												background: b.active ? "#ff6a00" : "rgba(14,14,14,0.05)",
												color: b.active ? "#fff" : "rgba(14,14,14,0.45)",
											}}
										>
											{b.label}
										</div>
									))}
								</div>
							</div>

							{/* AI captions floating badge */}
							<div
								className="absolute flex items-center gap-3"
								style={{
									bottom: "140px",
									left: "10px",
									background: "#fff",
									border: "1px solid rgba(14,14,14,0.08)",
									borderRadius: "14px",
									padding: "11px 15px",
									boxShadow: "0 8px 28px rgba(14,14,14,0.08)",
								}}
							>
								<div
									className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
									style={{ background: "#ff6a00" }}
								>
									<Sparkles className="h-4 w-4 text-white" />
								</div>
								<div>
									<div className="text-sm font-semibold" style={{ color: "#0e0e0e" }}>
										AI Captions
									</div>
									<div className="text-[11px]" style={{ color: "rgba(14,14,14,0.4)" }}>
										Generated in 3 sec
									</div>
								</div>
							</div>

							{/* Creator count badge */}
							<div
								className="absolute flex items-center gap-3"
								style={{
									bottom: "90px",
									right: "10px",
									background: "#fff",
									border: "1px solid rgba(14,14,14,0.08)",
									borderRadius: "14px",
									padding: "10px 14px",
									boxShadow: "0 8px 28px rgba(14,14,14,0.08)",
								}}
							>
								<div className="flex">
									{["S", "M", "J", "P"].map((l, i) => (
										<div
											key={i}
											className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
											style={{
												background: "#ff6a00",
												opacity: 0.55 + i * 0.15,
												marginLeft: i > 0 ? "-6px" : 0,
												border: "2px solid #fff",
												zIndex: 4 - i,
											}}
										>
											{l}
										</div>
									))}
								</div>
								<span className="text-xs font-medium" style={{ color: "rgba(14,14,14,0.6)" }}>
									+10k creators
								</span>
							</div>

							{/* Trending stat */}
							<div
								className="absolute flex items-center gap-2.5"
								style={{
									bottom: "200px",
									right: "0px",
									background: "#fff",
									border: "1px solid rgba(14,14,14,0.08)",
									borderRadius: "12px",
									padding: "9px 13px",
									boxShadow: "0 6px 20px rgba(14,14,14,0.07)",
								}}
							>
								<div
									className="h-8 w-8 rounded-lg flex items-center justify-center"
									style={{ background: "rgba(22,163,74,0.1)" }}
								>
									<TrendingUp className="h-4 w-4" style={{ color: "#16a34a" }} />
								</div>
								<div>
									<div className="text-sm font-semibold" style={{ color: "#0e0e0e" }}>
										+312% views
									</div>
									<div className="text-[10px]" style={{ color: "rgba(14,14,14,0.4)" }}>
										This month
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    STATS BAR
			═══════════════════════════════════════════════════════ */}
			<section
				style={{
					background: "#ff6a00",
				}}
			>
				<div className="max-w-7xl mx-auto px-8">
					<div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/20">
						{HERO_STATS.map((s, i) => (
							<div key={i} className="flex flex-col items-center justify-center py-7 px-6">
								<div className="font-heading font-bold text-3xl text-white mb-1">
									{s.value}
								</div>
								<div className="text-sm text-white/75">{s.label}</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    FEATURES GRID
			═══════════════════════════════════════════════════════ */}
			<section
				id="features"
				className="relative py-24 overflow-hidden"
				style={{ background: "#fafafa" }}
			>
				<div className="max-w-7xl mx-auto px-8">
					{/* Section header */}
					<div className="text-center mb-16">
						<div
							className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-5"
							style={{
								background: "rgba(255,106,0,0.08)",
								border: "1px solid rgba(255,106,0,0.18)",
								color: "#ff6a00",
							}}
						>
							<Zap className="h-3 w-3" />
							Powerful Features
						</div>
						<h2
							className="font-heading font-bold leading-tight mb-4 text-[#0e0e0e]"
							style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)" }}
						>
							Choose from over 10+
							<br />
							<span style={{ color: "rgba(14,14,14,0.4)" }}>
								<em className="not-italic">cutting&#8209;edge</em>
							</span>{" "}
							products
						</h2>
						<p className="text-base max-w-xl mx-auto" style={{ color: "rgba(14,14,14,0.5)" }}>
							Every tool you need to create, edit, caption, resize, and publish
							portrait-first video content — all in one place.
						</p>
					</div>

					{/* 4-card visual row — Figma-style */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
						{/* Card 1 — White with line chart */}
						<div
							className="rounded-2xl p-5"
							style={{
								background: "#fff",
								border: "1px solid rgba(14,14,14,0.07)",
								boxShadow: "0 2px 12px rgba(14,14,14,0.05)",
								minHeight: "280px",
							}}
						>
							<div className="h-36 mb-4 flex items-end">
								<svg viewBox="0 0 200 90" className="w-full" aria-hidden>
									<defs>
										<linearGradient id="card1Grad" x1="0" y1="0" x2="0" y2="1">
											<stop offset="0%" stopColor="#ff6a00" stopOpacity="0.12" />
											<stop offset="100%" stopColor="#ff6a00" stopOpacity="0" />
										</linearGradient>
									</defs>
									{/* Grid lines */}
									{[22, 44, 66, 88].map((y) => (
										<line
											key={y}
											x1="0"
											y1={y}
											x2="200"
											y2={y}
											stroke="rgba(14,14,14,0.05)"
											strokeWidth="1"
										/>
									))}
									<polyline
										points="0,70 25,52 50,60 75,28 100,44 130,18 160,34 185,22 200,16"
										fill="none"
										stroke="#ff6a00"
										strokeWidth="2.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<polygon
										points="0,70 25,52 50,60 75,28 100,44 130,18 160,34 185,22 200,16 200,90 0,90"
										fill="url(#card1Grad)"
									/>
									{/* Dots */}
									{[[0,70],[75,28],[130,18],[200,16]].map(([x,y],i) => (
										<circle key={i} cx={x} cy={y} r="3.5" fill="#ff6a00" />
									))}
								</svg>
							</div>
							<div className="font-heading font-semibold text-sm text-[#0e0e0e]">
								AI Timeline Editor
							</div>
							<div className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(14,14,14,0.45)" }}>
								Smart auto-cut and scene detection
							</div>
						</div>

						{/* Card 2 — Dark with gauge */}
						<div
							className="rounded-2xl p-5"
							style={{
								background: "#0e0e0e",
								minHeight: "280px",
							}}
						>
							<div className="h-36 mb-4">
								<div className="font-heading font-bold text-2xl text-white mb-0.5">
									$5,476
								</div>
								<div className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
									Earnings this week
								</div>
								<div className="flex justify-center">
									<svg viewBox="0 0 130 72" style={{ width: "130px" }} aria-hidden>
										<path d="M 12 68 A 52 52 0 0 1 118 68" fill="none" stroke="#1e1e1e" strokeWidth="14" strokeLinecap="round" />
										<path d="M 12 68 A 52 52 0 0 1 118 68" fill="none" stroke="#ff6a00" strokeWidth="14" strokeLinecap="round" strokeDasharray="140" strokeDashoffset="50" />
										{/* Lighter secondary arc */}
										<path d="M 12 68 A 52 52 0 0 1 118 68" fill="none" stroke="rgba(255,106,0,0.2)" strokeWidth="14" strokeLinecap="round" strokeDasharray="140" strokeDashoffset="-90" />
										<text x="65" y="64" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="10" fontFamily="sans-serif">72%</text>
									</svg>
								</div>
							</div>
							<div className="font-heading font-semibold text-sm text-white">
								Creator Analytics
							</div>
							<div className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
								Track performance across platforms
							</div>
						</div>

						{/* Card 3 — Light with portrait/avatar elements */}
						<div
							className="rounded-2xl p-5 flex flex-col"
							style={{
								background: "#fff",
								border: "1px solid rgba(14,14,14,0.07)",
								boxShadow: "0 2px 12px rgba(14,14,14,0.05)",
								minHeight: "280px",
							}}
						>
							<div className="flex-1 h-36 flex items-center justify-center mb-4">
								<div className="relative">
									{/* Portrait frame */}
									<div
										className="h-28 w-16 rounded-2xl flex items-center justify-center relative overflow-hidden"
										style={{
											border: "2px solid rgba(255,106,0,0.35)",
											background: "linear-gradient(160deg, rgba(255,106,0,0.08) 0%, rgba(255,106,0,0.03) 100%)",
										}}
									>
										<Film className="h-7 w-7" style={{ color: "#ff6a00" }} />
										{/* Caption bar */}
										<div
											className="absolute bottom-2 left-1 right-1 h-4 rounded flex items-center justify-center"
											style={{ background: "rgba(14,14,14,0.7)" }}
										>
											<div className="text-[6px] text-white/70">Caption text here...</div>
										</div>
									</div>
									{/* Spark badge */}
									<div
										className="absolute -top-2.5 -right-2.5 h-7 w-7 rounded-full flex items-center justify-center"
										style={{
											background: "#ff6a00",
											boxShadow: "0 3px 12px rgba(255,106,0,0.4)",
										}}
									>
										<Sparkles className="h-3 w-3 text-white" />
									</div>
									{/* Check badge */}
									<div
										className="absolute -bottom-2.5 -left-2.5 h-7 w-7 rounded-full flex items-center justify-center"
										style={{
											background: "#fff",
											border: "1px solid rgba(14,14,14,0.08)",
											boxShadow: "0 2px 8px rgba(14,14,14,0.06)",
										}}
									>
										<Check className="h-3 w-3" style={{ color: "#16a34a" }} />
									</div>
								</div>
							</div>
							<div className="font-heading font-semibold text-sm text-[#0e0e0e]">
								Auto-Resize 9:16
							</div>
							<div className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(14,14,14,0.45)" }}>
								Portrait-first for every platform
							</div>
						</div>

						{/* Card 4 — Dark donut */}
						<div
							className="rounded-2xl p-5"
							style={{
								background: "#0e0e0e",
								minHeight: "280px",
							}}
						>
							<div className="h-36 flex items-center justify-center mb-4">
								<div className="relative h-28 w-28">
									<svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden>
										<circle cx="50" cy="50" r="36" fill="none" stroke="#1e1e1e" strokeWidth="14" />
										<circle cx="50" cy="50" r="36" fill="none" stroke="#ff6a00" strokeWidth="14"
											strokeDasharray="226" strokeDashoffset="79" strokeLinecap="round" transform="rotate(-90 50 50)" />
										<circle cx="50" cy="50" r="36" fill="none" stroke="rgba(255,106,0,0.2)" strokeWidth="14"
											strokeDasharray="226" strokeDashoffset="-147" strokeLinecap="round" transform="rotate(-90 50 50)" />
									</svg>
									<div className="absolute inset-0 flex flex-col items-center justify-center">
										<span className="text-xl font-heading font-bold text-white">65%</span>
										<span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Exported</span>
									</div>
								</div>
							</div>
							<div className="font-heading font-semibold text-sm text-white">
								Multi-Platform Export
							</div>
							<div className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
								Publish everywhere in one click
							</div>
						</div>
					</div>

					{/* Full features 6-grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{FEATURES.map((f, i) => (
							<div
								key={i}
								className="rounded-2xl p-6 transition-all"
								style={{
									background: "#fff",
									border: "1px solid rgba(14,14,14,0.07)",
									boxShadow: "0 2px 12px rgba(14,14,14,0.04)",
								}}
							>
								<div className="flex items-start justify-between mb-4">
									<div
										className="h-10 w-10 rounded-xl flex items-center justify-center"
										style={{ background: "rgba(255,106,0,0.10)" }}
									>
										<f.icon className="h-5 w-5" style={{ color: "#ff6a00" }} />
									</div>
									<span
										className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full"
										style={{
											background: "rgba(255,106,0,0.08)",
											color: "#ff6a00",
											border: "1px solid rgba(255,106,0,0.15)",
										}}
									>
										{f.badge}
									</span>
								</div>
								<h3 className="font-heading font-semibold text-base mb-2 text-[#0e0e0e]">
									{f.title}
								</h3>
								<p className="text-sm leading-relaxed" style={{ color: "rgba(14,14,14,0.5)" }}>
									{f.description}
								</p>
								<Link
									href="/login"
									className="inline-flex items-center gap-1 mt-4 text-xs font-medium transition-colors"
									style={{ color: "#ff6a00" }}
								>
									Learn more <ChevronRight className="h-3.5 w-3.5" />
								</Link>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    HOW IT WORKS
			═══════════════════════════════════════════════════════ */}
			<section className="relative py-24 overflow-hidden bg-white" id="about">
				{/* Soft glow background */}
				<div
					className="absolute pointer-events-none inset-0"
					style={{
						background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,106,0,0.04) 0%, transparent 70%)",
					}}
				/>

				<div className="max-w-7xl mx-auto px-8 relative z-10">
					<div className="text-center mb-16">
						<div
							className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-5"
							style={{
								background: "rgba(255,106,0,0.08)",
								border: "1px solid rgba(255,106,0,0.18)",
								color: "#ff6a00",
							}}
						>
							<Clock className="h-3 w-3" />
							How It Works
						</div>
						<h2
							className="font-heading font-bold leading-tight mb-4 text-[#0e0e0e]"
							style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)" }}
						>
							From raw footage to
							<br />
							published everywhere — in minutes
						</h2>
						<p className="text-base max-w-lg mx-auto" style={{ color: "rgba(14,14,14,0.5)" }}>
							Fusion's AI pipeline handles the repetitive work so you can focus
							on creating. Here's how it flows.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{HOW_IT_WORKS.map((step, i) => (
							<div key={i} className="relative">
								{/* Connector line */}
								{i < HOW_IT_WORKS.length - 1 && (
									<div
										className="absolute top-8 left-full w-6 h-px hidden lg:block"
										style={{ background: "rgba(255,106,0,0.2)", zIndex: 0 }}
									/>
								)}
								<div
									className="rounded-2xl p-6 h-full"
									style={{
										background: "#fff",
										border: "1px solid rgba(14,14,14,0.07)",
										boxShadow: "0 2px 12px rgba(14,14,14,0.04)",
									}}
								>
									<div className="flex items-center gap-3 mb-5">
										<div
											className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
											style={{ background: "#ff6a00" }}
										>
											<step.icon className="h-5 w-5 text-white" />
										</div>
										<span
											className="font-heading font-bold text-2xl"
											style={{ color: "rgba(14,14,14,0.12)" }}
										>
											{step.step}
										</span>
									</div>
									<h3 className="font-heading font-semibold text-base mb-2 text-[#0e0e0e]">
										{step.title}
									</h3>
									<p className="text-sm leading-relaxed" style={{ color: "rgba(14,14,14,0.5)" }}>
										{step.description}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    TESTIMONIALS
			═══════════════════════════════════════════════════════ */}
			<section className="relative py-24 overflow-hidden" style={{ background: "#fafafa" }}>
				<div
					className="absolute pointer-events-none inset-0"
					style={{
						background: "radial-gradient(ellipse 50% 60% at 50% 50%, rgba(255,106,0,0.04) 0%, transparent 70%)",
					}}
				/>

				<div className="max-w-7xl mx-auto px-8 relative z-10">
					{/* Header */}
					<div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
						<div>
							<div
								className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-5"
								style={{
									background: "rgba(255,106,0,0.08)",
									border: "1px solid rgba(255,106,0,0.18)",
									color: "#ff6a00",
								}}
							>
								<BadgeCheck className="h-3 w-3" />
								Testimonials
							</div>
							<h2
								className="font-heading font-bold leading-tight text-[#0e0e0e]"
								style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)" }}
							>
								Here&apos;s what our{" "}
								<span style={{ color: "#ff6a00" }}>
									<em className="not-italic">creators</em>
								</span>
								<br />
								have to say
							</h2>
						</div>
						<div className="flex flex-col items-start lg:items-end gap-3">
							<p
								className="text-sm max-w-xs lg:text-right"
								style={{ color: "rgba(14,14,14,0.45)" }}
							>
								Real stories from real creators who transformed their content
								workflow with Fusion.
							</p>
							<Link
								href="/login"
								className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm transition-colors"
								style={{
									border: "1px solid rgba(14,14,14,0.12)",
									color: "rgba(14,14,14,0.6)",
								}}
							>
								Read creator stories <ChevronRight className="h-4 w-4" />
							</Link>
						</div>
					</div>

					{/* 2×2 grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{TESTIMONIALS.map((t, i) => (
							<div
								key={i}
								className="rounded-2xl p-7"
								style={{
									background: "#fff",
									border: "1px solid rgba(14,14,14,0.07)",
									boxShadow: "0 2px 12px rgba(14,14,14,0.04)",
								}}
							>
								{/* Stars */}
								<div className="flex gap-0.5 mb-4">
									{[...Array(t.stars)].map((_, j) => (
										<Star key={j} className="h-3.5 w-3.5 fill-[#ff6a00] text-[#ff6a00]" />
									))}
								</div>
								<p className="font-heading text-lg font-semibold mb-2 leading-snug text-[#0e0e0e]">
									Amazing tool! Saved me months
								</p>
								<p className="text-sm leading-relaxed mb-7" style={{ color: "rgba(14,14,14,0.5)" }}>
									{t.quote}
								</p>
								<div className="flex items-center gap-3">
									<div
										className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
										style={{
											background: "rgba(255,106,0,0.12)",
											color: "#ff6a00",
										}}
									>
										{t.initial}
									</div>
									<div>
										<div className="text-sm font-semibold text-[#0e0e0e]">
											{t.author}
										</div>
										<div className="text-xs mt-0.5" style={{ color: "rgba(14,14,14,0.4)" }}>
											{t.role} · {t.platform}
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    PRICING
			═══════════════════════════════════════════════════════ */}
			<section id="pricing" className="relative py-24 overflow-hidden bg-white">
				<div className="max-w-7xl mx-auto px-8">
					<div className="text-center mb-16">
						<div
							className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-5"
							style={{
								background: "rgba(255,106,0,0.08)",
								border: "1px solid rgba(255,106,0,0.18)",
								color: "#ff6a00",
							}}
						>
							<Zap className="h-3 w-3" />
							Pricing
						</div>
						<h2
							className="font-heading font-bold leading-tight mb-4 text-[#0e0e0e]"
							style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)" }}
						>
							Simple, transparent pricing
						</h2>
						<p className="text-base max-w-md mx-auto" style={{ color: "rgba(14,14,14,0.5)" }}>
							No hidden fees. Cancel anytime. Start for free, upgrade when you
							need to.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{PRICING_TIERS.map((tier, i) => (
							<div
								key={i}
								className="rounded-2xl p-7 relative flex flex-col"
								style={{
									background: tier.highlighted ? "#0e0e0e" : "#fff",
									border: tier.highlighted
										? "2px solid #ff6a00"
										: "1px solid rgba(14,14,14,0.08)",
									boxShadow: tier.highlighted
										? "0 8px 48px rgba(255,106,0,0.18)"
										: "0 2px 12px rgba(14,14,14,0.04)",
								}}
							>
								{tier.highlighted && (
									<div
										className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold text-white"
										style={{ background: "#ff6a00" }}
									>
										Most Popular
									</div>
								)}

								<div className="mb-6">
									<div
										className="text-sm font-semibold mb-1"
										style={{ color: tier.highlighted ? "rgba(255,255,255,0.6)" : "rgba(14,14,14,0.5)" }}
									>
										{tier.name}
									</div>
									<div className="flex items-baseline gap-1 mb-2">
										<span
											className="font-heading font-bold text-4xl"
											style={{ color: tier.highlighted ? "#fff" : "#0e0e0e" }}
										>
											{tier.price}
										</span>
										{tier.period && (
											<span
												className="text-sm"
												style={{ color: tier.highlighted ? "rgba(255,255,255,0.4)" : "rgba(14,14,14,0.4)" }}
											>
												{tier.period}
											</span>
										)}
									</div>
									<p
										className="text-sm"
										style={{ color: tier.highlighted ? "rgba(255,255,255,0.5)" : "rgba(14,14,14,0.5)" }}
									>
										{tier.description}
									</p>
								</div>

								<Link
									href="/login"
									className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold mb-7 transition-all"
									style={
										tier.highlighted
											? { background: "#ff6a00", color: "#fff", boxShadow: "0 4px 20px rgba(255,106,0,0.3)" }
											: { background: "rgba(14,14,14,0.06)", color: "#0e0e0e" }
									}
								>
									{tier.cta}
									<ArrowRight className="h-4 w-4" />
								</Link>

								<div className="space-y-3 flex-1">
									{tier.features.map((feature, j) => (
										<div key={j} className="flex items-start gap-2.5">
											<div
												className="h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
												style={{
													background: tier.highlighted
														? "rgba(255,106,0,0.2)"
														: "rgba(255,106,0,0.10)",
												}}
											>
												<Check className="h-3 w-3" style={{ color: "#ff6a00" }} />
											</div>
											<span
												className="text-sm"
												style={{
													color: tier.highlighted
														? "rgba(255,255,255,0.7)"
														: "rgba(14,14,14,0.65)",
												}}
											>
												{feature}
											</span>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    INTEGRATIONS — fully centered
			═══════════════════════════════════════════════════════ */}
			<section className="relative py-24 overflow-hidden" style={{ background: "#fafafa" }}>
				{/* Left glow */}
				<div
					className="absolute pointer-events-none"
					style={{
						bottom: "-10%",
						left: "-5%",
						width: "500px",
						height: "400px",
						background: "radial-gradient(ellipse, rgba(255,106,0,0.07) 0%, transparent 65%)",
						borderRadius: "50%",
					}}
				/>

				<div className="max-w-7xl mx-auto px-8 relative z-10">
					{/* All content centered */}
					<div className="text-center">
						{/* Stacked avatars — centered */}
						<div className="flex items-center justify-center mb-5">
							{["S", "M", "J"].map((l, i) => (
								<div
									key={i}
									className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
									style={{
										background: "#ff6a00",
										opacity: 0.5 + i * 0.25,
										marginLeft: i > 0 ? "-10px" : 0,
										border: "2.5px solid #fafafa",
										zIndex: 3 - i,
									}}
								>
									{l}
								</div>
							))}
						</div>

						<div
							className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-5"
							style={{
								background: "rgba(255,106,0,0.08)",
								border: "1px solid rgba(255,106,0,0.18)",
								color: "#ff6a00",
							}}
						>
							<Layers className="h-3 w-3" />
							Caption
						</div>

						<h2
							className="font-heading font-bold leading-tight mb-4 text-[#0e0e0e]"
							style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)" }}
						>
							I lost popular
							<br />
							integration apps
						</h2>

						<p
							className="text-base mb-6 mx-auto"
							style={{ color: "rgba(14,14,14,0.45)", maxWidth: "420px" }}
						>
							Publish directly to all your favourite platforms — YouTube, TikTok,
							Instagram, and more — without leaving Fusion.
						</p>

						<Link
							href="/login"
							className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm mb-14 transition-colors"
							style={{
								border: "1px solid rgba(14,14,14,0.12)",
								color: "rgba(14,14,14,0.55)",
							}}
						>
							See all apps <ChevronRight className="h-4 w-4" />
						</Link>

						{/* Icon grid — centered */}
						<div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
							{PLATFORM_ROWS[0].map((app, i) => (
								<div
									key={i}
									className="h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-bold transition-transform hover:scale-105 cursor-pointer"
									style={{
										background: app.color,
										color: "#fff",
										boxShadow: `0 4px 20px ${app.color}35`,
									}}
									title={app.name}
								>
									{app.letter}
								</div>
							))}
						</div>
						<div className="flex items-center justify-center gap-4 flex-wrap">
							{PLATFORM_ROWS[1].map((app, i) => (
								<div
									key={i}
									className="h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-bold transition-transform hover:scale-105 cursor-pointer"
									style={{
										background: app.color,
										color: "#fff",
										boxShadow: `0 4px 20px ${app.color}35`,
									}}
									title={app.name}
								>
									{app.letter}
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    FAQ ACCORDION
			═══════════════════════════════════════════════════════ */}
			<section className="py-24 bg-white" id="resources">
				<div className="max-w-4xl mx-auto px-8">
					<div className="text-center mb-14">
						<div
							className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-5"
							style={{
								background: "rgba(255,106,0,0.08)",
								border: "1px solid rgba(255,106,0,0.18)",
								color: "#ff6a00",
							}}
						>
							<PlusCircle className="h-3 w-3" />
							FAQ
						</div>
						<h2
							className="font-heading font-bold leading-tight text-[#0e0e0e]"
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
									border: openFaq === i
										? "1.5px solid rgba(255,106,0,0.3)"
										: "1px solid rgba(14,14,14,0.07)",
									boxShadow: openFaq === i
										? "0 4px 20px rgba(255,106,0,0.08)"
										: "0 1px 6px rgba(14,14,14,0.03)",
								}}
							>
								<button
									className="w-full flex items-center justify-between px-6 py-5 text-left"
									onClick={() => setOpenFaq(openFaq === i ? null : i)}
								>
									<span className="font-semibold text-base text-[#0e0e0e] pr-4">
										{faq.question}
									</span>
									<div
										className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
										style={{
											background: openFaq === i
												? "#ff6a00"
												: "rgba(14,14,14,0.06)",
										}}
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
									<div
										className="px-6 pb-6 text-sm leading-relaxed"
										style={{ color: "rgba(14,14,14,0.55)" }}
									>
										{faq.answer}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    NEWSLETTER / EARLY ACCESS CTA STRIP
			═══════════════════════════════════════════════════════ */}
			<section
				style={{ background: "#ff6a00" }}
				className="py-16 relative overflow-hidden"
			>
				{/* Decorative arc */}
				<div
					className="absolute pointer-events-none"
					style={{
						top: "-60%",
						right: "-5%",
						width: "400px",
						height: "400px",
						borderRadius: "50%",
						border: "60px solid rgba(255,255,255,0.08)",
					}}
				/>
				<div
					className="absolute pointer-events-none"
					style={{
						bottom: "-60%",
						left: "-5%",
						width: "300px",
						height: "300px",
						borderRadius: "50%",
						border: "50px solid rgba(255,255,255,0.06)",
					}}
				/>

				<div className="max-w-7xl mx-auto px-8 relative z-10">
					<div className="flex flex-col lg:flex-row items-center justify-between gap-8">
						<div>
							<div className="flex items-center gap-2 mb-2">
								<Mail className="h-5 w-5 text-white/70" />
								<span className="text-white/70 text-sm font-medium uppercase tracking-widest">
									Newsletter
								</span>
							</div>
							<h3 className="font-heading font-bold text-2xl text-white mb-1">
								Stay ahead of the curve
							</h3>
							<p className="text-white/65 text-sm max-w-md">
								Get weekly tips, feature updates, and creator success stories
								delivered to your inbox. No spam, unsubscribe anytime.
							</p>
						</div>
						<div className="flex gap-3 w-full lg:w-auto">
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="Enter your email address"
								className="flex-1 lg:w-72 px-4 py-3 rounded-xl text-sm outline-none"
								style={{
									background: "rgba(255,255,255,0.15)",
									border: "1.5px solid rgba(255,255,255,0.25)",
									color: "#fff",
								}}
							/>
							<button
								className="px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 flex-shrink-0 transition-all"
								style={{
									background: "#fff",
									color: "#ff6a00",
									boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
								}}
							>
								Subscribe
								<ArrowRight className="h-4 w-4" />
							</button>
						</div>
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    FINAL CTA
			═══════════════════════════════════════════════════════ */}
			<section className="relative py-28 overflow-hidden bg-white">
				{/* Orange circle decoration — bottom right */}
				<div
					className="absolute pointer-events-none"
					style={{
						bottom: "-80px",
						right: "-80px",
						width: "420px",
						height: "420px",
						borderRadius: "50%",
						border: "52px solid rgba(255,106,0,0.10)",
					}}
				/>
				<div
					className="absolute pointer-events-none"
					style={{
						bottom: "-30px",
						right: "-20px",
						width: "260px",
						height: "260px",
						borderRadius: "50%",
						background: "rgba(255,106,0,0.06)",
					}}
				/>
				{/* Top-left glow */}
				<div
					className="absolute pointer-events-none"
					style={{
						top: "-50px",
						left: "10%",
						width: "400px",
						height: "300px",
						background: "radial-gradient(ellipse, rgba(255,106,0,0.05) 0%, transparent 70%)",
						borderRadius: "50%",
					}}
				/>

				<div className="max-w-7xl mx-auto px-8 relative z-10">
					<div className="max-w-2xl">
						<div
							className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest mb-7"
							style={{
								background: "rgba(255,106,0,0.08)",
								border: "1px solid rgba(255,106,0,0.18)",
								color: "#ff6a00",
							}}
						>
							<Share2 className="h-3 w-3" />
							Caption
						</div>

						<h2
							className="font-heading font-bold leading-tight mb-6 text-[#0e0e0e]"
							style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)" }}
						>
							The best in the
							<br />
							class product for
							<br />
							you today!
						</h2>

						<p
							className="text-lg leading-relaxed mb-10"
							style={{ color: "rgba(14,14,14,0.50)", maxWidth: "460px" }}
						>
							This is a placeholder for your testimonials and what your client
							has to say, put them here and make sure its 100% true and
							meaningful.
						</p>

						<div className="flex flex-wrap gap-4">
							<Link
								href="/login"
								className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
								style={{
									background: "#ff6a00",
									color: "#fff",
									boxShadow: "0 4px 24px rgba(255,106,0,0.28)",
								}}
							>
								Get a Free Demo
								<ArrowRight className="h-4 w-4" />
							</Link>
							<Link
								href="#features"
								className="flex items-center gap-2 px-5 py-3 text-sm"
								style={{ color: "rgba(14,14,14,0.45)" }}
							>
								Start work efficiently with our best product →
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    DASHBOARD PREVIEW
			═══════════════════════════════════════════════════════ */}
			<section className="overflow-hidden pt-16" style={{ background: "#fafafa" }}>
				<div className="max-w-7xl mx-auto px-8">
					<div className="text-center mb-8">
						<div className="inline-flex items-center gap-2 mb-2">
							<Image src="/FusionAI.svg" alt="Fusion" width={18} height={18} />
							<span className="text-sm font-heading font-semibold" style={{ color: "rgba(14,14,14,0.4)" }}>
								fusion · uilfry
							</span>
						</div>
						<div className="text-xs uppercase tracking-widest" style={{ color: "rgba(14,14,14,0.3)" }}>
							Welcome back, Jenny
						</div>
					</div>

					{/* App shell */}
					<div
						className="rounded-t-2xl overflow-hidden"
						style={{
							background: "#fff",
							border: "1px solid rgba(14,14,14,0.08)",
							borderBottom: "none",
							boxShadow: "0 -12px 60px rgba(14,14,14,0.06)",
						}}
					>
						{/* Title bar */}
						<div
							className="flex items-center gap-2 px-5 py-3"
							style={{
								background: "#f5f5f5",
								borderBottom: "1px solid rgba(14,14,14,0.06)",
							}}
						>
							<div className="h-3 w-3 rounded-full" style={{ background: "#ff6a00", opacity: 0.7 }} />
							<div className="h-3 w-3 rounded-full bg-black/10" />
							<div className="h-3 w-3 rounded-full bg-black/10" />
							<div className="flex-1 mx-4">
								<div
									className="h-5 rounded-md flex items-center px-3 max-w-xs mx-auto"
									style={{ background: "rgba(14,14,14,0.05)" }}
								>
									<span className="text-[10px]" style={{ color: "rgba(14,14,14,0.25)" }}>
										app.fusioneditor.com
									</span>
								</div>
							</div>
						</div>

						{/* App body */}
						<div className="flex" style={{ height: "420px" }}>
							{/* Sidebar */}
							<div
								className="flex flex-col gap-1 p-3 flex-shrink-0"
								style={{
									width: "200px",
									background: "#fafafa",
									borderRight: "1px solid rgba(14,14,14,0.06)",
								}}
							>
								<div className="flex items-center gap-2 px-2 py-2 mb-3">
									<Image src="/FusionAI.svg" alt="Fusion" width={18} height={18} />
									<span className="text-xs font-heading font-bold text-[#0e0e0e]">
										Fusion
									</span>
									<span
										className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
										style={{ background: "rgba(255,106,0,0.12)", color: "#ff6a00" }}
									>
										PRO
									</span>
								</div>
								{[
									{ icon: "▶", label: "Dashboard" },
									{ icon: "✦", label: "Editor", active: true },
									{ icon: "☰", label: "Design" },
									{ icon: "✶", label: "Branding" },
									{ icon: "↑", label: "Uploads" },
									{ icon: "⚙", label: "Analytics" },
									{ icon: "★", label: "Settings" },
								].map((item) => (
									<div
										key={item.label}
										className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-xs cursor-pointer"
										style={{
											background: item.active ? "rgba(255,106,0,0.08)" : "transparent",
											color: item.active ? "#ff6a00" : "rgba(14,14,14,0.38)",
										}}
									>
										<span className="text-[10px]">{item.icon}</span>
										{item.label}
									</div>
								))}
								{/* Bottom user */}
								<div className="mt-auto flex items-center gap-2 px-2 py-2">
									<div
										className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
										style={{ background: "#ff6a00" }}
									>
										J
									</div>
									<div>
										<div className="text-[10px] font-medium text-[#0e0e0e]">Jenny</div>
										<div className="text-[9px]" style={{ color: "rgba(14,14,14,0.35)" }}>Logout</div>
									</div>
								</div>
							</div>

							{/* Main content */}
							<div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#f7f7f7" }}>
								{/* Top area — canvas */}
								<div
									className="flex-1 flex items-center justify-center relative overflow-hidden"
									style={{
										background: "radial-gradient(ellipse at 50% 40%, rgba(255,106,0,0.04) 0%, transparent 65%)",
									}}
								>
									<div className="text-center">
										<div
											className="h-48 w-28 rounded-2xl flex flex-col items-center justify-center mx-auto mb-3 relative"
											style={{
												border: "1.5px solid rgba(255,106,0,0.2)",
												background: "linear-gradient(160deg, rgba(255,106,0,0.06), rgba(255,106,0,0.02))",
											}}
										>
											<Play className="h-10 w-10 mb-2" style={{ color: "rgba(255,106,0,0.45)" }} />
											{/* Subtitle strip */}
											<div
												className="absolute bottom-3 left-2 right-2 h-5 rounded flex items-center justify-center"
												style={{ background: "rgba(14,14,14,0.65)" }}
											>
												<span className="text-[7px] text-white/60">AI caption goes here...</span>
											</div>
										</div>
										<div className="text-[10px]" style={{ color: "rgba(14,14,14,0.25)" }}>
											Preview canvas
										</div>
									</div>

									{/* Floating caption popover */}
									<div
										className="absolute top-4 right-4 rounded-xl px-3 py-2 flex items-center gap-2"
										style={{
											background: "#fff",
											border: "1px solid rgba(14,14,14,0.08)",
											boxShadow: "0 4px 16px rgba(14,14,14,0.08)",
										}}
									>
										<Sparkles className="h-3.5 w-3.5" style={{ color: "#ff6a00" }} />
										<span className="text-[10px] font-medium text-[#0e0e0e]">
											AI captions ready
										</span>
									</div>
								</div>

								{/* Timeline */}
								<div
									className="flex items-center gap-1.5 px-4"
									style={{
										height: "52px",
										background: "#fff",
										borderTop: "1px solid rgba(14,14,14,0.06)",
									}}
								>
									{[...Array(16)].map((_, i) => (
										<div
											key={i}
											className="h-7 rounded flex-1"
											style={{
												background:
													i < 5 ? "#ff6a00"
													: i < 9 ? "#ececec"
													: i < 13 ? "#e8e8e8"
													: "#ececec",
												opacity: i >= 5 && i < 9 ? 0.55 : 1,
											}}
										/>
									))}
								</div>
							</div>

							{/* Right properties panel */}
							<div
								className="hidden lg:flex flex-col gap-3 p-4 flex-shrink-0"
								style={{
									width: "210px",
									background: "#fff",
									borderLeft: "1px solid rgba(14,14,14,0.06)",
								}}
							>
								<div
									className="text-[9px] uppercase tracking-widest mb-1"
									style={{ color: "rgba(14,14,14,0.3)" }}
								>
									Properties
								</div>
								{["Position X", "Position Y", "Scale", "Opacity", "Duration", "Speed"].map((prop) => (
									<div key={prop} className="flex items-center justify-between">
										<span className="text-[10px]" style={{ color: "rgba(14,14,14,0.4)" }}>
											{prop}
										</span>
										<div
											className="h-4 w-14 rounded"
											style={{ background: "rgba(14,14,14,0.06)" }}
										/>
									</div>
								))}
								<div
									className="h-px my-1"
									style={{ background: "rgba(14,14,14,0.06)" }}
								/>
								<div className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(14,14,14,0.3)" }}>
									Caption Style
								</div>
								{["Font", "Size", "Color", "Animation"].map((prop) => (
									<div key={prop} className="flex items-center justify-between">
										<span className="text-[10px]" style={{ color: "rgba(14,14,14,0.4)" }}>
											{prop}
										</span>
										<div className="h-4 w-14 rounded" style={{ background: "rgba(14,14,14,0.06)" }} />
									</div>
								))}
								<div className="mt-auto flex flex-col gap-2">
									<div
										className="h-8 rounded-xl flex items-center justify-center text-[11px] font-bold cursor-pointer text-white"
										style={{ background: "#ff6a00" }}
									>
										Export
									</div>
									<div
										className="h-8 rounded-xl flex items-center justify-center text-[11px] cursor-pointer"
										style={{
											background: "rgba(14,14,14,0.05)",
											color: "rgba(14,14,14,0.5)",
										}}
									>
										Publish
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ═══════════════════════════════════════════════════════
			    FULL FOOTER
			═══════════════════════════════════════════════════════ */}
			<footer
				className="pt-16 pb-10"
				style={{
					background: "#0e0e0e",
				}}
			>
				<div className="max-w-7xl mx-auto px-8">
					{/* Top row: brand + columns */}
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 mb-14">
						{/* Brand */}
						<div className="col-span-2 md:col-span-1">
							<Link href="/" className="flex items-center gap-2.5 mb-4">
								<Image src="/FusionAI.svg" alt="Fusion" width={28} height={28} />
								<span className="font-heading font-bold text-sm text-white">
									Fusion
								</span>
							</Link>
							<p
								className="text-sm leading-relaxed mb-5"
								style={{ color: "rgba(255,255,255,0.35)" }}
							>
								The AI-powered portrait video editor built for creators who want
								to move faster and reach further.
							</p>
							{/* Social icons */}
							<div className="flex gap-2">
								{["T", "Y", "IG", "Li"].map((s, i) => (
									<div
										key={i}
										className="h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all"
										style={{
											background: "rgba(255,255,255,0.07)",
											color: "rgba(255,255,255,0.4)",
											border: "1px solid rgba(255,255,255,0.08)",
										}}
									>
										{s}
									</div>
								))}
							</div>
						</div>

						{/* Link columns */}
						{Object.entries(FOOTER_LINKS).map(([category, links]) => (
							<div key={category}>
								<div
									className="text-xs font-semibold uppercase tracking-widest mb-4"
									style={{ color: "rgba(255,255,255,0.35)" }}
								>
									{category}
								</div>
								<div className="flex flex-col gap-2.5">
									{links.map((link) => (
										<Link
											key={link}
											href="#"
											className="text-sm transition-colors"
											style={{ color: "rgba(255,255,255,0.35)" }}
											onMouseEnter={(e) =>
												(e.currentTarget.style.color = "rgba(255,255,255,0.75)")
											}
											onMouseLeave={(e) =>
												(e.currentTarget.style.color = "rgba(255,255,255,0.35)")
											}
										>
											{link}
										</Link>
									))}
								</div>
							</div>
						))}
					</div>

					{/* Divider */}
					<div
						className="h-px mb-8"
						style={{ background: "rgba(255,255,255,0.07)" }}
					/>

					{/* Bottom row */}
					<div className="flex flex-col md:flex-row items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<Image src="/FusionAI.svg" alt="Fusion" width={20} height={20} />
							<span className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
								© 2026 Fusion Video Editor. All rights reserved.
							</span>
						</div>
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-1.5">
								<div
									className="h-2 w-2 rounded-full"
									style={{ background: "#16a34a" }}
								/>
								<span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
									All systems operational
								</span>
							</div>
							<span
								className="text-xs px-2.5 py-1 rounded-full"
								style={{
									background: "rgba(255,106,0,0.12)",
									color: "#ff6a00",
									border: "1px solid rgba(255,106,0,0.15)",
								}}
							>
								v2.4.1
							</span>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
