import { Router } from 'express';
import { requireAdmin, type Auth } from '../auth.js';
import type { MemoryStore } from '../store/memory.js';
import { dailySeries, productStats, totalsOf } from '../store/stats.js';
import { CHART_DAYS, recentIntents } from './insights.js';

export function adminRouter(store: MemoryStore, auth: Auth) {
	const router = Router();
	router.use(requireAdmin(auth));

	router.get('/summary', (_req, res) => {
		const vendors = store.commissionSummary();
		const intents = store.listOrderIntents();
		const totals = totalsOf(intents);

		res.json({
			totals: { vendors: vendors.length, products: store.listProducts().length, ...totals },
			vendors,
			daily: dailySeries(intents, CHART_DAYS),
			productStats: productStats(intents).map((stat) => ({ ...stat, productTitle: store.productTitle(stat.productId) })),
			recentOrderIntents: recentIntents(store, intents),
		});
	});

	return router;
}
