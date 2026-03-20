import { S3Client } from "@aws-sdk/client-s3";

export const getR2Client = () => {
	const accessKeyId = process.env.R2_ACCESS_KEY_ID;
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
	const endpoint = process.env.R2_ENDPOINT;

	if (!accessKeyId || !secretAccessKey || !endpoint) {
		throw new Error(
			"Missing R2 credentials: checking R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ENDPOINT",
		);
	}

	return new S3Client({
		region: "auto",
		endpoint: endpoint,
		credentials: {
			accessKeyId,
			secretAccessKey,
		},
	});
};
