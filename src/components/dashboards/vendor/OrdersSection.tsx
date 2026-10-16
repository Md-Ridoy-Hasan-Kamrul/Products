import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { POISHA_PER_TAKA } from '../../../lib/constants';
import { filterIntents } from '../../../lib/dashboard';
import { downloadCsv, formatPercent } from '../../../lib/format';
import type { OrderIntentRow, VendorInsights } from '../../../lib/types';
import IntentTable from '../IntentTable';
import { Card, SearchInput, TableFoot, Toolbar, secondaryButton } from '../ui';

function exportCsv(rows: OrderIntentRow[]) {
	downloadCsv('order-intents.csv', [
		['Time', 'Product', 'Price (BDT)', 'Rate', 'Commission (BDT)'],
		...rows.map((i) => [
			i.createdAt,
			i.productTitle ?? i.productId,
			i.priceMinor / POISHA_PER_TAKA,
			formatPercent(i.commissionBps),
			i.commissionMinor / POISHA_PER_TAKA,
		]),
	]);
}

export default function OrdersSection({ insights }: { insights: VendorInsights | null }) {
	const [query, setQuery] = useState('');
	const intents = insights?.recentOrderIntents ?? null;
	const total = insights?.totals.orderIntents ?? 0;
	const filtered = useMemo(() => filterIntents(intents ?? [], { query }), [intents, query]);
	const shown = intents?.length ?? 0;

	return (
		<Card
			title="Ledger"
			description={total > shown ? `Latest ${shown} of ${total}` : `${total} in total`}
			id="orders"
			flush
			actions={
				<button type="button" className={secondaryButton} onClick={() => exportCsv(filtered)} disabled={filtered.length === 0}>
					<Download className="size-4" aria-hidden="true" /> Export CSV
				</button>
			}
		>
			<Toolbar>
				<SearchInput value={query} onChange={setQuery} label="Filter by product" />
			</Toolbar>
			<IntentTable intents={intents ? filtered : null} />
			{intents && filtered.length > 0 && <TableFoot shown={filtered.length} total={intents.length} noun="order intents" />}
		</Card>
	);
}
