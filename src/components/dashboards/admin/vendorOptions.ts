import type { VendorCommissionSummary } from '../../../lib/types';

/** Options for a "Vendor" filter: all vendors, then each shop by name. */
export function vendorOptions(vendors: readonly VendorCommissionSummary[] | null | undefined) {
	return [{ value: '', label: 'All vendors' }, ...(vendors ?? []).map((r) => ({ value: r.vendor.id, label: r.vendor.name }))];
}
