import { describe, expect, test } from 'vitest';
import {
	adminActionsFor,
	bpsToPercentInput,
	filterIntents,
	filterProducts,
	normalizeBdPhone,
	onboardingSteps,
	percentInputToBps,
	productShareUrl,
	shopVisibility,
	toLocalBdPhone,
} from './dashboard';
import type { OrderIntentRow, Product } from './types';

const vendor = { id: 'v1', name: 'Gadget Haat', phone: '8801711000001', status: 'active' as const };

function product(id: string, title: string, category = 'electronics', vendorName = vendor.name): Product {
	return {
		id,
		vendorId: vendor.id,
		title,
		description: '',
		category,
		priceMinor: 10_000,
		imageUrl: null,
		createdAt: '',
		updatedAt: '',
		vendor: { ...vendor, name: vendorName },
	};
}

function intent(id: string, productTitle: string | null, vendorId = 'v1'): OrderIntentRow {
	return {
		id,
		productId: id,
		productTitle,
		vendorId,
		vendorName: null,
		priceMinor: 10_000,
		commissionBps: 1000,
		commissionMinor: 1_000,
		createdAt: '',
	};
}

describe('shopVisibility', () => {
	test('only an active shop is visible to buyers', () => {
		expect(shopVisibility('active')).toMatchObject({ visible: true, label: 'Live' });
		expect(shopVisibility('pending')).toMatchObject({ visible: false, label: 'In review' });
		expect(shopVisibility('suspended')).toMatchObject({ visible: false, label: 'Paused' });
	});

	test('explains a hidden shop to its vendor', () => {
		expect(shopVisibility('active').vendorMessage).toBeNull();
		expect(shopVisibility('pending').vendorMessage).toMatch(/review/i);
		expect(shopVisibility('suspended').vendorMessage).toMatch(/paused/i);
	});
});

describe('adminActionsFor', () => {
	test('offers the next sensible status changes', () => {
		expect(adminActionsFor('pending').map((a) => a.status)).toEqual(['active', 'suspended']);
		expect(adminActionsFor('active').map((a) => a.status)).toEqual(['suspended']);
		expect(adminActionsFor('suspended').map((a) => a.status)).toEqual(['active']);
		expect(adminActionsFor('pending')[0]!.label).toBe('Approve');
		expect(adminActionsFor('suspended')[0]!.label).toBe('Reactivate');
	});
});

describe('filterProducts', () => {
	const list = [product('a', 'Smart Watch'), product('b', 'Cotton Panjabi', 'fashion', 'Deshi Style'), product('c', 'Power Bank')];

	test('matches title or shop name, case-insensitively, and ignores spaces', () => {
		expect(filterProducts(list, { query: '  WATCH ' }).map((p) => p.id)).toEqual(['a']);
		expect(filterProducts(list, { query: 'deshi' }).map((p) => p.id)).toEqual(['b']);
	});

	test('narrows by category and vendor, and returns everything with no filters', () => {
		expect(filterProducts(list, { category: 'electronics' }).map((p) => p.id)).toEqual(['a', 'c']);
		expect(filterProducts(list, { vendorId: 'other' })).toEqual([]);
		expect(filterProducts(list, {})).toHaveLength(3);
	});
});

describe('filterIntents', () => {
	test('matches product title or id, and vendor', () => {
		const rows = [intent('a', 'Smart Watch'), intent('old-item-7', null, 'v2'), intent('c', 'Power Bank', 'v2')];
		expect(filterIntents(rows, { query: 'watch' }).map((i) => i.id)).toEqual(['a']);
		expect(filterIntents(rows, { query: 'old-item' }).map((i) => i.id)).toEqual(['old-item-7']);
		expect(filterIntents(rows, { vendorId: 'v2' }).map((i) => i.id)).toEqual(['old-item-7', 'c']);
	});
});

describe('onboardingSteps', () => {
	test('walks a new shop from approval to first order', () => {
		const steps = onboardingSteps({ status: 'pending', productCount: 0, orderIntentCount: 0 });
		expect(steps.map((s) => [s.id, s.done])).toEqual([
			['shop', false],
			['product', false],
			['share', false],
		]);
	});

	test('is complete once the shop is live with a product and an order intent', () => {
		const steps = onboardingSteps({ status: 'active', productCount: 2, orderIntentCount: 1 });
		expect(steps.every((s) => s.done)).toBe(true);
	});
});

describe('commission rate input', () => {
	test('converts percent text to basis points', () => {
		expect(percentInputToBps('10')).toBe(1000);
		expect(percentInputToBps('7.5')).toBe(750);
		expect(percentInputToBps(' 0 ')).toBe(0);
	});

	test('rejects anything that is not 0 to 100 with at most two decimals', () => {
		for (const bad of ['', 'abc', '-1', '100.01', '1.234', '1e2']) expect(percentInputToBps(bad)).toBeNull();
	});

	test('formats basis points back for the input', () => {
		expect(bpsToPercentInput(750)).toBe('7.5');
		expect(bpsToPercentInput(1000)).toBe('10');
	});
});

describe('normalizeBdPhone', () => {
	test('accepts local, international, and formatted numbers', () => {
		expect(normalizeBdPhone('01711000001')).toBe('8801711000001');
		expect(normalizeBdPhone('+880 1711-000001')).toBe('8801711000001');
		expect(normalizeBdPhone('8801911000003')).toBe('8801911000003');
	});

	test('rejects numbers that are not Bangladeshi mobiles', () => {
		for (const bad of ['12345', '01211000001', '017110000011', '']) expect(normalizeBdPhone(bad)).toBeNull();
	});
});

test('toLocalBdPhone turns the stored number back into the local format', () => {
	expect(toLocalBdPhone('8801711000001')).toBe('01711000001');
	expect(normalizeBdPhone(toLocalBdPhone('8801911000003'))).toBe('8801911000003');
});

test('every admin action says what it did', () => {
	for (const status of ['pending', 'active', 'suspended'] as const) {
		for (const action of adminActionsFor(status)) expect(action.result).toMatch(/\.$/);
	}
});

test('productShareUrl builds the public product link', () => {
	expect(productShareUrl('https://shop.example', 'smart-watch')).toBe('https://shop.example/products/smart-watch');
});
