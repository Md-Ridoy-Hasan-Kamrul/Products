import { ArrowRight, Coins, MousePointerClick, Package, Store } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { PREVIEW_ROWS, TOP_LIST_LIMIT } from '../../../lib/constants';
import { formatBdt, formatDate, formatPercent } from '../../../lib/format';
import type { AdminSummary, Vendor, VendorCommissionSummary } from '../../../lib/types';
import ActivityChart from '../ActivityChart';
import IntentTable from '../IntentTable';
import { Badge, Card, Stat, StatGrid, TableSkeleton, primaryButton, row, table, tbody, td, th } from '../ui';

const PERCENT = 100;

interface Props {
	data: AdminSummary | null;
	onVendor: (vendorId: string) => void;
	onManage: (vendor: Vendor) => void;
}

export default function Overview({ data, onVendor, onManage }: Props) {
	const pending = useMemo(() => (data?.vendors ?? []).filter((r) => r.vendor.status === 'pending'), [data]);

	return (
		<>
			<OverviewStats data={data} />
			{pending.length > 0 && <ApprovalQueue pending={pending} onManage={onManage} />}
			<div className="grid gap-6 min-[1200px]:grid-cols-3">
				<Card title="Activity" description="Order Now clicks across the marketplace, last 14 days." id="activity" className="min-[1200px]:col-span-2">
					{data ? <ActivityChart daily={data.daily} /> : <div className="h-56 animate-pulse rounded-lg bg-canvas" />}
				</Card>
				<TopProducts data={data} />
			</div>
			<CommissionByVendor data={data} onVendor={onVendor} />
			<Card title="Latest order intents" id="latest" flush actions={<SectionLink href="#orders">View ledger</SectionLink>}>
				<IntentTable intents={data?.recentOrderIntents.slice(0, PREVIEW_ROWS) ?? null} showVendor />
			</Card>
		</>
	);
}

function OverviewStats({ data }: { data: AdminSummary | null }) {
	const lastTwoWeeks = data?.daily.reduce((sum, day) => sum + day.commissionMinor, 0);
	return (
		<StatGrid>
			<Stat
				label="Vendors"
				value={data ? String(data.totals.vendors) : null}
				icon={Store}
				hint={data?.totals.pendingVendors ? `${data.totals.pendingVendors} waiting for approval` : undefined}
			/>
			<Stat label="Live products" value={data ? String(data.totals.products) : null} icon={Package} />
			<Stat
				label="Order intents"
				value={data ? String(data.totals.orderIntents) : null}
				icon={MousePointerClick}
				hint={data ? `Worth ${formatBdt(data.totals.grossMinor)}` : undefined}
			/>
			<Stat
				label="Commission owed"
				value={data ? formatBdt(data.totals.commissionOwedMinor) : null}
				icon={Coins}
				tone="brand"
				hint={lastTwoWeeks !== undefined ? `${formatBdt(lastTwoWeeks)} in the last 14 days` : undefined}
			/>
		</StatGrid>
	);
}

function ApprovalQueue({ pending, onManage }: { pending: VendorCommissionSummary[]; onManage: (vendor: Vendor) => void }) {
	return (
		<Card title="Needs your approval" description="New shops stay hidden from buyers until you approve them." id="approvals" flush>
			<ul className="m-0 list-none divide-y divide-line p-0">
				{pending.map((r) => (
					<li key={r.vendor.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
						<div className="min-w-0 flex-1">
							<p className="m-0 truncate text-sm font-semibold">{r.vendor.name}</p>
							<p className="m-0 text-xs text-ink-soft">
								+{r.vendor.phone} · {r.productCount} {r.productCount === 1 ? 'product' : 'products'} · joined {formatDate(r.vendor.createdAt)}
							</p>
						</div>
						<button type="button" className={primaryButton} onClick={() => onManage(r.vendor)} aria-label={`Review ${r.vendor.name}`}>
							Review
						</button>
					</li>
				))}
			</ul>
		</Card>
	);
}

function TopProducts({ data }: { data: AdminSummary | null }) {
	return (
		<Card title="Top products" description="By order intents, all time." id="top-products" flush>
			{!data ? (
				<TableSkeleton />
			) : data.productStats.length === 0 ? (
				<p className="m-0 px-5 py-8 text-center text-sm text-ink-soft">No clicks yet.</p>
			) : (
				<ol className="m-0 list-none divide-y divide-line p-0">
					{data.productStats.slice(0, TOP_LIST_LIMIT).map((stat, index) => (
						<li key={stat.productId} className="flex items-center gap-3 px-5 py-3">
							<span className="w-4 text-xs font-semibold text-ink-soft tabular-nums">{index + 1}</span>
							<span className="min-w-0 flex-1 truncate text-sm font-medium">{stat.productTitle ?? stat.productId}</span>
							<span className="text-sm font-semibold tabular-nums">{stat.orderIntents}</span>
						</li>
					))}
				</ol>
			)}
		</Card>
	);
}

function CommissionByVendor({ data, onVendor }: { data: AdminSummary | null; onVendor: (vendorId: string) => void }) {
	const byOwed = useMemo(() => [...(data?.vendors ?? [])].sort((a, b) => b.commissionOwedMinor - a.commissionOwedMinor), [data]);
	const total = data?.totals.commissionOwedMinor ?? 0;

	return (
		<Card
			title="Commission by vendor"
			description="Calculated per order intent at the vendor's rate."
			id="commission"
			flush
			actions={<SectionLink href="#vendors">All vendors</SectionLink>}
		>
			{!data ? (
				<TableSkeleton />
			) : (
				<div className="overflow-x-auto">
					<table className={table}>
						<thead>
							<tr>
								<th className={th}>Vendor</th>
								<th className={`${th} text-right`}>Order intents</th>
								<th className={`${th} text-right`}>Rate</th>
								<th className={`${th} text-right`}>Commission owed</th>
								<th className={`${th} w-48`}>
									<span className="sr-only">Share of total</span>
								</th>
							</tr>
						</thead>
						<tbody className={tbody}>
							{byOwed.map((r) => (
								<tr key={r.vendor.id} className={row}>
									<td className={td}>
										<button type="button" onClick={() => onVendor(r.vendor.id)} className="font-medium hover:text-brand">
											{r.vendor.name}
										</button>
									</td>
									<td className={`${td} text-right tabular-nums`}>{r.orderIntentCount}</td>
									<td className={`${td} text-right`}>
										<Badge>{formatPercent(r.vendor.commissionBps)}</Badge>
									</td>
									<td className={`${td} text-right font-semibold tabular-nums`}>{formatBdt(r.commissionOwedMinor)}</td>
									<td className={td}>
										<ShareBar share={total ? r.commissionOwedMinor / total : 0} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</Card>
	);
}

function ShareBar({ share }: { share: number }) {
	const percent = Math.round(share * PERCENT);
	return (
		<div className="flex items-center gap-2" title={`${percent}% of all commission`}>
			<div className="h-1.5 flex-1 rounded-full bg-canvas">
				<div className="h-full rounded-full bg-brand" style={{ width: `${share * PERCENT}%` }} />
			</div>
			<span className="w-9 text-right text-xs text-ink-soft tabular-nums">{percent}%</span>
		</div>
	);
}

export function SectionLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<a href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand no-underline hover:underline">
			{children} <ArrowRight className="size-4" aria-hidden="true" />
		</a>
	);
}
