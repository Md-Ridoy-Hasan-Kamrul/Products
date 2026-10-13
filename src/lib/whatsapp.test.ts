import { expect, test } from 'vitest';
import { buildWhatsAppUrl, productPath } from './whatsapp';

test('builds a wa.me link with the order message', () => {
	const url = new URL(
		buildWhatsAppUrl({
			vendorPhone: '8801711000001',
			productTitle: 'Smart Watch S8',
			productUrl: 'https://ypyd.example.com/products/smart-watch-s8',
		}),
	);

	expect(url.origin).toBe('https://wa.me');
	expect(url.pathname).toBe('/8801711000001');
	expect(url.searchParams.get('text')).toBe(
		'Hi, I want to order this: Smart Watch S8 - https://ypyd.example.com/products/smart-watch-s8',
	);
});

test('strips formatting from the phone and encodes special characters', () => {
	const url = buildWhatsAppUrl({
		vendorPhone: '+880 1711-000001',
		productTitle: 'Tom & Jerry? #1',
		productUrl: 'https://x.test/products/a',
	});

	expect(url.startsWith('https://wa.me/8801711000001?text=')).toBe(true);
	expect(new URL(url).searchParams.get('text')).toBe('Hi, I want to order this: Tom & Jerry? #1 - https://x.test/products/a');
});

test('product path encodes the id', () => {
	expect(productPath('a b')).toBe('/products/a%20b');
});
