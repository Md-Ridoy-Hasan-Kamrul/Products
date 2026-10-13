import { Router } from 'express';
import { z } from 'zod';
import { createCredentialUser, EmailTakenError, requireVendor, type Auth } from '../auth.js';
import type { MemoryStore } from '../store/memory.js';
import { CATEGORY_SLUGS } from '../store/types.js';

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

/** Accepts 01XXXXXXXXX, 8801XXXXXXXXX, or +880 1XXX-XXXXXX and returns 8801XXXXXXXXX. */
const BdPhone = z
	.string()
	.transform((value) => value.replace(/\D/g, '').replace(/^0(?=1)/, '880'))
	.pipe(z.string().regex(/^8801[3-9]\d{8}$/, 'Enter a Bangladeshi mobile number, e.g. 01711000000'));

const RegisterBody = z.object({
	shopName: z.string().trim().min(2).max(100),
	phone: BdPhone,
	email: z.email().max(200),
	password: z.string().min(8).max(128),
});

export function vendorRouter(store: MemoryStore, auth: Auth) {
	const router = Router();

	router.post('/register', async (req, res) => {
		const body = RegisterBody.parse(req.body);
		const ctx = await auth.$context;
		if (await ctx.internalAdapter.findUserByEmail(body.email.toLowerCase())) {
			res.status(409).json({ error: 'An account with this email already exists' });
			return;
		}

		const vendor = store.addVendor({ name: body.shopName, phone: body.phone });
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

	router.get('/products', (_req, res) => {
		res.json({ products: store.listProducts({ vendorId: res.locals.vendor!.id }) });
	});

	router.post('/products', (req, res) => {
		const body = NewProductBody.parse(req.body);
		const product = store.addProduct({ ...body, vendorId: res.locals.vendor!.id });
		res.status(201).json({ product: store.getProduct(product.id) });
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
