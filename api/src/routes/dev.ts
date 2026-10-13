import { randomUUID } from 'node:crypto';
import { Router, type Response } from 'express';
import { z } from 'zod';
import { createCredentialUser, type Auth } from '../auth.js';
import type { Env } from '../env.js';
import type { MemoryStore } from '../store/memory.js';
import { DEMO_VENDOR_LOGINS, DEMO_VENDOR_PASSWORD } from '../store/seed.js';

const QuickLoginBody = z.object({ role: z.enum(['admin', 'vendor']) });

/** One-click logins for local development. Never mounted in production. */
export function devRouter(auth: Auth, store: MemoryStore, env: Env) {
	const router = Router();

	async function signInAs(res: Response, body: { email: string; password: string }, status = 200) {
		const response = await auth.api.signInEmail({ body, asResponse: true });
		for (const cookie of response.headers.getSetCookie()) res.append('set-cookie', cookie);
		res.status(response.ok ? status : response.status).json(await response.json());
	}

	router.post('/login', async (req, res) => {
		const { role } = QuickLoginBody.parse(req.body);
		await signInAs(
			res,
			role === 'admin'
				? { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD }
				: { email: DEMO_VENDOR_LOGINS[0]!.email, password: DEMO_VENDOR_PASSWORD },
		);
	});

	router.post('/register', async (_req, res) => {
		const number = store.listVendors().length + 1;
		const vendor = store.addVendor({
			name: `Demo Shop ${number}`,
			phone: `8801700${String(number).padStart(6, '0')}`,
		});
		const login = { email: `shop-${randomUUID().slice(0, 8)}@ypyd.local`, password: DEMO_VENDOR_PASSWORD };
		await createCredentialUser(auth, { ...login, name: vendor.name, role: 'vendor', vendorId: vendor.id });
		await signInAs(res, login, 201);
	});

	return router;
}
