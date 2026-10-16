import { useCallback } from 'react';
import { apiFetch } from '../../../lib/api';
import type { AdminSummary, Vendor, VendorStatus } from '../../../lib/types';
import { useApi, type ApiState } from './useApi';
import { useRefreshOnFocus } from './useRefreshOnFocus';

export interface VendorChanges {
	status?: VendorStatus;
	commissionBps?: number;
}

export interface AdminWorkspace {
	summary: ApiState<AdminSummary>;
	/** Saves, then refreshes the summary so every section agrees. */
	updateVendor: (vendorId: string, changes: VendorChanges) => Promise<Vendor>;
}

export function useAdminWorkspace(): AdminWorkspace {
	const summary = useApi<AdminSummary>('/api/admin/summary');
	const { reload } = summary;
	useRefreshOnFocus(reload);

	const updateVendor = useCallback(
		async (vendorId: string, changes: VendorChanges) => {
			const { vendor } = await apiFetch<{ vendor: Vendor }>(`/api/admin/vendors/${encodeURIComponent(vendorId)}`, {
				method: 'PATCH',
				body: JSON.stringify(changes),
			});
			reload();
			return vendor;
		},
		[reload],
	);

	return { summary, updateVendor };
}
