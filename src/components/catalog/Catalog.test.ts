import { loadRenderers } from 'astro:container';
import { getContainerRenderer } from '@astrojs/react';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import type { Product } from '../../lib/types';
import Catalog from './Catalog.astro';

const vendor = { id: 'v1', name: 'Gadget Haat', phone: '8801711000001' };

function product(id: string, title: string, category: string): Product {
	return {
		id,
		vendorId: vendor.id,
		title,
		description: '',
		category,
		priceMinor: 25_000,
		imageUrl: null,
		createdAt: '',
		updatedAt: '',
		vendor,
	};
}

async function render(props: { products: Product[]; devError?: string | null }) {
	const renderers = await loadRenderers([getContainerRenderer()]);
	const container = await AstroContainer.create({ renderers });
	return container.renderToString(Catalog, { props });
}

test('groups products by category with an Order Now link on each card', async () => {
	const html = await render({
		products: [
			product('a', 'Smart Watch', 'electronics'),
			product('b', 'Cotton Panjabi', 'fashion'),
			product('c', 'Power Bank', 'electronics'),
		],
	});

	expect(html).toContain('id="cat-electronics"');
	expect(html).toContain('id="cat-fashion"');
	expect(html).toContain('Electronics');
	expect(html).toContain('href="/categories/electronics"');
	expect(html).toContain('href="/products/b"');
	expect(html.match(/Order Now/g)).toHaveLength(3);
	expect(html.indexOf('Smart Watch')).toBeLessThan(html.indexOf('Cotton Panjabi'));
});

test('Order Now is a working WhatsApp link before hydration', async () => {
	const html = await render({ products: [product('smart-watch', 'Smart Watch', 'electronics')] });
	const href = /href="(https:\/\/wa\.me\/[^"]+)"/.exec(html)?.[1]?.replaceAll('&amp;', '&');

	expect(href).toBeDefined();
	const url = new URL(href!);
	expect(url.pathname).toBe('/8801711000001');
	expect(url.searchParams.get('text')).toMatch(/^Hi, I want to order this: Smart Watch - https?:\/\/.+\/products\/smart-watch$/);
	expect(html).toContain('target="_blank"');
});

test('shows an empty state without products', async () => {
	expect(await render({ products: [] })).toContain('No products to show right now.');
});

test('explains a stopped API in dev', async () => {
	const html = await render({ products: [], devError: 'Cannot reach the API.' });
	expect(html).toContain('role="alert"');
	expect(html).toContain('npm run dev');
});
