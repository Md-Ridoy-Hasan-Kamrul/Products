import type { Env } from '../../env.js';
import { createCloudinaryImageProvider } from './cloudinary.js';
import { createMockImageProvider } from './mock.js';
import type { ImageProvider } from './types.js';

export function createImageProvider(env: Env): ImageProvider {
	if (env.IMAGE_PROVIDER === 'cloudinary') {
		return createCloudinaryImageProvider({
			cloudName: env.CLOUDINARY_CLOUD_NAME!,
			apiKey: env.CLOUDINARY_API_KEY!,
			apiSecret: env.CLOUDINARY_API_SECRET!,
		});
	}
	return createMockImageProvider(env.PUBLIC_URL);
}

export type { ImageProvider } from './types.js';
