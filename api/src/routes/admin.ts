import { Router } from 'express';
import { requireAdmin, type Auth } from '../auth.js';
import type { MemoryStore } from '../store/memory.js';

export function adminRouter(store: MemoryStore, auth: Auth) {
	const router = Router();
	router.use(requireAdmin(auth));

	router.get('/summary', (_req, res) => {
		const vendors = store.commissionSummary();
		const intents = store.listOrderIntents();

		res.json({
			totals: {
				vendors: vendors.length,
				orderIntents: intents.length,
				grossMinor: vendors.reduce((sum, row) => sum + row.grossMinor, 0),
				commissionOwedMinor: vendors.reduce((sum, row) => sum + row.commissionOwedMinor, 0),
			},
			vendors,
			recentOrderIntents: intents
				.slice(-20)
				.reverse()
				.map((intent) => ({ ...intent, productTitle: store.getProduct(intent.productId, { includeDeleted: true })?.title ?? null })),
		});
	});

	return router;
}
