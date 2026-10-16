import { Router } from 'express';
import { z } from 'zod';
import { createCredentialUser, EmailTakenError, requireVendor, type Auth } from '../auth.js';
import type { Env } from '../env.js';
import type { MemoryStore } from '../store/memory.js';
import { dailySeries, productStats, totalsOf } from '../store/stats.js';
import { CATEGORY_SLUGS } from '../store/types.js';
import { BdPhone, ShopName } from '../validation.js';
import { CHART_DAYS, recentIntents } from './insights.js';

const NewProductBody = z.object({
	title: z.string().trim().min(2).max(200),
	description: z.string().trim().max(2000).default(''),
	category: z.enum(CATEGORY_SLUGS),
	priceMinor: z.number().int().positive().max(100_000_000),
	imageUrl: z.url({ protocol: /^https?$/ }).nullable().default(null),
});

const ProductChangesBody = z
	.object({
		title: NewProductBody.shape.title,
		description: z.string().trim().max(2000),
		category: NewProductBody.shape.category,
		priceMinor: NewProductBody.shape.priceMinor,
		imageUrl: z.url({ protocol: /^https?$/ }).nullable(),
	})
	.partial()
	.strict()
	.refine((changes) => Object.keys(changes).length > 0, 'Nothing to update');

const ProductParams = z.object({ id: z.string().min(1).max(100) });

const RegisterBody = z.object({
	shopName: ShopName,
	phone: BdPhone,
	email: z.email().max(200),
	password: z.string().min(8).max(128),
});

const ShopChangesBody = z
	.object({ name: ShopName, phone: BdPhone })
	.partial()
	.strict()
	.refine((changes) => Object.keys(changes).length > 0, 'Nothing to update');

/** Status a new shop starts in. */
export function initialVendorStatus(env: Env) {
	return env.VENDOR_APPROVAL === 'manual' ? 'pending' : 'active';
}

export function vendorRouter(store: MemoryStore, auth: Auth, env: Env) {
	const router = Router();

	router.post('/register', async (req, res) => {
		const body = RegisterBody.parse(req.body);
		const ctx = await auth.$context;
		if (await ctx.internalAdapter.findUserByEmail(body.email.toLowerCase())) {
			res.status(409).json({ error: 'An account with this email already exists' });
			return;
		}

		const vendor = store.addVendor({ name: body.shopName, phone: body.phone, status: initialVendorStatus(env) });
		try {
			await createCredentialUser(auth, {
				email: body.email,
				password: body.password,
				name: body.shopName,
				role: 'vendor',
				vendorId: vendor.id,
			});
		} catch (error) {
			if (error instanceof EmailTakenError) {
				res.status(409).json({ error: 'An account with this email already exists' });
				return;
			}
			throw error;
		}
		res.status(201).json({ vendor });
	});

	router.use(requireVendor(auth, store));

	router.get('/me', (_req, res) => {
		res.json({ vendor: res.locals.vendor });
	});

	// Name and WhatsApp number only; status and rate belong to the admin.
	router.patch('/me', (req, res) => {
		res.json({ vendor: store.updateVendor(res.locals.vendor!.id, ShopChangesBody.parse(req.body)) });
	});

	router.get('/insights', (_req, res) => {
		const intents = store.listOrderIntents({ vendorId: res.locals.vendor!.id });
		res.json({
			totals: totalsOf(intents),
			daily: dailySeries(intents, CHART_DAYS),
			productStats: productStats(intents),
			recentOrderIntents: recentIntents(store, intents),
		});
	});

	router.get('/products', (_req, res) => {
		res.json({ products: store.listProducts({ vendorId: res.locals.vendor!.id, includeHidden: true }) });
	});

	router.post('/products', (req, res) => {
		const body = NewProductBody.parse(req.body);
		const product = store.addProduct({ ...body, vendorId: res.locals.vendor!.id });
		res.status(201).json({ product: store.getVendorProduct(product.id, res.locals.vendor!.id) });
	});

	router.patch('/products/:id', (req, res) => {
		const { id } = ProductParams.parse(req.params);
		const product = store.updateProduct(id, res.locals.vendor!.id, ProductChangesBody.parse(req.body));
		if (!product) {
			res.status(404).json({ error: 'Product not found' });
			return;
		}
		res.json({ product });
	});

	router.delete('/products/:id', (req, res) => {
		const { id } = ProductParams.parse(req.params);
		if (!store.deleteProduct(id, res.locals.vendor!.id)) {
			res.status(404).json({ error: 'Product not found' });
			return;
		}
		res.status(204).end();
	});

	return router;
}
