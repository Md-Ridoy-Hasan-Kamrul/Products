import {
	BookOpen,
	Dumbbell,
	Headphones,
	Shirt,
	ShoppingBag,
	ShoppingBasket,
	Sofa,
	Sparkles,
	ToyBrick,
	type LucideIcon,
} from 'lucide-react';

export interface Category {
	slug: string;
	name: string;
	icon: LucideIcon;
}

// Slugs and names must match CATEGORIES in api/src/store/types.ts.
export const CATEGORIES: Category[] = [
	{ slug: 'electronics', name: 'Electronics', icon: Headphones },
	{ slug: 'fashion', name: 'Fashion', icon: Shirt },
	{ slug: 'home-living', name: 'Home & Living', icon: Sofa },
	{ slug: 'beauty-health', name: 'Beauty & Health', icon: Sparkles },
	{ slug: 'groceries', name: 'Groceries', icon: ShoppingBasket },
	{ slug: 'kids-toys', name: 'Kids & Toys', icon: ToyBrick },
	{ slug: 'sports-outdoor', name: 'Sports & Outdoor', icon: Dumbbell },
	{ slug: 'books-stationery', name: 'Books & Stationery', icon: BookOpen },
];

export function categoryBySlug(slug: string): Category {
	return CATEGORIES.find((category) => category.slug === slug) ?? { slug, name: slug, icon: ShoppingBag };
}

export function categoryPath(slug: string): string {
	return `/categories/${encodeURIComponent(slug)}`;
}
