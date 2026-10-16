import { Download, Settings2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { POISHA_PER_TAKA } from '../../../lib/constants';
import { shopVisibility } from '../../../lib/dashboard';
import { downloadCsv, formatBdt, formatDate, formatPercent } from '../../../lib/format';
import type { Vendor, VendorCommissionSummary, VendorStatus } from '../../../lib/types';
import { useSort } from '../hooks/useSort';
import {
	Badge,
	Card,
	EmptyState,
	FilterSelect,
	SearchInput,
	SortTh,
	TableFoot,
	TableSkeleton,
	Toolbar,
	row,
	secondaryButton,
	table,
	tbody,
	td,
	th,
} from '../ui';

const NO_VENDORS: VendorCommissionSummary[] = [];
const STATUS_ORDER: Record<VendorStatus, number> = { pending: 0, active: 1, suspended: 2 };
const STATUS_OPTIONS = [
	{ value: '', label: 'All statuses' },
	...(['pending', 'active', 'suspended'] as const).map((status) => ({ value: status, label: shopVisibility(status).label })),
];

interface Props {
	vendors: VendorCommissionSummary[] | null;
	onVendor: (vendorId: string) => void;
	onManage: (vendor: Vendor) => void;
}

function matches(r: VendorCommissionSummary, query: string, status: string): boolean {
	const q = query.trim().toLowerCase();
	const digits = q.replace(/\D/g, '');
	return (!status || r.vendor.status === status) && (!q || r.vendor.name.toLowerCase().includes(q) || (!!digits && r.vendor.phone.includes(digits)));
}

function exportCsv(rows: VendorCommissionSummary[]) {
	downloadCsv('vendors.csv', [
		['Vendor', 'Status', 'WhatsApp', 'Products', 'Order intents', 'Intent value (BDT)', 'Rate', 'Commission owed (BDT)', 'Joined'],
		...rows.map((r) => [
			r.vendor.name,
			shopVisibility(r.vendor.status).label,
			`+${r.vendor.phone}`,
			r.productCount,
			r.orderIntentCount,
			r.grossMinor / POISHA_PER_TAKA,
			formatPercent(r.vendor.commissionBps),
			r.commissionOwedMinor / POISHA_PER_TAKA,
			r.vendor.createdAt,
		]),
	]);
}

export default function VendorsSection({ vendors, onVendor, onManage }: Props) {
	const [query, setQuery] = useState('');
	const [status, setStatus] = useState('');
	const all = vendors ?? NO_VENDORS;
	const filtered = useMemo(() => all.filter((r) => matches(r, query, status)), [all, query, status]);
	const { sorted, sort, toggle } = useSort(
		filtered,
		{
			name: (r) => r.vendor.name.toLowerCase(),
			status: (r) => STATUS_ORDER[r.vendor.status],
			products: (r) => r.productCount,
			intents: (r) => r.orderIntentCount,
			rate: (r) => r.vendor.commissionBps,
			owed: (r) => r.commissionOwedMinor,
			joined: (r) => r.vendor.createdAt,
		},
		{ key: 'owed', dir: 'desc' },
	);

	return (
		<Card
			title="All vendors"
			description={`${all.length} shops`}
			id="vendors"
			flush
			actions={
				<button type="button" className={secondaryButton} onClick={() => exportCsv(sorted)} disabled={sorted.length === 0}>
					<Download className="size-4" aria-hidden="true" /> Export CSV
				</button>
			}
		>
			<Toolbar>
				<SearchInput value={query} onChange={setQuery} label="Search by name or phone" />
				<FilterSelect label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} />
			</Toolbar>
			{!vendors ? (
				<TableSkeleton />
			) : sorted.length === 0 ? (
				<EmptyState icon={Users} title="No matching vendors" text="Try a different name, number, or status." />
			) : (
				<div className="overflow-x-auto">
					<table className={table}>
						<thead>
							<tr>
								<SortTh label="Vendor" column="name" sort={sort} onSort={toggle} />
								<SortTh label="Status" column="status" sort={sort} onSort={toggle} />
								<th className={th}>WhatsApp</th>
								<SortTh label="Products" column="products" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Order intents" column="intents" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Rate" column="rate" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Commission owed" column="owed" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Joined" column="joined" sort={sort} onSort={toggle} />
								<th className={`${th} text-right`}>
									<span className="sr-only">Actions</span>
								</th>
							</tr>
						</thead>
						<tbody className={tbody}>
							{sorted.map((r) => (
								<VendorRow key={r.vendor.id} summary={r} onVendor={onVendor} onManage={onManage} />
							))}
						</tbody>
					</table>
				</div>
			)}
			{vendors && sorted.length > 0 && <TableFoot shown={sorted.length} total={all.length} noun="vendors" />}
		</Card>
	);
}

function VendorRow({ summary: r, onVendor, onManage }: { summary: VendorCommissionSummary } & Omit<Props, 'vendors'>) {
	const visibility = shopVisibility(r.vendor.status);
	return (
		<tr className={row}>
			<td className={td}>
				<button type="button" onClick={() => onVendor(r.vendor.id)} className="font-medium hover:text-brand" title="Show this vendor's order intents">
					{r.vendor.name}
				</button>
			</td>
			<td className={td}>
				<Badge tone={visibility.tone}>{visibility.label}</Badge>
			</td>
			<td className={`${td} tabular-nums`}>
				<a href={`https://wa.me/${r.vendor.phone}`} target="_blank" rel="noopener noreferrer" className="text-ink-soft no-underline hover:text-wa">
					+{r.vendor.phone}
				</a>
			</td>
			<td className={`${td} text-right tabular-nums`}>{r.productCount}</td>
			<td className={`${td} text-right tabular-nums`}>{r.orderIntentCount}</td>
			<td className={`${td} text-right`}>
				<Badge>{formatPercent(r.vendor.commissionBps)}</Badge>
			</td>
			<td className={`${td} text-right font-semibold tabular-nums`}>{formatBdt(r.commissionOwedMinor)}</td>
			<td className={`${td} text-ink-soft`}>{formatDate(r.vendor.createdAt)}</td>
			<td className={`${td} text-right`}>
				<button type="button" className={`${secondaryButton} px-3 py-1.5`} onClick={() => onManage(r.vendor)} aria-label={`Manage ${r.vendor.name}`}>
					<Settings2 className="size-4" aria-hidden="true" /> Manage
				</button>
			</td>
		</tr>
	);
}
