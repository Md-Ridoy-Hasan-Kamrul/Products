import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { shopVisibility, type ShopVisibility } from '../../../lib/dashboard';
import type { Product, Vendor, VendorInsights } from '../../../lib/types';
import { useApi, type ApiState } from './useApi';
import { useRefreshOnFocus } from './useRefreshOnFocus';

export type ShopChanges = Partial<Pick<Vendor, 'name' | 'phone'>>;

export interface VendorWorkspace {
	vendor: Vendor | null;
	/** null while loading. */
	products: Product[] | null;
	insights: ApiState<VendorInsights>;
	/** null while the vendor is loading. */
	visibility: ShopVisibility | null;
	/** Order intents per product id. */
	intentsByProduct: Map<string, number>;
	error: string | null;
	productAdded: (product: Product) => void;
	productUpdated: (product: Product) => void;
	productDeleted: (productId: string) => void;
	saveShop: (changes: ShopChanges) => Promise<void>;
}

/** Everything the Seller Center shows and changes, for the logged-in vendor. */
export function useVendorWorkspace(): VendorWorkspace {
	const [vendor, setVendor] = useState<Vendor | null>(null);
	const [products, setProducts] = useState<Product[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const insights = useApi<VendorInsights>('/api/vendor/insights');

	const { reload: reloadInsights } = insights;

	const load = useCallback(() => {
		Promise.all([apiFetch<{ vendor: Vendor }>('/api/vendor/me'), apiFetch<{ products: Product[] }>('/api/vendor/products')])
			.then(([me, mine]) => {
				setVendor(me.vendor);
				setProducts(mine.products);
				setError(null);
			})
			.catch((e: Error) => setError(e.message));
	}, []);

	const refresh = useCallback(() => {
		load();
		reloadInsights();
	}, [load, reloadInsights]);

	useEffect(load, [load]);
	useRefreshOnFocus(refresh);

	const intentsByProduct = useMemo(
		() => new Map((insights.data?.productStats ?? []).map((stat) => [stat.productId, stat.orderIntents])),
		[insights.data],
	);

	const productAdded = useCallback((product: Product) => setProducts((list) => [product, ...(list ?? [])]), []);
	const productUpdated = useCallback(
		(product: Product) => setProducts((list) => (list ?? []).map((p) => (p.id === product.id ? product : p))),
		[],
	);
	const productDeleted = useCallback((id: string) => setProducts((list) => (list ?? []).filter((p) => p.id !== id)), []);

	const saveShop = useCallback(async (changes: ShopChanges) => {
		const result = await apiFetch<{ vendor: Vendor }>('/api/vendor/me', { method: 'PATCH', body: JSON.stringify(changes) });
		setVendor(result.vendor);
	}, []);

	return {
		vendor,
		products,
		insights,
		visibility: vendor ? shopVisibility(vendor.status) : null,
		intentsByProduct,
		error,
		productAdded,
		productUpdated,
		productDeleted,
		saveShop,
	};
}
