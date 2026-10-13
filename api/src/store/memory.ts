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

export type ProductChanges = Partial<Omit<NewProduct, 'vendorId'>>;

export interface ProductFilter {
	vendorId?: string;
	category?: CategorySlug;
	/** Case-insensitive match on title, description, or shop name. */
	q?: string;
}

interface StoredProduct extends Product {
	/** Soft delete: order intents keep pointing at the product, so it is never removed. */
	deletedAt: string | null;
}

/**
 * In-memory data store. Replaced by Prisma in phase C; keep the method
 * signatures so routes do not change. Order intents only expose append + read.
 */
export class MemoryStore {
	readonly #vendors = new Map<string, Vendor>();
	readonly #products = new Map<string, StoredProduct>();
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
		const now = new Date().toISOString();
		const product: StoredProduct = {
			id: input.id ?? randomUUID(),
			vendorId: input.vendorId,
			title: input.title,
			description: input.description,
			category: input.category,
			priceMinor: input.priceMinor,
			imageUrl: input.imageUrl,
			createdAt: now,
			updatedAt: now,
			deletedAt: null,
		};
		this.#products.set(product.id, product);
		return this.#public(product);
	}

	/** Live products only, unless `includeDeleted` (used to label old order intents). */
	getProduct(id: string, { includeDeleted = false } = {}): ProductWithVendor | undefined {
		const product = this.#products.get(id);
		if (!product || (product.deletedAt && !includeDeleted)) return undefined;
		return this.#withVendor(product);
	}

	/** Returns undefined when the product is missing, deleted, or owned by another vendor. */
	updateProduct(id: string, vendorId: string, changes: ProductChanges): ProductWithVendor | undefined {
		const product = this.#liveProductOf(id, vendorId);
		if (!product) return undefined;
		Object.assign(product, changes, { updatedAt: new Date().toISOString() });
		return this.#withVendor(product);
	}

	deleteProduct(id: string, vendorId: string): boolean {
		const product = this.#liveProductOf(id, vendorId);
		if (!product) return false;
		product.deletedAt = new Date().toISOString();
		return true;
	}

	listProducts(filter: ProductFilter = {}): ProductWithVendor[] {
		const q = filter.q?.trim().toLowerCase();
		return this.#liveProducts()
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
		if (!product || product.deletedAt) return undefined;
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
		const live = this.#liveProducts();
		return this.listVendors().map((vendor) => {
			const intents = this.#orderIntents.filter((intent) => intent.vendorId === vendor.id);
			return {
				vendor,
				productCount: live.filter((p) => p.vendorId === vendor.id).length,
				orderIntentCount: intents.length,
				grossMinor: intents.reduce((sum, intent) => sum + intent.priceMinor, 0),
				commissionOwedMinor: intents.reduce((sum, intent) => sum + intent.commissionMinor, 0),
			};
		});
	}

	#liveProducts(): StoredProduct[] {
		return [...this.#products.values()].filter((product) => !product.deletedAt);
	}

	#liveProductOf(id: string, vendorId: string): StoredProduct | undefined {
		const product = this.#products.get(id);
		return product && !product.deletedAt && product.vendorId === vendorId ? product : undefined;
	}

	#public({ deletedAt: _deletedAt, ...product }: StoredProduct): Product {
		return product;
	}

	#withVendor(product: StoredProduct): ProductWithVendor {
		const vendor = this.#vendors.get(product.vendorId);
		if (!vendor) throw new Error(`Product ${product.id} has unknown vendor ${product.vendorId}`);
		return { ...this.#public(product), vendor: { id: vendor.id, name: vendor.name, phone: vendor.phone } };
	}
}
