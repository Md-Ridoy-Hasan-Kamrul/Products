import { Inbox } from 'lucide-react';
import { formatBdt, formatDateTime, formatPercent } from '../../lib/format';
import type { OrderIntentRow } from '../../lib/types';
import { EmptyState, TableSkeleton, row, table, tbody, td, th } from './ui';

/** Ledger rows, newest first. `null` while loading. */
export default function IntentTable({ intents, showVendor = false }: { intents: OrderIntentRow[] | null; showVendor?: boolean }) {
	if (!intents) return <TableSkeleton />;
	if (intents.length === 0) {
		return <EmptyState icon={Inbox} title="No order intents yet" text="They appear here when buyers tap Order Now." />;
	}
	return (
		<div className="overflow-x-auto">
			<table className={table}>
				<thead>
					<tr>
						<th className={th}>Product</th>
						{showVendor && <th className={th}>Vendor</th>}
						<th className={`${th} text-right`}>Price</th>
						<th className={`${th} text-right`}>Rate</th>
						<th className={`${th} text-right`}>Commission</th>
						<th className={th}>Time</th>
					</tr>
				</thead>
				<tbody className={tbody}>
					{intents.map((intent) => (
						<tr key={intent.id} className={row}>
							<td className={`${td} max-w-xs truncate font-medium`}>{intent.productTitle ?? intent.productId}</td>
							{showVendor && <td className={`${td} text-ink-soft`}>{intent.vendorName ?? intent.vendorId}</td>}
							<td className={`${td} text-right tabular-nums`}>{formatBdt(intent.priceMinor)}</td>
							<td className={`${td} text-right text-ink-soft`}>{formatPercent(intent.commissionBps)}</td>
							<td className={`${td} text-right font-medium tabular-nums`}>{formatBdt(intent.commissionMinor)}</td>
							<td className={`${td} text-ink-soft`}>{formatDateTime(intent.createdAt)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
