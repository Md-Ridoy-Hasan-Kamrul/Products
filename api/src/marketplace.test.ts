import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createApp } from './app.js';
import { loadEnv } from './env.js';
import { commissionFor } from './store/commission.js';
import { MemoryStore } from './store/memory.js';
import { DEMO_VENDOR_PASSWORD, createSeededStore } from './store/seed.js';
import { dailySeries, productStats, totalsOf } from './store/stats.js';
import type { OrderIntent } from './store/types.js';

const WEB_ORIGIN = 'http://web.test';
const ADMIN = { email: 'admin@test.local', password: 'test-admin-pass' };
const VENDOR = { email: 'gadget@ypyd.local', password: DEMO_VENDOR_PASSWORD };
const PNG_1PX =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

let server: Server;
let baseUrl: string;
let adminCookie: string;
let vendorCookie: string;

function api(path: string, init: RequestInit = {}) {
	const headers = new Headers(init.headers);
	headers.set('origin', WEB_ORIGIN);
	if (init.body) headers.set('content-type', 'application/json');
	return fetch(`${baseUrl}${path}`, { ...init, headers });
}

function post(path: string, body: unknown, cookie?: string) {
	return api(path, { method: 'POST', body: JSON.stringify(body), headers: cookie ? { cookie } : {} });
}

async function login(credentials: { email: string; password: string }): Promise<string> {
	const res = await post('/api/auth/sign-in/email', credentials);
	expect(res.status).toBe(200);
	return res.headers
		.getSetCookie()
		.map((cookie) => cookie.split(';')[0])
		.join('; ');
}

beforeAll(async () => {
	const env = loadEnv({
		NODE_ENV: 'test',
		WEB_ORIGIN,
		PUBLIC_URL: 'http://api.test',
		ADMIN_EMAIL: ADMIN.email,
		ADMIN_PASSWORD: ADMIN.password,
	});
	const app = await createApp(env, { store: createSeededStore() });
	server = app.listen(0);
	await new Promise<void>((resolve) => server.once('listening', resolve));
	baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	adminCookie = await login(ADMIN);
	vendorCookie = await login(VENDOR);
});

afterAll(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('commission', () => {
	test('10% of 250 BDT is 25 BDT', () => {
		expect(commissionFor(25_000, 1000)).toBe(2_500);
	});

	test('rounds to the nearest poisha', () => {
		expect(commissionFor(1_005, 1000)).toBe(101);
	});

	test('order intents snapshot price and cannot be mutated', () => {
		const store = new MemoryStore();
		const vendor = store.addVendor({ name: 'Shop', phone: '8801711000009' });
		const product = store.addProduct({
			vendorId: vendor.id,
			title: 'Item',
			description: '',
			category: 'fashion',
			priceMinor: 10_000,
			imageUrl: null,
		});
		const intent = store.recordOrderIntent(product.id)!;
		expect(Object.isFrozen(intent)).toBe(true);
		expect(() => {
			(intent as { priceMinor: number }).priceMinor = 1;
		}).toThrow();
		expect(store.listOrderIntents()).toHaveLength(1);
	});
});

describe('stats', () => {
	const intent = (productId: string, createdAt: string, priceMinor = 10_000): OrderIntent => ({
		id: `${productId}-${createdAt}`,
		productId,
		vendorId: 'v',
		priceMinor,
		commissionBps: 1000,
		commissionMinor: priceMinor / 10,
		createdAt,
	});

	test('totals, per-product counts busiest first, and a zero-filled daily series in Dhaka time', () => {
		const intents = [
			intent('a', '2026-10-16T20:00:00Z'), // 17 Oct 02:00 in Dhaka
			intent('b', '2026-10-17T05:00:00Z', 30_000),
			intent('b', '2026-10-10T05:00:00Z'), // outside a 3-day window
		];
		expect(totalsOf(intents)).toEqual({ orderIntents: 3, grossMinor: 50_000, commissionOwedMinor: 5_000 });
		expect(productStats(intents).map((s) => [s.productId, s.orderIntents])).toEqual([
			['b', 2],
			['a', 1],
		]);
		expect(dailySeries(intents, 3, new Date('2026-10-17T12:00:00Z'))).toEqual([
			{ date: '2026-10-15', orderIntents: 0, commissionMinor: 0 },
			{ date: '2026-10-16', orderIntents: 0, commissionMinor: 0 },
			{ date: '2026-10-17', orderIntents: 2, commissionMinor: 4_000 },
		]);
	});

	test('the store indexes intents per vendor', () => {
		const store = new MemoryStore();
		const [one, two] = ['8801711000007', '8801711000008'].map((phone) => store.addVendor({ name: phone, phone }));
		const item = (vendorId: string) =>
			store.addProduct({ vendorId, title: 'Item', description: '', category: 'fashion', priceMinor: 10_000, imageUrl: null });
		store.recordOrderIntent(item(one!.id).id);
		store.recordOrderIntent(item(two!.id).id);
		store.recordOrderIntent(item(two!.id).id);
		expect(store.listOrderIntents({ vendorId: two!.id })).toHaveLength(2);
		expect(store.commissionSummary().map((row) => [row.productCount, row.orderIntentCount])).toEqual([
			[1, 1],
			[2, 2],
		]);
	});
});

describe('auth', () => {
	test('wrong password is rejected', async () => {
		const res = await post('/api/auth/sign-in/email', { email: VENDOR.email, password: 'wrong-password' });
		expect(res.status).toBe(401);
	});

	test('public sign-up is disabled', async () => {
		const res = await post('/api/auth/sign-up/email', { email: 'x@test.local', password: 'password123', name: 'X' });
		expect(res.status).toBeGreaterThanOrEqual(400);
	});

	test('session carries the role', async () => {
		const res = await api('/api/auth/get-session', { headers: { cookie: adminCookie } });
		expect((await res.json()).user).toMatchObject({ email: ADMIN.email, role: 'admin' });
	});

	test('a vendor cannot open admin routes and an admin is not a vendor', async () => {
		expect((await api('/api/admin/summary', { headers: { cookie: vendorCookie } })).status).toBe(401);
		expect((await api('/api/vendor/products', { headers: { cookie: adminCookie } })).status).toBe(401);
	});

	test('dev one-click login signs in the seeded account for a role', async () => {
		const res = await post('/api/dev/login', { role: 'admin' });
		expect(res.status).toBe(200);
		const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
		expect((await api('/api/admin/summary', { headers: { cookie } })).status).toBe(200);
		expect((await post('/api/dev/login', { role: 'buyer' })).status).toBe(400);
	});

	test('dev one-click register creates a shop and signs it in', async () => {
		const res = await post('/api/dev/register', {});
		expect(res.status).toBe(201);
		expect((await res.json()).user.role).toBe('vendor');
		const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
		const me = await (await api('/api/vendor/me', { headers: { cookie } })).json();
		expect(me.vendor.name).toMatch(/^Demo Shop \d+$/);
		expect(me.vendor.phone).toMatch(/^8801700\d{6}$/);
	});

	test('sign-out ends the session', async () => {
		const cookie = await login(VENDOR);
		expect((await post('/api/auth/sign-out', {}, cookie)).status).toBe(200);
		expect((await api('/api/vendor/products', { headers: { cookie } })).status).toBe(401);
	});
});

describe('vendor registration', () => {
	test('creates a shop and a login, and normalises the phone', async () => {
		const res = await post('/api/vendor/register', {
			shopName: 'New Shop',
			phone: '01711-222333',
			email: 'New@Shop.test',
			password: 'newshop123',
		});
		expect(res.status).toBe(201);
		expect((await res.json()).vendor).toMatchObject({ name: 'New Shop', phone: '8801711222333', commissionBps: 1000 });

		const cookie = await login({ email: 'new@shop.test', password: 'newshop123' });
		const me = await (await api('/api/vendor/me', { headers: { cookie } })).json();
		expect(me.vendor.name).toBe('New Shop');
	});

	test('rejects a duplicate email and a bad phone', async () => {
		const duplicate = await post('/api/vendor/register', {
			shopName: 'Copy',
			phone: '01711222334',
			email: VENDOR.email,
			password: 'password123',
		});
		expect(duplicate.status).toBe(409);

		const badPhone = await post('/api/vendor/register', {
			shopName: 'Bad',
			phone: '12345',
			email: 'bad@shop.test',
			password: 'password123',
		});
		expect(badPhone.status).toBe(400);
	});
});

describe('catalog', () => {
	test('lists seeded products with vendor phone', async () => {
		const res = await api('/api/products');
		expect(res.status).toBe(200);
		const { products } = await res.json();
		expect(products.length).toBeGreaterThan(0);
		expect(products[0].vendor.phone).toMatch(/^8801\d{9}$/);
	});

	test('filters by search text and category', async () => {
		const search = await (await api('/api/products?q=earbuds')).json();
		expect(search.products.map((p: { id: string }) => p.id)).toEqual(['wireless-earbuds-pro']);

		const fashion = await (await api('/api/products?category=fashion')).json();
		expect(fashion.products.every((p: { category: string }) => p.category === 'fashion')).toBe(true);

		expect((await api('/api/products?category=nope')).status).toBe(400);
	});

	test('returns one product or 404', async () => {
		expect((await api('/api/products/smart-watch-s8')).status).toBe(200);
		expect((await api('/api/products/missing')).status).toBe(404);
	});
});

describe('POST /api/orders/click', () => {
	test('rejects an invalid body and unknown products', async () => {
		expect((await post('/api/orders/click', {})).status).toBe(400);
		expect((await post('/api/orders/click', { productId: 'missing' })).status).toBe(404);
	});

	test('records an intent that shows up in the admin summary with 10% commission', async () => {
		const summary = async () => (await api('/api/admin/summary', { headers: { cookie: adminCookie } })).json();
		const before = await summary();

		const res = await post('/api/orders/click', { productId: 'wireless-earbuds-pro' });
		expect(res.status).toBe(201);

		const after = await summary();
		expect(after.totals.orderIntents).toBe(before.totals.orderIntents + 1);
		expect(after.totals.commissionOwedMinor - before.totals.commissionOwedMinor).toBe(24_900);
		expect(after.recentOrderIntents[0].productTitle).toBe('Wireless Earbuds Pro with Noise Cancelling');
		expect(after.recentOrderIntents[0].vendorName).toBe('Gadget Haat');
		expect(after.daily).toHaveLength(14);
	});

	test('admin summary needs a login', async () => {
		expect((await api('/api/admin/summary')).status).toBe(401);
	});
});

describe('GET /api/vendor/insights', () => {
	test('requires a vendor login', async () => {
		expect((await api('/api/vendor/insights')).status).toBe(401);
	});

	test("counts only the vendor's own order intents", async () => {
		const insights = async () => (await api('/api/vendor/insights', { headers: { cookie: vendorCookie } })).json();
		const before = await insights();

		await post('/api/orders/click', { productId: 'wireless-earbuds-pro' });
		await post('/api/orders/click', { productId: 'cotton-panjabi' }); // another vendor

		const after = await insights();
		expect(after.totals.orderIntents).toBe(before.totals.orderIntents + 1);
		expect(after.daily).toHaveLength(14);
		expect(after.daily.at(-1).orderIntents).toBeGreaterThan(0);
		expect(after.recentOrderIntents.every((i: { vendorId: string }) => i.vendorId === 'vendor-gadget-haat')).toBe(true);
		expect(after.productStats.find((s: { productId: string }) => s.productId === 'wireless-earbuds-pro')).toBeTruthy();
	});
});

describe('vendor products', () => {
	test('requires a vendor login', async () => {
		expect((await api('/api/vendor/products')).status).toBe(401);
	});

	test('adds a product that appears only in their own list', async () => {
		const res = await post(
			'/api/vendor/products',
			{ title: 'USB-C Cable 1m', category: 'electronics', priceMinor: 20_000, imageUrl: null },
			vendorCookie,
		);
		expect(res.status).toBe(201);
		const { product } = await res.json();
		expect(product.vendor.id).toBe('vendor-gadget-haat');

		const mine = await (await api('/api/vendor/products', { headers: { cookie: vendorCookie } })).json();
		expect(mine.products.map((p: { id: string }) => p.id)).toContain(product.id);
		expect(mine.products.every((p: { vendorId: string }) => p.vendorId === 'vendor-gadget-haat')).toBe(true);
	});

	test('edits own product; other vendors and empty or unknown fields are rejected', async () => {
		const created = await post(
			'/api/vendor/products',
			{ title: 'Phone Case', category: 'electronics', priceMinor: 30_000 },
			vendorCookie,
		);
		const { product } = await created.json();
		const patch = (body: unknown, cookie = vendorCookie) =>
			api(`/api/vendor/products/${product.id}`, { method: 'PATCH', body: JSON.stringify(body), headers: { cookie } });

		const res = await patch({ title: 'Phone Case Pro', priceMinor: 35_000 });
		expect(res.status).toBe(200);
		expect((await res.json()).product).toMatchObject({ title: 'Phone Case Pro', priceMinor: 35_000, category: 'electronics' });
		expect((await (await api(`/api/products/${product.id}`)).json()).product.title).toBe('Phone Case Pro');

		expect((await patch({})).status).toBe(400);
		expect((await patch({ vendorId: 'vendor-deshi-style' })).status).toBe(400);
		const otherVendor = await login({ email: 'deshi@ypyd.local', password: DEMO_VENDOR_PASSWORD });
		expect((await patch({ title: 'Hijacked' }, otherVendor)).status).toBe(404);
	});

	test('price edits never rewrite recorded order intents', async () => {
		const id = 'power-bank-20000';
		await post('/api/orders/click', { productId: id });
		const before = (await (await api('/api/admin/summary', { headers: { cookie: adminCookie } })).json()).recentOrderIntents[0];

		await api(`/api/vendor/products/${id}`, {
			method: 'PATCH',
			body: JSON.stringify({ priceMinor: 1 }),
			headers: { cookie: vendorCookie },
		});
		const after = (await (await api('/api/admin/summary', { headers: { cookie: adminCookie } })).json()).recentOrderIntents[0];
		expect(after).toEqual(before);
	});

	test('deletes own product: gone from the shop and orders, still named in the ledger', async () => {
		const created = await post(
			'/api/vendor/products',
			{ title: 'Old Charger', category: 'electronics', priceMinor: 50_000 },
			vendorCookie,
		);
		const { product } = await created.json();
		await post('/api/orders/click', { productId: product.id });
		const del = (cookie: string) => api(`/api/vendor/products/${product.id}`, { method: 'DELETE', headers: { cookie } });

		const otherVendor = await login({ email: 'deshi@ypyd.local', password: DEMO_VENDOR_PASSWORD });
		expect((await del(otherVendor)).status).toBe(404);
		expect((await del(vendorCookie)).status).toBe(204);
		expect((await del(vendorCookie)).status).toBe(404);

		expect((await api(`/api/products/${product.id}`)).status).toBe(404);
		const mine = await (await api('/api/vendor/products', { headers: { cookie: vendorCookie } })).json();
		expect(mine.products.map((p: { id: string }) => p.id)).not.toContain(product.id);
		expect((await post('/api/orders/click', { productId: product.id })).status).toBe(404);

		const summary = await (await api('/api/admin/summary', { headers: { cookie: adminCookie } })).json();
		expect(summary.recentOrderIntents.find((i: { productId: string }) => i.productId === product.id).productTitle).toBe(
			'Old Charger',
		);
	});

	test('rejects an unknown category and a non-integer price', async () => {
		const res = await post('/api/vendor/products', { title: 'X item', category: 'comics', priceMinor: 1.5 }, vendorCookie);
		expect(res.status).toBe(400);
	});
});

describe('uploads (mock provider)', () => {
	test('stores an image and serves it back', async () => {
		const res = await post('/api/uploads', { dataUrl: PNG_1PX }, vendorCookie);
		expect(res.status).toBe(201);
		const { url } = await res.json();
		expect(url).toMatch(/^http:\/\/api\.test\/api\/uploads\//);

		const image = await api(new URL(url).pathname);
		expect(image.status).toBe(200);
		expect(image.headers.get('content-type')).toBe('image/png');
	});

	test('rejects non-image data and anonymous uploads', async () => {
		expect((await post('/api/uploads', { dataUrl: 'data:text/html;base64,PGgxPg==' }, vendorCookie)).status).toBe(400);
		expect((await post('/api/uploads', { dataUrl: PNG_1PX })).status).toBe(401);
	});
});

describe('env', () => {
	test('cloudinary provider needs credentials', () => {
		expect(() => loadEnv({ IMAGE_PROVIDER: 'cloudinary' })).toThrow(/CLOUDINARY_CLOUD_NAME/);
	});

	test('production refuses the default secret and admin password', () => {
		expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(/BETTER_AUTH_SECRET[\s\S]*ADMIN_PASSWORD|ADMIN_PASSWORD[\s\S]*BETTER_AUTH_SECRET/);
	});
});
