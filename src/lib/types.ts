export interface VendorRef {
	id: string;
	name: string;
	phone: string;
}

export interface Product {
	id: string;
	vendorId: string;
	title: string;
	description: string;
	/** Category slug, see lib/categories.ts. */
	category: string;
	/** Price in poisha (1 BDT = 100 poisha). */
	priceMinor: number;
	imageUrl: string | null;
	createdAt: string;
	updatedAt: string;
	vendor: VendorRef;
}

export interface Vendor extends VendorRef {
	commissionBps: number;
	createdAt: string;
}

export interface VendorCommissionSummary {
	vendor: Vendor;
	productCount: number;
	orderIntentCount: number;
	grossMinor: number;
	commissionOwedMinor: number;
}

export interface IntentTotals {
	orderIntents: number;
	grossMinor: number;
	commissionOwedMinor: number;
}

export interface DailyPoint {
	/** YYYY-MM-DD in Bangladesh time. */
	date: string;
	orderIntents: number;
	commissionMinor: number;
}

export interface ProductIntentStat {
	productId: string;
	productTitle?: string | null;
	orderIntents: number;
	grossMinor: number;
	commissionMinor: number;
}

/** One ledger row, newest first in API responses. */
export interface OrderIntentRow {
	id: string;
	productId: string;
	productTitle: string | null;
	vendorId: string;
	vendorName: string | null;
	priceMinor: number;
	commissionBps: number;
	commissionMinor: number;
	createdAt: string;
}

export interface VendorInsights {
	totals: IntentTotals;
	daily: DailyPoint[];
	productStats: ProductIntentStat[];
	recentOrderIntents: OrderIntentRow[];
}

export interface AdminSummary {
	totals: IntentTotals & { vendors: number; products: number };
	vendors: VendorCommissionSummary[];
	daily: DailyPoint[];
	productStats: ProductIntentStat[];
	recentOrderIntents: OrderIntentRow[];
}
