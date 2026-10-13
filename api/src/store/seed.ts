import { createCredentialUser, type Auth } from '../auth.js';
import type { Env } from '../env.js';
import { MemoryStore } from './memory.js';
import type { CategorySlug } from './types.js';

/** Demo vendor logins, one per seeded shop. */
export const DEMO_VENDOR_PASSWORD = 'vendor12345';
export const DEMO_VENDOR_LOGINS = [
	{ vendorId: 'vendor-gadget-haat', email: 'gadget@ypyd.local' },
	{ vendorId: 'vendor-deshi-style', email: 'deshi@ypyd.local' },
	{ vendorId: 'vendor-ghor-sajao', email: 'ghor@ypyd.local' },
];

export async function seedUsers(auth: Auth, store: MemoryStore, env: Env): Promise<void> {
	await createCredentialUser(auth, {
		email: env.ADMIN_EMAIL,
		password: env.ADMIN_PASSWORD,
		name: 'Admin',
		role: 'admin',
	});
	if (env.NODE_ENV === 'production') return;
	for (const login of DEMO_VENDOR_LOGINS) {
		const vendor = store.getVendor(login.vendorId);
		if (!vendor) continue;
		await createCredentialUser(auth, {
			email: login.email,
			password: DEMO_VENDOR_PASSWORD,
			name: vendor.name,
			role: 'vendor',
			vendorId: vendor.id,
		});
	}
}

interface SeedProduct {
	id: string;
	vendorId: string;
	title: string;
	description: string;
	category: CategorySlug;
	priceMinor: number;
}

export function createSeededStore(): MemoryStore {
	const store = new MemoryStore();

	const gadget = store.addVendor({ id: 'vendor-gadget-haat', name: 'Gadget Haat', phone: '8801711000001' });
	const deshi = store.addVendor({ id: 'vendor-deshi-style', name: 'Deshi Style', phone: '8801811000002' });
	const ghor = store.addVendor({ id: 'vendor-ghor-sajao', name: 'Ghor Sajao', phone: '8801911000003' });

	const products: SeedProduct[] = [
		{
			id: 'wireless-earbuds-pro',
			vendorId: gadget.id,
			title: 'Wireless Earbuds Pro with Noise Cancelling',
			description: 'Bluetooth 5.3, 30 hours battery with case, touch controls.',
			category: 'electronics',
			priceMinor: 249_000,
		},
		{
			id: 'smart-watch-s8',
			vendorId: gadget.id,
			title: 'Smart Watch S8, 1.9" Display',
			description: 'Heart rate, sleep tracking, call alerts. Works with Android and iPhone.',
			category: 'electronics',
			priceMinor: 189_900,
		},
		{
			id: 'power-bank-20000',
			vendorId: gadget.id,
			title: '20000mAh Fast Charging Power Bank',
			description: '22.5W fast charge, two USB-A ports and one USB-C.',
			category: 'electronics',
			priceMinor: 165_000,
		},
		{
			id: 'cotton-panjabi',
			vendorId: deshi.id,
			title: 'Premium Cotton Panjabi',
			description: 'Soft breathable cotton, sizes M to XXL.',
			category: 'fashion',
			priceMinor: 145_000,
		},
		{
			id: 'jamdani-saree',
			vendorId: deshi.id,
			title: 'Handwoven Jamdani Saree',
			description: 'Traditional Dhakai Jamdani with blouse piece.',
			category: 'fashion',
			priceMinor: 650_000,
		},
		{
			id: 'leather-sneakers',
			vendorId: deshi.id,
			title: 'Men’s Leather Sneakers',
			description: 'Genuine leather upper, cushioned sole. Sizes 39 to 44.',
			category: 'fashion',
			priceMinor: 289_000,
		},
		{
			id: 'nakshi-kantha-cushion',
			vendorId: ghor.id,
			title: 'Nakshi Kantha Cushion Cover (Set of 2)',
			description: 'Hand-stitched kantha work, 16×16 inch.',
			category: 'home-living',
			priceMinor: 85_000,
		},
		{
			id: 'non-stick-fry-pan',
			vendorId: ghor.id,
			title: 'Non-stick Fry Pan, 26 cm',
			description: 'PFOA-free coating, works on gas and induction.',
			category: 'home-living',
			priceMinor: 120_000,
		},
		{
			id: 'aloe-vera-gel',
			vendorId: ghor.id,
			title: 'Pure Aloe Vera Soothing Gel 300ml',
			description: 'For face, body, and hair. No added fragrance.',
			category: 'beauty-health',
			priceMinor: 45_000,
		},
		{
			id: 'sundarban-honey',
			vendorId: ghor.id,
			title: 'Sundarban Natural Honey 500g',
			description: 'Raw mangrove honey collected in season.',
			category: 'groceries',
			priceMinor: 75_000,
		},
		{
			id: 'building-blocks-kit',
			vendorId: gadget.id,
			title: 'Building Blocks Kit, 520 Pieces',
			description: 'For ages 6+, compatible with major brick brands.',
			category: 'kids-toys',
			priceMinor: 135_000,
		},
		{
			id: 'cricket-bat-kashmir',
			vendorId: deshi.id,
			title: 'Kashmir Willow Cricket Bat',
			description: 'Full size, with cover. Good for tape and tennis ball.',
			category: 'sports-outdoor',
			priceMinor: 220_000,
		},
		{
			id: 'leather-notebook',
			vendorId: ghor.id,
			title: 'Leather Cover Notebook A5',
			description: '200 pages, refillable, with pen loop.',
			category: 'books-stationery',
			priceMinor: 55_000,
		},
	];

	for (const product of products) {
		store.addProduct({ ...product, imageUrl: null });
	}

	return store;
}
