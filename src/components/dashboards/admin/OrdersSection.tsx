import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { POISHA_PER_TAKA } from '../../../lib/constants';
import { filterIntents } from '../../../lib/dashboard';
import { downloadCsv, formatBdt, formatPercent } from '../../../lib/format';
import type { AdminSummary, OrderIntentRow } from '../../../lib/types';
import IntentTable from '../IntentTable';
import { vendorOptions } from './vendorOptions';
import { Card, FilterSelect, SearchInput, TableFoot, Toolbar, secondaryButton } from '../ui';

interface Props {
	data: AdminSummary | null;
	vendorFilter: string;
	onVendorFilter: (vendorId: string) => void;
}

function exportCsv(rows: OrderIntentRow[]) {
	downloadCsv('order-intents.csv', [
		['Time', 'Product', 'Vendor', 'Price (BDT)', 'Rate', 'Commission (BDT)', 'Intent ID'],
		...rows.map((i) => [
			i.createdAt,
			i.productTitle ?? i.productId,
			i.vendorName ?? i.vendorId,
			i.priceMinor / POISHA_PER_TAKA,
			formatPercent(i.commissionBps),
			i.commissionMinor / POISHA_PER_TAKA,
			i.id,
		]),
	]);
}

export default function OrdersSection({ data, vendorFilter, onVendorFilter }: Props) {
	const [query, setQuery] = useState('');
	const intents = data?.recentOrderIntents ?? null;
	const filtered = useMemo(() => filterIntents(intents ?? [], { query, vendorId: vendorFilter }), [intents, query, vendorFilter]);
	const inView = filtered.reduce((sum, i) => sum + i.commissionMinor, 0);
	const options = useMemo(() => vendorOptions(data?.vendors), [data?.vendors]);
	const total = data?.totals.orderIntents ?? 0;
	const shown = intents?.length ?? 0;

	return (
		<Card
			title="Ledger"
			description={total > shown ? `Latest ${shown} of ${total}` : `${total} in total`}
			id="ledger"
			flush
			actions={
				<button type="button" className={secondaryButton} onClick={() => exportCsv(filtered)} disabled={filtered.length === 0}>
					<Download className="size-4" aria-hidden="true" /> Export CSV
				</button>
			}
		>
			<Toolbar>
				<SearchInput value={query} onChange={setQuery} label="Filter by product" />
				<FilterSelect label="Vendor" value={vendorFilter} onChange={onVendorFilter} options={options} />
				{filtered.length > 0 && (
					<p className="m-0 ml-auto text-sm text-ink-soft">
						Commission in view: <span className="font-semibold text-ink tabular-nums">{formatBdt(inView)}</span>
					</p>
				)}
			</Toolbar>
			<IntentTable intents={intents ? filtered : null} showVendor />
			{intents && filtered.length > 0 && <TableFoot shown={filtered.length} total={intents.length} noun="order intents" />}
		</Card>
	);
}
