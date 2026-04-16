/**
 * Download a file by streaming it through our server-side proxy.
 * This avoids CORS issues with cross-origin URLs (e.g. Lambda S3 output).
 */
export const download = async (url: string, filename: string): Promise<void> => {
	try {
		const proxyUrl = `/api/download-proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
		const response = await fetch(proxyUrl);
		if (!response.ok) throw new Error(`Download failed: ${response.status}`);
		const blob = await response.blob();
		const objectUrl = window.URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = objectUrl;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		link.parentNode?.removeChild(link);
		window.URL.revokeObjectURL(objectUrl);
	} catch (error) {
		console.error("Download error:", error);
		// Fallback: open in new tab
		window.open(url, "_blank");
	}
};
