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

export interface AdminSummary {
	totals: {
		vendors: number;
		orderIntents: number;
		grossMinor: number;
		commissionOwedMinor: number;
	};
	vendors: VendorCommissionSummary[];
	recentOrderIntents: {
		id: string;
		productId: string;
		productTitle: string | null;
		vendorId: string;
		priceMinor: number;
		commissionMinor: number;
		createdAt: string;
	}[];
}
