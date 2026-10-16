import type { OrderIntent } from './types.js';

export interface IntentTotals {
	orderIntents: number;
	grossMinor: number;
	commissionOwedMinor: number;
}

export interface DailyPoint {
	/** Calendar day in Bangladesh time, YYYY-MM-DD. */
	date: string;
	orderIntents: number;
	commissionMinor: number;
}

export interface ProductIntentStat {
	productId: string;
	orderIntents: number;
	grossMinor: number;
	commissionMinor: number;
}

// en-CA formats as YYYY-MM-DD; buyers and vendors count days in Dhaka time.
const dhakaDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' });
const DAY_MS = 86_400_000;

export function totalsOf(intents: readonly OrderIntent[]): IntentTotals {
	const totals: IntentTotals = { orderIntents: 0, grossMinor: 0, commissionOwedMinor: 0 };
	for (const intent of intents) {
		totals.orderIntents += 1;
		totals.grossMinor += intent.priceMinor;
		totals.commissionOwedMinor += intent.commissionMinor;
	}
	return totals;
}

/** One point per day for the last `days` days, oldest first, zero-filled. */
export function dailySeries(intents: readonly OrderIntent[], days: number, now = new Date()): DailyPoint[] {
	const points = new Map<string, DailyPoint>();
	for (let offset = days - 1; offset >= 0; offset--) {
		const date = dhakaDay.format(new Date(now.getTime() - offset * DAY_MS));
		points.set(date, { date, orderIntents: 0, commissionMinor: 0 });
	}
	for (const intent of intents) {
		const point = points.get(dhakaDay.format(new Date(intent.createdAt)));
		if (!point) continue;
		point.orderIntents += 1;
		point.commissionMinor += intent.commissionMinor;
	}
	return [...points.values()];
}

/** Per-product totals, busiest first. */
export function productStats(intents: readonly OrderIntent[]): ProductIntentStat[] {
	const stats = new Map<string, ProductIntentStat>();
	for (const intent of intents) {
		let stat = stats.get(intent.productId);
		if (!stat) {
			stat = { productId: intent.productId, orderIntents: 0, grossMinor: 0, commissionMinor: 0 };
			stats.set(intent.productId, stat);
		}
		stat.orderIntents += 1;
		stat.grossMinor += intent.priceMinor;
		stat.commissionMinor += intent.commissionMinor;
	}
	return [...stats.values()].sort((a, b) => b.orderIntents - a.orderIntents);
}
