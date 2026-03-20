import { renderVideo } from "../src/lib/remotion-renderer";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testRender() {
	console.log("🚀 Starting test render...");

	if (!process.env.R2_ACCESS_KEY_ID) {
		console.error("❌ Missing R2 credentials in environment");
		process.exit(1);
	}

	const renderId = `test_render_${Date.now()}`;

	// Mock project data (simple video with one text item)
	const mockConfig = {
		compositionId: "VideoEditor",
		fps: 30,
		width: 1920,
		height: 1080,
		durationInFrames: 90, // 3 seconds
		inputProps: {
			fps: 30,
			size: { width: 1920, height: 1080 },
			trackItemIds: ["text-1", "image-1"],
			transitionsMap: {},
			trackItemsMap: {
				"text-1": {
					id: "text-1",
					type: "text",
					name: "Test Text",
					display: { from: 0, to: 3000 },
					details: {
						text: "Hello Transformation!",
						fontSize: 100,
						fontFamily: "Inter",
						color: "#ffffff",
						backgroundColor: "transparent",
						width: 800,
						height: 200,
						textAlign: "center",
					},
					metadata: {},
					placement: {
						x: 560,
						y: 440,
						width: 800,
						height: 200,
						rotation: 0,
						scaleX: 1,
						scaleY: 1,
					},
				},
				"image-1": {
					id: "image-1",
					type: "image",
					name: "Test Image",
					display: { from: 0, to: 3000 },
					details: {
						src: "/api/image-proxy?url=https%3A%2F%2Fpub-760dc7f0a82e481197568d0a306385c6.r2.dev%2Fusers%2F5dP04gFN7RdraHyCxXphPZcRN432%2Fuploads%2F1770899412803-PHOTO-2025-06-14-16-33-57.jpg",
					},
					metadata: {},
					placement: {
						x: 100,
						y: 100,
						width: 400,
						height: 400,
						rotation: 0,
						scaleX: 1,
						scaleY: 1,
					},
				},
			},
		},
	};

	try {
		console.log(`📦 Bundling and rendering job: ${renderId}`);
		const publicUrl = await renderVideo(renderId, mockConfig);
		console.log("✅ Render successful!");
		console.log("🌐 Public URL:", publicUrl);
	} catch (error) {
		console.error("❌ Render failed:", error);
		process.exit(1);
	}
}

testRender();
