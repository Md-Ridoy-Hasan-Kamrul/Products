import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { createApp } from './app.js';
import { loadEnv } from './env.js';
import { MemoryStore } from './store/memory.js';
import { DEMO_VENDOR_PASSWORD, createSeededStore } from './store/seed.js';

/**
 * The vendor <-> admin connection: approval, suspension, commission rate,
 * shop profile, and what buyers can see as a result.
 */

const WEB_ORIGIN = 'http://web.test';
const ADMIN = { email: 'admin@test.local', password: 'test-admin-pass' };
const SEEDED_VENDOR = { email: 'ghor@ypyd.local', password: DEMO_VENDOR_PASSWORD };

interface TestServer {
	server: Server;
	url: string;
	adminCookie: string;
}

async function start(approval: 'auto' | 'manual'): Promise<TestServer> {
	const env = loadEnv({
		NODE_ENV: 'test',
		WEB_ORIGIN,
		PUBLIC_URL: 'http://api.test',
		ADMIN_EMAIL: ADMIN.email,
		ADMIN_PASSWORD: ADMIN.password,
		VENDOR_APPROVAL: approval,
	});
	const app = await createApp(env, { store: createSeededStore() });
	const server = app.listen(0);
	await new Promise<void>((resolve) => server.once('listening', resolve));
	const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	return { server, url, adminCookie: await login(url, ADMIN) };
}

function call(url: string, path: string, init: { method?: string; body?: unknown; cookie?: string } = {}) {
	const headers = new Headers({ origin: WEB_ORIGIN });
	if (init.body !== undefined) headers.set('content-type', 'application/json');
	if (init.cookie) headers.set('cookie', init.cookie);
	return fetch(`${url}${path}`, {
		method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
		headers,
		body: init.body === undefined ? undefined : JSON.stringify(init.body),
	});
}

async function login(url: string, credentials: { email: string; password: string }): Promise<string> {
	const res = await call(url, '/api/auth/sign-in/email', { body: credentials });
	expect(res.status).toBe(200);
	return res.headers
		.getSetCookie()
		.map((cookie) => cookie.split(';')[0])
		.join('; ');
}

let counter = 0;
/** Registers a fresh shop, logs it in, and adds one product. */
async function newShopWithProduct(s: TestServer) {
	counter += 1;
	const email = `shop${counter}-${Date.now()}@test.local`;
	const register = await call(s.url, '/api/vendor/register', {
		body: { shopName: `Shop ${counter}`, phone: `0171${String(counter).padStart(7, '0')}`, email, password: 'shop-pass-1' },
	});
	expect(register.status).toBe(201);
	const { vendor } = await register.json();
	const cookie = await login(s.url, { email, password: 'shop-pass-1' });
	const add = await call(s.url, '/api/vendor/products', {
		cookie,
		body: { title: `Item ${counter}`, category: 'fashion', priceMinor: 50_000, imageUrl: null },
	});
	expect(add.status).toBe(201);
	const { product } = await add.json();
	return { vendor, cookie, product };
}

const isPublic = async (s: TestServer, productId: string) => (await call(s.url, `/api/products/${productId}`)).status === 200;

let auto: TestServer;
let manual: TestServer;

beforeAll(async () => {
	[auto, manual] = await Promise.all([start('auto'), start('manual')]);
});

afterAll(async () => {
	await Promise.all([auto, manual].map((s) => new Promise<void>((resolve) => s.server.close(() => resolve()))));
});

describe('vendor status in the store', () => {
	test('only active vendors have public products and can take order intents', () => {
		const store = new MemoryStore();
		const vendor = store.addVendor({ name: 'Shop', phone: '8801711000009', status: 'pending' });
		const product = store.addProduct({
			vendorId: vendor.id,
			title: 'Item',
			description: '',
			category: 'fashion',
			priceMinor: 10_000,
			imageUrl: null,
		});

		expect(store.listProducts()).toHaveLength(0);
		expect(store.getProduct(product.id)).toBeUndefined();
		expect(store.recordOrderIntent(product.id)).toBeUndefined();
		expect(store.listProducts({ vendorId: vendor.id, includeHidden: true })).toHaveLength(1);

		store.updateVendor(vendor.id, { status: 'active' });
		expect(store.getProduct(product.id)?.title).toBe('Item');
		expect(store.recordOrderIntent(product.id)).toBeDefined();
	});

	test('a new commission rate applies to new intents only', () => {
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
		const before = store.recordOrderIntent(product.id)!;
		store.updateVendor(vendor.id, { commissionBps: 500 });
		const after = store.recordOrderIntent(product.id)!;

		expect([before.commissionMinor, after.commissionMinor]).toEqual([1_000, 500]);
		expect(store.listOrderIntents()[0]!.commissionMinor).toBe(1_000);
	});
});

describe('VENDOR_APPROVAL=auto', () => {
	test('a new shop is active and its product is public right away', async () => {
		const { vendor, product } = await newShopWithProduct(auto);
		expect(vendor.status).toBe('active');
		expect(await isPublic(auto, product.id)).toBe(true);
	});
});

describe('VENDOR_APPROVAL=manual', () => {
	test('a new shop waits for approval, then goes live when the admin approves it', async () => {
		const { vendor, cookie, product } = await newShopWithProduct(manual);
		expect(vendor.status).toBe('pending');
		expect(await isPublic(manual, product.id)).toBe(false);

		// The vendor still sees and manages the product.
		const mine = await (await call(manual.url, '/api/vendor/products', { cookie })).json();
		expect(mine.products.map((p: { id: string }) => p.id)).toContain(product.id);

		// The admin sees the shop waiting.
		const summary = await (await call(manual.url, '/api/admin/summary', { cookie: manual.adminCookie })).json();
		expect(summary.totals.pendingVendors).toBeGreaterThan(0);

		const approve = await call(manual.url, `/api/admin/vendors/${vendor.id}`, {
			method: 'PATCH',
			cookie: manual.adminCookie,
			body: { status: 'active' },
		});
		expect(approve.status).toBe(200);
		expect((await approve.json()).vendor.status).toBe('active');
		expect(await isPublic(manual, product.id)).toBe(true);
		expect((await call(manual.url, '/api/orders/click', { body: { productId: product.id } })).status).toBe(201);
	});
});

describe('admin manages vendors', () => {
	test('suspending hides the shop from buyers and stops order intents; reactivating restores it', async () => {
		const { vendor, cookie, product } = await newShopWithProduct(auto);
		const patch = (body: unknown) =>
			call(auto.url, `/api/admin/vendors/${vendor.id}`, { method: 'PATCH', cookie: auto.adminCookie, body });

		expect((await patch({ status: 'suspended' })).status).toBe(200);
		expect(await isPublic(auto, product.id)).toBe(false);
		expect((await call(auto.url, '/api/orders/click', { body: { productId: product.id } })).status).toBe(404);
		const catalog = await (await call(auto.url, '/api/products')).json();
		expect(catalog.products.some((p: { id: string }) => p.id === product.id)).toBe(false);

		// The vendor can still log in and sees why.
		const me = await (await call(auto.url, '/api/vendor/me', { cookie })).json();
		expect(me.vendor.status).toBe('suspended');

		expect((await patch({ status: 'active' })).status).toBe(200);
		expect(await isPublic(auto, product.id)).toBe(true);
	});

	test('sets a special commission rate', async () => {
		const { vendor, product } = await newShopWithProduct(auto);
		const res = await call(auto.url, `/api/admin/vendors/${vendor.id}`, {
			method: 'PATCH',
			cookie: auto.adminCookie,
			body: { commissionBps: 750 },
		});
		expect((await res.json()).vendor.commissionBps).toBe(750);

		await call(auto.url, '/api/orders/click', { body: { productId: product.id } });
		const summary = await (await call(auto.url, '/api/admin/summary', { cookie: auto.adminCookie })).json();
		expect(summary.recentOrderIntents[0]).toMatchObject({ productId: product.id, commissionBps: 750, commissionMinor: 3_750 });
	});

	test('validates the change and the vendor id, and needs an admin', async () => {
		const { vendor, cookie } = await newShopWithProduct(auto);
		const patch = (body: unknown, as = auto.adminCookie, id = vendor.id) =>
			call(auto.url, `/api/admin/vendors/${id}`, { method: 'PATCH', cookie: as, body });

		expect((await patch({ status: 'deleted' })).status).toBe(400);
		expect((await patch({ commissionBps: 10_001 })).status).toBe(400);
		expect((await patch({ commissionBps: 12.5 })).status).toBe(400);
		expect((await patch({})).status).toBe(400);
		expect((await patch({ status: 'active' }, auto.adminCookie, 'missing')).status).toBe(404);
		expect((await patch({ status: 'suspended' }, cookie)).status).toBe(401);
	});

	test('lists every live product with its shop status, including hidden shops', async () => {
		const { vendor, product } = await newShopWithProduct(auto);
		await call(auto.url, `/api/admin/vendors/${vendor.id}`, {
			method: 'PATCH',
			cookie: auto.adminCookie,
			body: { status: 'suspended' },
		});

		expect((await call(auto.url, '/api/admin/products')).status).toBe(401);
		const { products } = await (await call(auto.url, '/api/admin/products', { cookie: auto.adminCookie })).json();
		expect(products.find((p: { id: string }) => p.id === product.id)).toMatchObject({ vendorStatus: 'suspended' });
	});
});

describe('vendor edits the shop profile', () => {
	test('renames the shop and changes the WhatsApp number used for orders', async () => {
		const cookie = await login(auto.url, SEEDED_VENDOR);
		const res = await call(auto.url, '/api/vendor/me', {
			method: 'PATCH',
			cookie,
			body: { name: 'Ghor Sajao BD', phone: '+880 1911-000099' },
		});
		expect(res.status).toBe(200);
		expect((await res.json()).vendor).toMatchObject({ name: 'Ghor Sajao BD', phone: '8801911000099' });

		const { products } = await (await call(auto.url, '/api/products?q=Ghor Sajao BD')).json();
		expect(products.length).toBeGreaterThan(0);
		expect(products[0].vendor).toMatchObject({ name: 'Ghor Sajao BD', phone: '8801911000099' });
	});

	test('cannot change its own status or rate, and validates input', async () => {
		const cookie = await login(auto.url, SEEDED_VENDOR);
		const patch = (body: unknown) => call(auto.url, '/api/vendor/me', { method: 'PATCH', cookie, body });

		expect((await patch({ status: 'active' })).status).toBe(400);
		expect((await patch({ commissionBps: 0 })).status).toBe(400);
		expect((await patch({ phone: '12345' })).status).toBe(400);
		expect((await patch({ name: 'x' })).status).toBe(400);
		expect((await patch({})).status).toBe(400);
		expect((await call(auto.url, '/api/vendor/me', { method: 'PATCH', body: { name: 'Nope' } })).status).toBe(401);
	});
});
