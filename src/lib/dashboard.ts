import { BPS_PER_PERCENT, MAX_COMMISSION_PERCENT } from './constants';
import type { OrderIntentRow, Product, VendorStatus } from './types';
import { productPath } from './whatsapp';

/* ---------- Shop status ---------- */

export interface ShopVisibility {
	/** Buyers can see the shop's products and order them. */
	visible: boolean;
	label: string;
	tone: 'success' | 'warning' | 'danger';
	/** Shown to the vendor when their shop is hidden; null when live. */
	vendorMessage: string | null;
}

const VISIBILITY: Record<VendorStatus, ShopVisibility> = {
	active: { visible: true, label: 'Live', tone: 'success', vendorMessage: null },
	pending: {
		visible: false,
		label: 'In review',
		tone: 'warning',
		vendorMessage:
			'Your shop is in review. Add your products now; buyers will see them as soon as an admin approves your shop.',
	},
	suspended: {
		visible: false,
		label: 'Paused',
		tone: 'danger',
		vendorMessage: 'Your shop is paused by the admin, so buyers cannot see your products. Contact support to reactivate it.',
	},
};

export function shopVisibility(status: VendorStatus): ShopVisibility {
	return VISIBILITY[status];
}

export interface AdminAction {
	status: VendorStatus;
	label: string;
	tone: 'primary' | 'danger';
	/** What happened, after "<shop name> was …". */
	result: string;
}

const APPROVE: AdminAction = { status: 'active', label: 'Approve', tone: 'primary', result: 'approved. Its products are live.' };
const PAUSE: AdminAction = { status: 'suspended', label: 'Pause', tone: 'danger', result: 'paused. Its products are hidden from buyers.' };
const REACTIVATE: AdminAction = {
	status: 'active',
	label: 'Reactivate',
	tone: 'primary',
	result: 'reactivated. Its products are live again.',
};

const ACTIONS: Record<VendorStatus, AdminAction[]> = {
	pending: [APPROVE, PAUSE],
	active: [PAUSE],
	suspended: [REACTIVATE],
};

/** Status changes an admin can make from `status`. */
export function adminActionsFor(status: VendorStatus): AdminAction[] {
	return ACTIONS[status];
}

/* ---------- Filters ---------- */

const normalize = (text: string) => text.trim().toLowerCase();

export interface ProductFilter {
	query?: string;
	category?: string;
	vendorId?: string;
}

/** Title or shop name match; empty filters match everything. */
export function filterProducts<T extends Product>(products: readonly T[], filter: ProductFilter): T[] {
	const q = normalize(filter.query ?? '');
	return products.filter(
		(p) =>
			(!filter.category || p.category === filter.category) &&
			(!filter.vendorId || p.vendorId === filter.vendorId) &&
			(!q || normalize(p.title).includes(q) || normalize(p.vendor.name).includes(q)),
	);
}

export interface IntentFilter {
	query?: string;
	vendorId?: string;
}

export function filterIntents(intents: readonly OrderIntentRow[], filter: IntentFilter): OrderIntentRow[] {
	const q = normalize(filter.query ?? '');
	return intents.filter(
		(i) => (!filter.vendorId || i.vendorId === filter.vendorId) && (!q || normalize(i.productTitle ?? i.productId).includes(q)),
	);
}

/* ---------- Onboarding ---------- */

export interface OnboardingStep {
	id: 'shop' | 'product' | 'share';
	label: string;
	hint: string;
	done: boolean;
}

export function onboardingSteps(progress: { status: VendorStatus; productCount: number; orderIntentCount: number }): OnboardingStep[] {
	return [
		{ id: 'shop', label: 'Shop approved', hint: 'An admin reviews new shops, usually within a day.', done: progress.status === 'active' },
		{ id: 'product', label: 'Add your first product', hint: 'Name, price, and a clear photo.', done: progress.productCount > 0 },
		{
			id: 'share',
			label: 'Get your first order',
			hint: 'Copy a product link and share it on Facebook or WhatsApp.',
			done: progress.orderIntentCount > 0,
		},
	];
}

/* ---------- Inputs ---------- */

/** "7.5" → 750. Null unless 0 to 100 with at most two decimals. */
export function percentInputToBps(input: string): number | null {
	const text = input.trim();
	if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
	const percent = Number(text);
	return percent > MAX_COMMISSION_PERCENT ? null : Math.round(percent * BPS_PER_PERCENT);
}

export function bpsToPercentInput(bps: number): string {
	return String(bps / BPS_PER_PERCENT);
}

/** Same rule as the API: returns 8801XXXXXXXXX or null. */
export function normalizeBdPhone(input: string): string | null {
	const digits = input.replace(/\D/g, '').replace(/^0(?=1)/, '880');
	return /^8801[3-9]\d{8}$/.test(digits) ? digits : null;
}

const BD_COUNTRY_CODE = '880';

/** 8801711000001 → 01711000001, the local format people type. */
export function toLocalBdPhone(phone: string): string {
	return phone.startsWith(BD_COUNTRY_CODE) ? `0${phone.slice(BD_COUNTRY_CODE.length)}` : phone;
}

export function productShareUrl(origin: string, productId: string): string {
	return new URL(productPath(productId), origin).href;
}
