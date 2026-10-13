import { Router } from 'express';
import { z } from 'zod';
import type { MemoryStore } from '../store/memory.js';

const ClickBody = z.object({ productId: z.string().min(1).max(100) });

export function ordersRouter(store: MemoryStore) {
	const router = Router();

	router.post('/click', (req, res) => {
		const { productId } = ClickBody.parse(req.body);
		const intent = store.recordOrderIntent(productId);
		if (!intent) {
			res.status(404).json({ error: 'Product not found' });
			return;
		}
		res.status(201).json({ intentId: intent.id });
	});

	return router;
}
