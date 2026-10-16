import { expect, test } from '@playwright/test';

// Going to a category and back must not move the page: no sideways jump when
// the scrollbar appears or disappears, and no animated scroll on Back.

const shortPage = '/categories/fashion';

async function pageStyle(page: import('@playwright/test').Page) {
	return page.evaluate(() => {
		const html = getComputedStyle(document.documentElement);
		return { gutter: html.scrollbarGutter, scrollBehavior: html.scrollBehavior };
	});
}

test('the scrollbar always keeps its space, so pages never shift sideways', async ({ page }) => {
	for (const path of ['/', shortPage, '/products/cotton-panjabi', '/search?q=honey']) {
		await page.goto(path);
		expect((await pageStyle(page)).gutter, path).toBe('stable');
	}
});

test('Back from a category paints the page only at the saved scroll position, every time', async ({ page }) => {
	// Record scrollY for every frame the visitor can actually see, from the very first one.
	await page.addInitScript(() => {
		const frames: number[] = [];
		(window as unknown as { __visibleFrames: number[] }).__visibleFrames = frames;
		const tick = () => {
			if (getComputedStyle(document.documentElement).visibility !== 'hidden' && document.body) frames.push(Math.round(scrollY));
			if (frames.length < 40) requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});
	const visibleFrames = async () => {
		await expect.poll(() => page.evaluate(() => (window as unknown as { __visibleFrames: number[] }).__visibleFrames.length)).toBeGreaterThan(30);
		return page.evaluate(() => (window as unknown as { __visibleFrames: number[] }).__visibleFrames);
	};

	await page.goto('/');
	expect((await pageStyle(page)).scrollBehavior).toBe('auto');
	await page.evaluate(() => scrollTo(0, 1500));
	await expect.poll(() => page.evaluate(() => Math.round(scrollY))).toBe(1500);

	// Several round trips: an error of a few pixels per trip would add up.
	for (const category of ['Fashion', 'Electronics', 'Groceries']) {
		await page.getByRole('navigation', { name: 'Categories' }).getByRole('link', { name: category, exact: true }).click();
		await expect(page).toHaveURL(/categories/);
		await page.goBack({ waitUntil: 'commit' });
		await expect(page).toHaveURL(/\/$/);
		const frames = await visibleFrames();
		expect(frames.filter((y) => Math.abs(y - 1500) > 1), `${category}: visible frames ${frames.join(',')}`).toEqual([]);
	}
});

test('a normal visit starts at the top and is never hidden', async ({ page }) => {
	await page.goto('/categories/fashion');
	await page.goto('/');
	expect(await page.evaluate(() => [Math.round(scrollY), getComputedStyle(document.documentElement).visibility])).toEqual([0, 'visible']);
});

test('in-page links like "Shop now" still scroll smoothly', async ({ page }) => {
	await page.goto('/');
	const link = page.getByRole('link', { name: /shop now/i }).first();
	await link.focus();
	expect((await pageStyle(page)).scrollBehavior).toBe('smooth');
});
