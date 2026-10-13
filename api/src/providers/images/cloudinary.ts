import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ImageProvider } from './types.js';

interface CloudinaryConfig {
	cloudName: string;
	apiKey: string;
	apiSecret: string;
	folder?: string;
}

const UploadResponse = z.object({ secure_url: z.url() });

export function createCloudinaryImageProvider(config: CloudinaryConfig): ImageProvider {
	const folder = config.folder ?? 'ypyd/products';

	return {
		name: 'cloudinary',
		async upload(image) {
			const timestamp = Math.floor(Date.now() / 1000).toString();
			const signature = createHash('sha1')
				.update(`folder=${folder}&timestamp=${timestamp}${config.apiSecret}`)
				.digest('hex');

			const form = new FormData();
			form.set('file', `data:${image.mimeType};base64,${image.bytes.toString('base64')}`);
			form.set('api_key', config.apiKey);
			form.set('folder', folder);
			form.set('timestamp', timestamp);
			form.set('signature', signature);

			const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
				method: 'POST',
				body: form,
			});
			if (!res.ok) {
				throw new Error(`Cloudinary upload failed with ${res.status}`);
			}
			return { url: UploadResponse.parse(await res.json()).secure_url };
		},
	};
}
