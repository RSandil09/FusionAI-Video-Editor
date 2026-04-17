/**
 * Download a file via our server-side proxy.
 *
 * Uses a direct <a href> instead of fetch → blob → objectURL so the browser's
 * native download manager takes over as soon as the first response byte arrives.
 * The previous fetch + blob approach buffered the entire file into RAM first,
 * causing a silent freeze for large exports.
 *
 * The proxy sets Content-Disposition: attachment so the browser treats the
 * response as a file save, not navigation.
 */
export const download = (url: string, filename: string): void => {
	try {
		const proxyUrl = `/api/download-proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
		const link = document.createElement("a");
		link.href = proxyUrl;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		link.parentNode?.removeChild(link);
	} catch (error) {
		console.error("Download error:", error);
		window.open(url, "_blank");
	}
};
