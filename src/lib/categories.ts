export interface Category {
	slug: string;
	name: string;
	icon: string;
	/** Placeholder tile colour for products without an image. */
	tint: string;
}

// Slugs and names must match CATEGORIES in api/src/store/types.ts.
export const CATEGORIES: Category[] = [
	{ slug: 'electronics', name: 'Electronics', icon: '🎧', tint: '#e0ecff' },
	{ slug: 'fashion', name: 'Fashion', icon: '👕', tint: '#fde7ef' },
	{ slug: 'home-living', name: 'Home & Living', icon: '🛋️', tint: '#efe8dc' },
	{ slug: 'beauty-health', name: 'Beauty & Health', icon: '🧴', tint: '#e5f5ec' },
	{ slug: 'groceries', name: 'Groceries', icon: '🍯', tint: '#fff3d6' },
	{ slug: 'kids-toys', name: 'Kids & Toys', icon: '🧸', tint: '#ffe9dc' },
	{ slug: 'sports-outdoor', name: 'Sports & Outdoor', icon: '🏏', tint: '#e2f3f7' },
	{ slug: 'books-stationery', name: 'Books & Stationery', icon: '📒', tint: '#ece8fb' },
];

const FALLBACK: Category = { slug: 'other', name: 'Other', icon: '🛍️', tint: '#eceff3' };

export function categoryBySlug(slug: string): Category {
	return CATEGORIES.find((category) => category.slug === slug) ?? { ...FALLBACK, slug, name: slug };
}

export function categoryPath(slug: string): string {
	return `/categories/${encodeURIComponent(slug)}`;
}
