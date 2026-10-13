import { Router } from 'express';
import { z } from 'zod';
import type { MemoryStore } from '../store/memory.js';
import { CATEGORIES, CATEGORY_SLUGS } from '../store/types.js';

const ProductParams = z.object({ id: z.string().min(1).max(100) });
const ProductQuery = z.object({
	q: z.string().trim().max(100).optional(),
	category: z.enum(CATEGORY_SLUGS).optional(),
});

export function catalogRouter(store: MemoryStore) {
	const router = Router();

	router.get('/categories', (_req, res) => {
		res.json({ categories: CATEGORIES });
	});

	router.get('/products', (req, res) => {
		res.json({ products: store.listProducts(ProductQuery.parse(req.query)) });
	});

	router.get('/products/:id', (req, res) => {
		const { id } = ProductParams.parse(req.params);
		const product = store.getProduct(id);
		if (!product) {
			res.status(404).json({ error: 'Product not found' });
			return;
		}
		res.json({ product });
	});

	return router;
}
