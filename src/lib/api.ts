import { PUBLIC_API_URL } from 'astro:env/client';
import type { Product } from './types';

export class ApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
	}
}

export function apiUrl(path: string): string {
	return new URL(path, PUBLIC_API_URL).href;
}

/** Sends the session cookie, so logged-in vendor and admin calls work. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const headers = new Headers(init.headers);
	if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');

	const res = await fetch(apiUrl(path), { ...init, headers, credentials: 'include' }).catch(() => {
		throw new ApiError(0, `Cannot reach the API at ${PUBLIC_API_URL}. Start it with "npm run dev:api".`);
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) throw new ApiError(res.status, data?.error ?? data?.message ?? `Request failed with ${res.status}`);
	return data as T;
}

/**
 * Server-side catalog fetch for storefront pages. Returns an empty list when
 * the API is down so the page shows an empty state instead of crashing.
 */
export async function loadCatalog(filter: { category?: string } = {}): Promise<{ products: Product[]; error: string | null }> {
	const query = filter.category ? `?category=${encodeURIComponent(filter.category)}` : '';
	try {
		const { products } = await apiFetch<{ products: Product[] }>(`/api/products${query}`);
		return { products, error: null };
	} catch (error) {
		const message = (error as Error).message;
		console.warn(`[catalog] ${message}`);
		return { products: [], error: message };
	}
}

/** One public product, or null when it does not exist or its shop is not live. */
export async function loadProduct(id: string): Promise<Product | null> {
	try {
		return (await apiFetch<{ product: Product }>(`/api/products/${encodeURIComponent(id)}`)).product;
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) return null;
		throw error;
	}
}

export function trackOrderClick(productId: string): Promise<Response> {
	// keepalive lets the request finish even as focus moves to the WhatsApp tab.
	return fetch(apiUrl('/api/orders/click'), {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ productId }),
		keepalive: true,
	});
}
