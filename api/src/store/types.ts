export const CATEGORIES = [
	{ slug: 'electronics', name: 'Electronics' },
	{ slug: 'fashion', name: 'Fashion' },
	{ slug: 'home-living', name: 'Home & Living' },
	{ slug: 'beauty-health', name: 'Beauty & Health' },
	{ slug: 'groceries', name: 'Groceries' },
	{ slug: 'kids-toys', name: 'Kids & Toys' },
	{ slug: 'sports-outdoor', name: 'Sports & Outdoor' },
	{ slug: 'books-stationery', name: 'Books & Stationery' },
] as const;

export const CATEGORY_SLUGS = CATEGORIES.map((category) => category.slug) as [
	CategorySlug,
	...CategorySlug[],
];
export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

/** Standard commission in basis points (1000 = 10%). */
export const STANDARD_COMMISSION_BPS = 1000;

export interface Vendor {
	id: string;
	name: string;
	/** WhatsApp number in international format without "+", e.g. 8801711000000. */
	phone: string;
	commissionBps: number;
	createdAt: string;
}

export interface Product {
	id: string;
	vendorId: string;
	title: string;
	description: string;
	category: CategorySlug;
	/** Price in poisha (1 BDT = 100 poisha). */
	priceMinor: number;
	imageUrl: string | null;
	createdAt: string;
}

export interface ProductWithVendor extends Product {
	vendor: Pick<Vendor, 'id' | 'name' | 'phone'>;
}

/**
 * One "Order Now" click. Append-only ledger row: price and commission are
 * snapshotted at click time so later price edits never rewrite history.
 */
export interface OrderIntent {
	readonly id: string;
	readonly productId: string;
	readonly vendorId: string;
	readonly priceMinor: number;
	readonly commissionBps: number;
	readonly commissionMinor: number;
	readonly createdAt: string;
}

export interface VendorCommissionSummary {
	vendor: Vendor;
	productCount: number;
	orderIntentCount: number;
	grossMinor: number;
	commissionOwedMinor: number;
}
