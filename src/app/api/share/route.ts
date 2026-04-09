import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helpers";
import { getSocialConnection } from "@/lib/db/user-social-connections";

/**
 * POST /api/share
 * Share a video to a connected social platform.
 * Body: { platform: 'youtube' | 'instagram' | 'tiktok', videoUrl: string, title?: string, description?: string }
 */
export async function POST(request: NextRequest) {
	const user = await getUserFromRequest();
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: {
		platform?: string;
		videoUrl?: string;
		title?: string;
		description?: string;
	};
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const { platform, videoUrl, title = "My Video", description = "" } = body;
	if (!platform || !videoUrl) {
		return NextResponse.json(
			{ error: "platform and videoUrl are required" },
			{ status: 400 },
		);
	}

	if (
		platform !== "youtube" &&
		platform !== "instagram" &&
		platform !== "tiktok"
	) {
		return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
	}

	const conn = await getSocialConnection(user.id, platform);
	if (!conn || !conn.access_token) {
		return NextResponse.json(
			{ error: `Not connected to ${platform}. Connect in Settings.` },
			{ status: 400 },
		);
	}

	if (platform === "youtube") {
		try {
			// SSRF protection — only allow R2 URLs (our own storage) for sharing
			let parsedVideoUrl: URL;
			try {
				parsedVideoUrl = new URL(videoUrl);
			} catch {
				return NextResponse.json({ error: "Invalid videoUrl" }, { status: 400 });
			}
			if (!parsedVideoUrl.hostname.endsWith(".r2.dev")) {
				return NextResponse.json(
					{ error: "videoUrl must be an R2 storage URL" },
					{ status: 400 },
				);
			}

			const videoRes = await fetch(videoUrl);
			if (!videoRes.ok) throw new Error("Failed to fetch video");

			// Enforce 2 GB max for YouTube uploads
			const contentLength = Number(videoRes.headers.get("content-length") ?? 0);
			const MAX_SHARE_SIZE = 2 * 1024 * 1024 * 1024;
			if (contentLength > MAX_SHARE_SIZE) {
				return NextResponse.json(
					{ error: "Video too large for direct upload (max 2 GB)" },
					{ status: 413 },
				);
			}

			const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
			if (videoBuffer.length > MAX_SHARE_SIZE) {
				return NextResponse.json(
					{ error: "Video too large for direct upload (max 2 GB)" },
					{ status: 413 },
				);
			}

			const metadata = {
				snippet: {
					title: title.slice(0, 100),
					description: description.slice(0, 5000),
					tags: ["Fusion Video Editor"],
				},
				status: {
					privacyStatus: "private",
				},
			};

			const boundary = "-------314159265358979323846";
			const delimiter = `\r\n--${boundary}\r\n`;
			const closeDelim = `\r\n--${boundary}--`;

			const metadataPart = Buffer.from(
				delimiter +
					"Content-Type: application/json; charset=UTF-8\r\n\r\n" +
					JSON.stringify(metadata) +
					delimiter +
					"Content-Type: video/mp4\r\n\r\n",
				"utf8",
			);
			const multipartBody = Buffer.concat([
				metadataPart,
				videoBuffer,
				Buffer.from(closeDelim, "utf8"),
			]);

			const uploadRes = await fetch(
				"https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${conn.access_token}`,
						"Content-Type": `multipart/related; boundary=${boundary}`,
						"Content-Length": String(multipartBody.length),
					},
					body: multipartBody,
				},
			);

			if (!uploadRes.ok) {
				const err = await uploadRes.text();
				console.error("YouTube upload failed:", err);
				return NextResponse.json(
					{ error: "YouTube upload failed", detail: err.slice(0, 200) },
					{ status: 502 },
				);
			}

			const result = await uploadRes.json();
			const videoId = result.id;
			const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

			return NextResponse.json({
				success: true,
				platform: "youtube",
				url: watchUrl,
				videoId,
			});
		} catch (err) {
			console.error("YouTube share error:", err);
			return NextResponse.json(
				{ error: "Failed to upload to YouTube" },
				{ status: 500 },
			);
		}
	}

	if (platform === "instagram" || platform === "tiktok") {
		return NextResponse.json(
			{
				error: `${platform} direct upload not yet supported`,
				hint: "Download the video and use the app to share, or connect YouTube for direct upload.",
			},
			{ status: 501 },
		);
	}

	return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
}
