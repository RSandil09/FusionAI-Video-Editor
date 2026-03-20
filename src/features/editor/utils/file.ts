export const getBlobFromUrl = async (url: string) => {
	const response = await fetch(url, { mode: "cors" });
	if (!response.ok) {
		throw new Error(`Failed to fetch: ${response.status}`);
	}
	const blob = await response.blob();
	return blob;
};

export const getFileFromUrl = async (url: string) => {
	try {
		const response = await fetch(url, { mode: "cors" });
		if (!response.ok) {
			throw new Error(`Failed to fetch: ${response.status}`);
		}
		const blob = await response.blob();
		const filename = url.split("/").pop()?.split("?")[0] || "video.mp4";
		const file = new File([blob], filename, { type: blob.type });
		return file;
	} catch (error) {
		console.error("Error fetching file from URL:", error);
		throw error;
	}
};

export const fileToBlob = async (file: File) => {
	const blob = await new Response(file.stream()).blob();
	return blob;
};

export const blobToStream = async (blob: Blob) => {
	const file = new File([blob], "video.mp4");
	const stream = file.stream();
	return stream;
};

export const getStreamFromUrl = async (url: string) => {
	const response = await fetch(url);
	const blob = await response.blob();
	const file = new File([blob], "video.mp4");
	const stream = file.stream();
	return stream;
};
