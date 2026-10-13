import { expect, request as playwrightRequest, test, type Page } from '@playwright/test';
import { E2E_ADMIN, E2E_API_URL, E2E_VENDOR, E2E_WEB_URL } from './env';

const PNG_1PX = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
	'base64',
);

async function intentCount(): Promise<number> {
	const api = await playwrightRequest.newContext({ extraHTTPHeaders: { origin: E2E_WEB_URL } });
	await api.post(`${E2E_API_URL}/api/auth/sign-in/email`, { data: E2E_ADMIN });
	const res = await api.get(`${E2E_API_URL}/api/admin/summary`);
	const count = (await res.json()).totals.orderIntents;
	await api.dispose();
	return count;
}

async function logIn(page: Page, path: string, credentials: { email: string; password: string }) {
	await page.goto(path);
	await page.getByLabel('Email').fill(credentials.email);
	await page.getByLabel('Password').fill(credentials.password);
	await page.getByRole('button', { name: 'Log in' }).click();
}

test.beforeEach(async ({ context }) => {
	await context.route('https://wa.me/**', (route) => route.fulfill({ contentType: 'text/html', body: 'WhatsApp stub' }));
});

test('home shows the banner, search, categories, and products', async ({ page }) => {
	await page.goto('/');

	await expect(page).toHaveTitle(/Your Products Your Dreams/);
	await expect(page.getByRole('heading', { level: 1, name: /Your Products\.\s*Your Dreams\./ })).toBeVisible();
	await expect(page.getByRole('search')).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Categories' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Shop by category' })).toBeVisible();
	await expect(page.locator('#cat-electronics-title')).toHaveText(/Electronics/);
	await expect(page.getByRole('link', { name: 'Smart Watch S8, 1.9" Display', exact: true })).toBeVisible();
	await expect(page.getByRole('contentinfo')).toBeVisible();
});

test('Order Now tracks the click and opens WhatsApp with the order message', async ({ page, context }) => {
	const before = await intentCount();
	await page.goto('/');

	const card = page.locator('#product-smart-watch-s8');
	await card.scrollIntoViewIfNeeded();
	await expect(page.locator('astro-island', { has: card })).not.toHaveAttribute('ssr');

	const tracked = page.waitForRequest((req) => req.url().endsWith('/api/orders/click') && req.method() === 'POST');
	const popup = context.waitForEvent('page');
	await card.getByRole('link', { name: 'Order Now' }).click();

	expect((await tracked).postDataJSON()).toEqual({ productId: 'smart-watch-s8' });
	await expect(card.getByRole('link', { name: 'Opened in WhatsApp' })).toBeVisible();

	const whatsapp = await popup;
	await whatsapp.waitForURL(/wa\.me/);
	const url = new URL(whatsapp.url());
	expect(url.pathname).toBe('/8801711000001');
	expect(url.searchParams.get('text')).toMatch(
		/^Hi, I want to order this: Smart Watch S8, 1\.9" Display - http:\/\/.+\/products\/smart-watch-s8$/,
	);

	await expect.poll(intentCount).toBeGreaterThan(before);
});

test('search finds products', async ({ page }) => {
	await page.goto('/');
	await page.getByLabel('Search products').fill('honey');
	await page.getByRole('button', { name: 'Search' }).click();

	await expect(page).toHaveURL(/\/search\?q=honey/);
	const main = page.getByRole('main');
	await expect(main.getByRole('heading', { level: 1, name: 'Results for “honey”' })).toBeVisible();
	await expect(main.locator('#product-sundarban-honey')).toBeVisible();
});

test('category page lists only that category', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('navigation', { name: 'Categories' }).getByRole('link', { name: 'Fashion' }).click();

	await expect(page).toHaveURL(/\/categories\/fashion$/);
	const main = page.getByRole('main');
	await expect(main.getByRole('heading', { level: 1, name: 'Fashion' })).toBeVisible();
	await expect(main.locator('#product-cotton-panjabi')).toBeVisible();
	await expect(main.locator('#product-smart-watch-s8')).toHaveCount(0);
});

test('product page shows details and a WhatsApp Order Now link', async ({ page }) => {
	await page.goto('/products/cotton-panjabi');
	const main = page.getByRole('main');
	await expect(main.getByRole('heading', { level: 1, name: 'Premium Cotton Panjabi' })).toBeVisible();
	await expect(main.getByText('Deshi Style', { exact: true })).toBeVisible();
	await expect(main.getByRole('heading', { name: 'How ordering works' })).toBeVisible();
	await expect(main.getByRole('link', { name: 'Order Now' }).first()).toHaveAttribute(
		'href',
		/^https:\/\/wa\.me\/8801811000002\?text=Hi%2C%20I%20want%20to%20order%20this%3A%20Premium%20Cotton%20Panjabi/,
	);
	await expect(main.getByRole('heading', { name: 'More in Fashion' })).toBeVisible();
});

test('dashboards send logged-out visitors to the login page', async ({ page }) => {
	await page.goto('/vendor/dashboard');
	await expect(page).toHaveURL(/\/vendor\/login$/);
	await page.goto('/admin/dashboard');
	await expect(page).toHaveURL(/\/admin\/login$/);
});

test('vendor logs in, adds a product with an image, and logs out', async ({ page }) => {
	const title = `E2E Product ${Date.now()}`;
	await logIn(page, '/vendor/login', E2E_VENDOR);

	await expect(page).toHaveURL(/\/vendor\/dashboard$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Ghor Sajao' })).toBeVisible();

	await page.getByRole('button', { name: 'Add product' }).first().click();
	const drawer = page.getByRole('dialog', { name: 'Add a product' });
	await drawer.getByLabel('Product name').fill(title);
	await drawer.locator('select[name="category"]').selectOption({ label: 'Kids & Toys' });
	await drawer.getByLabel('Price (BDT)').fill('199.50');
	await drawer.getByLabel('Product image').setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: PNG_1PX });
	await drawer.getByRole('button', { name: 'Save product' }).click();

	await expect(drawer).toBeHidden();
	await expect(page.getByRole('status')).toContainText(title);
	const item = page.getByRole('row').filter({ hasText: title });
	await expect(item).toContainText('199.5');
	await expect(item).toContainText('Kids & Toys');
	await expect(item.getByRole('img', { name: title })).toHaveAttribute('src', new RegExp(`^${E2E_API_URL}/api/uploads/`));

	await page.goto('/');
	await expect(page.locator('#cat-kids-toys').getByRole('link', { name: title, exact: true })).toBeVisible();

	await page.goto('/vendor/dashboard');
	await page.getByRole('button', { name: `Edit ${title}` }).click();
	const editor = page.getByRole('dialog', { name: 'Edit product' });
	await expect(editor.getByLabel('Product name')).toHaveValue(title);
	await editor.getByLabel('Price (BDT)').fill('249');
	await editor.getByRole('button', { name: 'Save changes' }).click();
	await expect(page.getByRole('status')).toContainText('was updated');
	await expect(page.getByRole('row').filter({ hasText: title })).toContainText('249.00');

	await page.getByRole('button', { name: `Delete ${title}` }).click();
	const confirm = page.getByRole('alertdialog', { name: 'Delete this product?' });
	await confirm.getByRole('button', { name: 'Cancel' }).click();
	await expect(page.getByRole('row').filter({ hasText: title })).toBeVisible();
	await page.getByRole('button', { name: `Delete ${title}` }).click();
	await confirm.getByRole('button', { name: 'Delete product' }).click();
	await expect(page.getByRole('status')).toContainText('was deleted');
	await expect(page.getByRole('row').filter({ hasText: title })).toHaveCount(0);

	await page.getByRole('button', { name: 'Log out' }).click();
	await expect(page).toHaveURL(/\/vendor\/login$/);
	await page.goto('/vendor/dashboard');
	await expect(page).toHaveURL(/\/vendor\/login$/);
});

test('one-click login opens each dashboard', async ({ page }) => {
	await page.goto('/admin/login');
	await page.getByRole('button', { name: 'One-click admin login' }).click();
	await expect(page).toHaveURL(/\/admin\/dashboard$/);

	await page.goto('/vendor/login');
	await page.getByRole('button', { name: 'One-click login as Gadget Haat' }).click();
	await expect(page).toHaveURL(/\/vendor\/dashboard$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Gadget Haat' })).toBeVisible();
	await page.getByRole('button', { name: 'Log out' }).click();
	await expect(page).toHaveURL(/\/vendor\/login$/);

	await page.goto('/vendor/login?mode=register');
	await page.getByRole('button', { name: 'One-click: create a demo shop' }).click();
	await expect(page).toHaveURL(/\/vendor\/dashboard$/);
	await expect(page.getByRole('heading', { level: 1, name: /^Demo Shop \d+$/ })).toBeVisible();
});

test('a new seller can register and land on their dashboard', async ({ page }) => {
	const email = `seller-${Date.now()}@e2e.local`;
	await page.goto('/vendor/login?mode=register');

	await page.getByLabel('Shop name').fill('E2E Bazaar');
	await page.getByLabel('WhatsApp number').fill('01712345678');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill('bazaar1234');
	await page.getByRole('button', { name: 'Create my shop' }).click();

	await expect(page).toHaveURL(/\/vendor\/dashboard$/);
	await expect(page.getByRole('heading', { level: 1, name: 'E2E Bazaar' })).toBeVisible();
});

test('admin login rejects a vendor and shows commission for the admin', async ({ page }) => {
	await logIn(page, '/admin/login', E2E_VENDOR);
	await expect(page.getByRole('alert')).toHaveText('This account is not an admin.');

	await logIn(page, '/admin/login', { email: E2E_ADMIN.email, password: 'wrong-password' });
	await expect(page.getByRole('alert')).toContainText(/invalid/i);

	await logIn(page, '/admin/login', E2E_ADMIN);
	await expect(page).toHaveURL(/\/admin\/dashboard$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Marketplace overview' })).toBeVisible();
	await expect(page.getByRole('columnheader', { name: 'Commission owed' })).toBeVisible();
	await expect(page.getByRole('row').filter({ hasText: 'Gadget Haat' })).toContainText('10%');
	await expect(page.getByRole('row').filter({ hasText: 'Deshi Style' })).toBeVisible();
});
