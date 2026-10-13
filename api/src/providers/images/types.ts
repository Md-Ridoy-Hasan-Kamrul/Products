export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export interface ImageUpload {
	mimeType: ImageMimeType;
	bytes: Buffer;
}

export interface StoredImage {
	mimeType: ImageMimeType;
	bytes: Buffer;
}

export interface ImageProvider {
	readonly name: string;
	upload(image: ImageUpload): Promise<{ url: string }>;
	/** Only the mock provider serves files itself. */
	get?(id: string): StoredImage | undefined;
}
