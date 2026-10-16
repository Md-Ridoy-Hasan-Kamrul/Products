import type { MemoryStore } from '../store/memory.js';
import type { OrderIntent } from '../store/types.js';

/** Days in the dashboard activity chart. */
export const CHART_DAYS = 14;
/** Newest ledger rows sent to a dashboard. */
export const RECENT_INTENTS = 100;

/** Newest first, labelled with product and vendor names. */
export function recentIntents(store: MemoryStore, intents: readonly OrderIntent[]) {
	return intents
		.slice(-RECENT_INTENTS)
		.reverse()
		.map((intent) => ({
			...intent,
			productTitle: store.productTitle(intent.productId),
			vendorName: store.getVendor(intent.vendorId)?.name ?? null,
		}));
}
