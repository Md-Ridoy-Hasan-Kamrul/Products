import { randomUUID } from 'node:crypto';
import { commissionFor } from './commission.js';
import { totalsOf } from './stats.js';
import {
	STANDARD_COMMISSION_BPS,
	type CategorySlug,
	type OrderIntent,
	type Product,
	type ProductWithVendor,
	type Vendor,
	type VendorCommissionSummary,
	type VendorStatus,
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

export type VendorChanges = Partial<Pick<Vendor, 'name' | 'phone' | 'commissionBps' | 'status'>>;

export interface ProductFilter {
	vendorId?: string;
	/** Include products of pending or suspended shops (vendor and admin views). */
	includeHidden?: boolean;
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
	/** Same rows as #orderIntents, indexed by vendor so per-vendor reads skip the full ledger. */
	readonly #intentsByVendor = new Map<string, OrderIntent[]>();

	addVendor(
		input: Pick<Vendor, 'name' | 'phone'> & { id?: string; commissionBps?: number; status?: VendorStatus },
	): Vendor {
		const vendor: Vendor = {
			id: input.id ?? randomUUID(),
			name: input.name,
			phone: input.phone,
			commissionBps: input.commissionBps ?? STANDARD_COMMISSION_BPS,
			status: input.status ?? 'active',
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

	/** A new rate applies to future order intents only; past intents keep their snapshot. */
	updateVendor(id: string, changes: VendorChanges): Vendor | undefined {
		const vendor = this.#vendors.get(id);
		if (!vendor) return undefined;
		Object.assign(vendor, changes);
		return vendor;
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

	/** What buyers can see: not deleted, and the shop is active. */
	getProduct(id: string): ProductWithVendor | undefined {
		const product = this.#products.get(id);
		if (!product || product.deletedAt || !this.#isPublic(product)) return undefined;
		return this.#withVendor(product);
	}

	/** A vendor's own live product, whatever the shop status. */
	getVendorProduct(id: string, vendorId: string): ProductWithVendor | undefined {
		const product = this.#liveProductOf(id, vendorId);
		return product && this.#withVendor(product);
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
			.filter((product) => filter.includeHidden || this.#isPublic(product))
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
		if (!product || product.deletedAt || !this.#isPublic(product)) return undefined;
		const vendor = this.#vendors.get(product.vendorId)!;

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
		const byVendor = this.#intentsByVendor.get(vendor.id);
		if (byVendor) byVendor.push(intent);
		else this.#intentsByVendor.set(vendor.id, [intent]);
		return intent;
	}

	/** Oldest first. Read-only view of the append-only ledger, optionally for one vendor. */
	listOrderIntents({ vendorId }: { vendorId?: string } = {}): readonly OrderIntent[] {
		return vendorId ? (this.#intentsByVendor.get(vendorId) ?? []) : this.#orderIntents;
	}

	/** Title of any product, deleted or not, for labelling ledger rows. */
	productTitle(id: string): string | null {
		return this.#products.get(id)?.title ?? null;
	}

	commissionSummary(): VendorCommissionSummary[] {
		const productCounts = new Map<string, number>();
		for (const product of this.#liveProducts()) {
			productCounts.set(product.vendorId, (productCounts.get(product.vendorId) ?? 0) + 1);
		}
		return this.listVendors().map((vendor) => {
			const totals = totalsOf(this.listOrderIntents({ vendorId: vendor.id }));
			return {
				vendor,
				productCount: productCounts.get(vendor.id) ?? 0,
				orderIntentCount: totals.orderIntents,
				grossMinor: totals.grossMinor,
				commissionOwedMinor: totals.commissionOwedMinor,
			};
		});
	}

	#isPublic(product: StoredProduct): boolean {
		return this.#vendors.get(product.vendorId)?.status === 'active';
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
		return {
			...this.#public(product),
			vendor: { id: vendor.id, name: vendor.name, phone: vendor.phone, status: vendor.status },
		};
	}
}
