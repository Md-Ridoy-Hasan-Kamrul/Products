import express, { Router } from 'express';
import { z } from 'zod';
import { requireVendor, type Auth } from '../auth.js';
import type { ImageProvider } from '../providers/images/index.js';
import { IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from '../providers/images/types.js';
import type { MemoryStore } from '../store/memory.js';

const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

const UploadBody = z.object({
	dataUrl: z
		.string()
		.regex(DATA_URL, 'Expected a base64 PNG, JPEG, or WebP data URL')
		.transform((value, ctx) => {
			const [, mimeType, base64] = DATA_URL.exec(value)!;
			const bytes = Buffer.from(base64!, 'base64');
			if (bytes.length > MAX_IMAGE_BYTES) {
				ctx.addIssue({ code: 'custom', message: 'Image must be 2 MB or smaller' });
				return z.NEVER;
			}
			return { mimeType: z.enum(IMAGE_MIME_TYPES).parse(mimeType), bytes };
		}),
});

const UploadParams = z.object({ id: z.uuid() });

export function uploadsRouter(store: MemoryStore, images: ImageProvider, auth: Auth) {
	const router = Router();

	router.post('/', requireVendor(auth, store), express.json({ limit: '3mb' }), async (req, res) => {
		const { dataUrl } = UploadBody.parse(req.body);
		res.status(201).json(await images.upload(dataUrl));
	});

	router.get('/:id', (req, res) => {
		const image = images.get?.(UploadParams.parse(req.params).id);
		if (!image) {
			res.status(404).json({ error: 'Image not found' });
			return;
		}
		res.type(image.mimeType).set('Cache-Control', 'public, max-age=31536000, immutable').send(image.bytes);
	});

	return router;
}
