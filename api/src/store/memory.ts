import { randomUUID } from 'node:crypto';
import { commissionFor } from './commission.js';
import {
	STANDARD_COMMISSION_BPS,
	type CategorySlug,
	type OrderIntent,
	type Product,
	type ProductWithVendor,
	type Vendor,
	type VendorCommissionSummary,
} from './types.js';

export interface NewProduct {
	vendorId: string;
	title: string;
	description: string;
	category: CategorySlug;
	priceMinor: number;
	imageUrl: string | null;
}

export interface ProductFilter {
	vendorId?: string;
	category?: CategorySlug;
	/** Case-insensitive match on title, description, or shop name. */
	q?: string;
}

/**
 * In-memory data store. Replaced by Prisma in phase C; keep the method
 * signatures so routes do not change. Order intents only expose append + read.
 */
export class MemoryStore {
	readonly #vendors = new Map<string, Vendor>();
	readonly #products = new Map<string, Product>();
	readonly #orderIntents: OrderIntent[] = [];

	addVendor(input: Pick<Vendor, 'name' | 'phone'> & { id?: string; commissionBps?: number }): Vendor {
		const vendor: Vendor = {
			id: input.id ?? randomUUID(),
			name: input.name,
			phone: input.phone,
			commissionBps: input.commissionBps ?? STANDARD_COMMISSION_BPS,
			createdAt: new Date().toISOString(),
		};
		this.#vendors.set(vendor.id, vendor);
		return vendor;
	}

	getVendor(id: string): Vendor | undefined {
		return this.#vendors.get(id);
	}

	listVendors(): Vendor[] {
		return [...this.#vendors.values()];
	}

	addProduct(input: NewProduct & { id?: string }): Product {
		const product: Product = {
			id: input.id ?? randomUUID(),
			vendorId: input.vendorId,
			title: input.title,
			description: input.description,
			category: input.category,
			priceMinor: input.priceMinor,
			imageUrl: input.imageUrl,
			createdAt: new Date().toISOString(),
		};
		this.#products.set(product.id, product);
		return product;
	}

	getProduct(id: string): ProductWithVendor | undefined {
		const product = this.#products.get(id);
		return product ? this.#withVendor(product) : undefined;
	}

	listProducts(filter: ProductFilter = {}): ProductWithVendor[] {
		const q = filter.q?.trim().toLowerCase();
		return [...this.#products.values()]
			.filter((product) => !filter.vendorId || product.vendorId === filter.vendorId)
			.filter((product) => !filter.category || product.category === filter.category)
			.map((product) => this.#withVendor(product))
			.filter(
				(product) =>
					!q ||
					[product.title, product.description, product.vendor.name].some((text) => text.toLowerCase().includes(q)),
			);
	}

	recordOrderIntent(productId: string): OrderIntent | undefined {
		const product = this.#products.get(productId);
		if (!product) return undefined;
		const vendor = this.#vendors.get(product.vendorId);
		if (!vendor) return undefined;

		const intent: OrderIntent = Object.freeze({
			id: randomUUID(),
			productId: product.id,
			vendorId: vendor.id,
			priceMinor: product.priceMinor,
			commissionBps: vendor.commissionBps,
			commissionMinor: commissionFor(product.priceMinor, vendor.commissionBps),
			createdAt: new Date().toISOString(),
		});
		this.#orderIntents.push(intent);
		return intent;
	}

	listOrderIntents(): readonly OrderIntent[] {
		return [...this.#orderIntents];
	}

	commissionSummary(): VendorCommissionSummary[] {
		return this.listVendors().map((vendor) => {
			const intents = this.#orderIntents.filter((intent) => intent.vendorId === vendor.id);
			return {
				vendor,
				productCount: [...this.#products.values()].filter((p) => p.vendorId === vendor.id).length,
				orderIntentCount: intents.length,
				grossMinor: intents.reduce((sum, intent) => sum + intent.priceMinor, 0),
				commissionOwedMinor: intents.reduce((sum, intent) => sum + intent.commissionMinor, 0),
			};
		});
	}

	#withVendor(product: Product): ProductWithVendor {
		const vendor = this.#vendors.get(product.vendorId);
		if (!vendor) throw new Error(`Product ${product.id} has unknown vendor ${product.vendorId}`);
		return { ...product, vendor: { id: vendor.id, name: vendor.name, phone: vendor.phone } };
	}
}
