import { randomUUID } from 'node:crypto';
import type { ImageProvider, StoredImage } from './types.js';

export function createMockImageProvider(publicUrl: string): ImageProvider {
	const images = new Map<string, StoredImage>();

	return {
		name: 'mock',
		async upload(image) {
			const id = randomUUID();
			images.set(id, image);
			return { url: new URL(`/api/uploads/${id}`, publicUrl).href };
		},
		get(id) {
			return images.get(id);
		},
	};
}
