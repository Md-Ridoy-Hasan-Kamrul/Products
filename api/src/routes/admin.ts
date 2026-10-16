import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin, type Auth } from '../auth.js';
import type { MemoryStore } from '../store/memory.js';
import { dailySeries, productStats, totalsOf } from '../store/stats.js';
import { MAX_COMMISSION_BPS, VENDOR_STATUSES } from '../store/types.js';
import { CHART_DAYS, recentIntents } from './insights.js';

const VendorParams = z.object({ id: z.string().min(1).max(100) });

const VendorChangesBody = z
	.object({
		status: z.enum(VENDOR_STATUSES),
		commissionBps: z.number().int().min(0).max(MAX_COMMISSION_BPS),
	})
	.partial()
	.strict()
	.refine((changes) => Object.keys(changes).length > 0, 'Nothing to update');

export function adminRouter(store: MemoryStore, auth: Auth) {
	const router = Router();
	router.use(requireAdmin(auth));

	router.get('/summary', (_req, res) => {
		const vendors = store.commissionSummary();
		const intents = store.listOrderIntents();

		res.json({
			totals: {
				vendors: vendors.length,
				pendingVendors: vendors.filter((row) => row.vendor.status === 'pending').length,
				products: store.listProducts().length,
				...totalsOf(intents),
			},
			vendors,
			daily: dailySeries(intents, CHART_DAYS),
			productStats: productStats(intents).map((stat) => ({ ...stat, productTitle: store.productTitle(stat.productId) })),
			recentOrderIntents: recentIntents(store, intents),
		});
	});

	/** Every live product, including those of pending or suspended shops. */
	router.get('/products', (_req, res) => {
		res.json({
			products: store
				.listProducts({ includeHidden: true })
				.map((product) => ({ ...product, vendorStatus: product.vendor.status })),
		});
	});

	router.patch('/vendors/:id', (req, res) => {
		const { id } = VendorParams.parse(req.params);
		const vendor = store.updateVendor(id, VendorChangesBody.parse(req.body));
		if (!vendor) {
			res.status(404).json({ error: 'Vendor not found' });
			return;
		}
		res.json({ vendor });
	});

	return router;
}
