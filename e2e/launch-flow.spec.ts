import { expect, test, type Browser, type Page } from '@playwright/test';
import { E2E_ADMIN } from './env';

// The e2e API runs with VENDOR_APPROVAL=manual (see playwright.config.ts).

async function adminPage(browser: Browser): Promise<Page> {
	const page = await (await browser.newContext()).newPage();
	await page.goto('/admin/login');
	await page.getByLabel('Email').fill(E2E_ADMIN.email);
	await page.getByLabel('Password').fill(E2E_ADMIN.password);
	await page.getByRole('button', { name: 'Log in' }).click();
	await expect(page).toHaveURL(/\/admin\/dashboard$/);
	return page;
}

async function setShopStatus(admin: Page, shop: string, action: 'Approve' | 'Pause' | 'Reactivate') {
	await admin.goto('/admin/dashboard#vendors');
	await admin.getByLabel('Search by name or phone').fill(shop);
	await admin.getByRole('row').filter({ hasText: shop }).getByRole('button', { name: `Manage ${shop}` }).click();
	const dialog = admin.getByRole('dialog', { name: shop });
	await dialog.getByRole('button', { name: action }).click();
	await expect(dialog).toBeHidden();
}

test('a new seller goes from sign-up to a live product the buyer can order', async ({ page, browser }) => {
	const stamp = Date.now();
	const shop = `Launch Shop ${stamp}`;
	const title = `Launch Lamp ${stamp}`;

	// 1. Seller signs up and is told the shop is in review.
	await page.goto('/vendor/login?mode=register');
	await page.getByLabel('Shop name').fill(shop);
	await page.getByLabel('WhatsApp number').fill(`0171${String(stamp).slice(-7)}`);
	await page.getByLabel('Email').fill(`launch-${stamp}@e2e.local`);
	await page.getByLabel('Password').fill('launch1234');
	await page.getByRole('button', { name: 'Create my shop' }).click();
	await expect(page).toHaveURL(/\/vendor\/dashboard$/);
	await expect(page.getByRole('note')).toContainText(/in review/i);
	await expect(page.getByRole('list', { name: 'Getting started' })).toBeVisible();

	// 2. Seller adds a product while waiting; it is saved but hidden.
	await page.getByRole('button', { name: 'Add product' }).first().click();
	const drawer = page.getByRole('dialog', { name: 'Add a product' });
	await drawer.getByLabel('Product name').fill(title);
	await drawer.getByLabel('Price (BDT)').fill('950');
	await drawer.getByRole('button', { name: 'Save product' }).click();
	const item = page.getByRole('row').filter({ hasText: title });
	await expect(item).toContainText('In review');
	const productUrl = await item.getByRole('link', { name: title }).getAttribute('href');
	expect(productUrl).toMatch(/^\/products\//);

	// Buyers cannot see it yet.
	expect((await page.request.get(productUrl!)).status()).toBe(404);

	// 3. Seller updates the shop profile.
	await page.goto('/vendor/dashboard#shop');
	await page.getByLabel('Shop name').fill(`${shop} BD`);
	await page.getByRole('button', { name: 'Save shop details' }).click();
	await expect(page.getByRole('status')).toContainText('Shop details saved');

	// 4. Admin approves the shop from the vendors list.
	const admin = await adminPage(browser);
	await expect(admin.getByRole('region', { name: 'Needs your approval' })).toContainText(`${shop} BD`);
	await setShopStatus(admin, `${shop} BD`, 'Approve');

	// 5. The product page is live, with Order Now pointing at the new number.
	const buyer = await (await browser.newContext()).newPage();
	await buyer.goto(productUrl!);
	await expect(buyer.getByRole('heading', { level: 1, name: title })).toBeVisible();
	await expect(buyer.getByText(`${shop} BD`, { exact: true })).toBeVisible();
	await expect(buyer.getByRole('link', { name: 'Order Now' }).first()).toHaveAttribute('href', /^https:\/\/wa\.me\/8801/);
	await buyer.goto('/categories/electronics');
	await expect(buyer.getByRole('link', { name: title, exact: true })).toBeVisible();

	// The seller sees it as live and can copy the link.
	await page.goto('/vendor/dashboard#products');
	await page.reload();
	await expect(page.getByRole('row').filter({ hasText: title })).toContainText('Live');
	await expect(page.getByRole('note')).toHaveCount(0);

	// 6. Admin pauses the shop; buyers lose the page, the seller is told why.
	await setShopStatus(admin, `${shop} BD`, 'Pause');
	expect((await buyer.request.get(productUrl!)).status()).toBe(404);
	await page.reload();
	await expect(page.getByRole('note')).toContainText(/paused/i);
});
