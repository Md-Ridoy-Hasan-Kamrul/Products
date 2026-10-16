import {
	ArrowRight,
	Coins,
	Download,
	LayoutDashboard,
	MousePointerClick,
	Package,
	ReceiptText,
	RefreshCw,
	Store,
	Users,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import type { SessionUser } from '../../lib/auth';
import { CATEGORIES, categoryBySlug } from '../../lib/categories';
import { downloadCsv, formatBdt, formatDate, formatPercent } from '../../lib/format';
import type { AdminSummary, Product, VendorCommissionSummary } from '../../lib/types';
import { productPath } from '../../lib/whatsapp';
import ProductImage from '../products/ProductImage';
import ActivityChart from './ActivityChart';
import IntentTable from './IntentTable';
import {
	Badge,
	Card,
	DashboardShell,
	EmptyState,
	ErrorNote,
	FilterSelect,
	SearchInput,
	SessionGate,
	SortTh,
	Stat,
	StatGrid,
	TableFoot,
	TableSkeleton,
	Toolbar,
	row,
	secondaryButton,
	table,
	tbody,
	td,
	th,
	useApi,
	useRequiredSession,
	useSection,
	useSort,
	type NavItem,
} from './ui';

const SECTIONS = ['overview', 'vendors', 'products', 'orders'] as const;
type Section = (typeof SECTIONS)[number];

const NO_VENDORS: VendorCommissionSummary[] = [];

export default function AdminDashboard() {
	const session = useRequiredSession('admin');
	return <SessionGate state={session}>{(user) => <Admin user={user} />}</SessionGate>;
}

function Admin({ user }: { user: SessionUser }) {
	const [section, go] = useSection(SECTIONS);
	const summary = useApi<AdminSummary>('/api/admin/summary');
	/** Vendor id the order intents view is narrowed to; '' for all. */
	const [vendorFilter, setVendorFilter] = useState('');
	const data = summary.data;

	const nav: NavItem<Section>[] = [
		{ id: 'overview', label: 'Overview', icon: LayoutDashboard },
		{ id: 'vendors', label: 'Vendors', icon: Users, count: data?.totals.vendors },
		{ id: 'products', label: 'Products', icon: Package, count: data?.totals.products },
		{ id: 'orders', label: 'Order intents', icon: ReceiptText, count: data?.totals.orderIntents },
	];

	const refresh = (
		<button type="button" className={secondaryButton} onClick={summary.reload} disabled={summary.loading}>
			<RefreshCw className={`size-4 ${summary.loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
		</button>
	);

	const headers: Record<Section, { title: string; description: string }> = {
		overview: { title: 'Marketplace overview', description: 'Order intents from Order Now clicks and the commission each vendor owes.' },
		vendors: { title: 'Vendors', description: 'Every shop on the marketplace, with its rate and what it owes.' },
		products: { title: 'Products', description: 'All live listings across vendors.' },
		orders: { title: 'Order intents', description: 'The commission ledger. Rows are never edited or removed.' },
	};

	function showIntentsFor(vendorId: string) {
		setVendorFilter(vendorId);
		go('orders');
	}

	return (
		<DashboardShell role="admin" user={user} nav={nav} section={section} workspace="Your Products Your Dreams" actions={refresh} {...headers[section]}>
			{summary.error && <ErrorNote message={summary.error} onRetry={summary.reload} />}

			{section === 'overview' && <Overview data={data} onVendor={showIntentsFor} />}
			{section === 'vendors' && <VendorsSection vendors={data?.vendors ?? null} onVendor={showIntentsFor} />}
			{section === 'products' && <ProductsSection data={data} />}
			{section === 'orders' && <OrdersSection data={data} vendorFilter={vendorFilter} onVendorFilter={setVendorFilter} />}
		</DashboardShell>
	);
}

function vendorOptions(vendors: VendorCommissionSummary[]) {
	return [{ value: '', label: 'All vendors' }, ...vendors.map((v) => ({ value: v.vendor.id, label: v.vendor.name }))];
}

/* ---------- Overview ---------- */

function Overview({ data, onVendor }: { data: AdminSummary | null; onVendor: (id: string) => void }) {
	const lastTwoWeeks = data?.daily.reduce((sum, day) => sum + day.commissionMinor, 0);
	const byOwed = useMemo(
		() => [...(data?.vendors ?? [])].sort((a, b) => b.commissionOwedMinor - a.commissionOwedMinor),
		[data],
	);

	return (
		<>
			<StatGrid>
				<Stat label="Vendors" value={data ? String(data.totals.vendors) : null} icon={Store} />
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

			<div className="grid gap-6 min-[1200px]:grid-cols-3">
				<Card title="Activity" description="Order Now clicks across the marketplace, last 14 days." id="activity" className="min-[1200px]:col-span-2">
					{data ? <ActivityChart daily={data.daily} /> : <div className="h-56 animate-pulse rounded-lg bg-canvas" />}
				</Card>
				<Card title="Top products" description="By order intents, all time." id="top-products" flush>
					{!data ? (
						<TableSkeleton />
					) : data.productStats.length === 0 ? (
						<p className="m-0 px-5 py-8 text-center text-sm text-ink-soft">No clicks yet.</p>
					) : (
						<ol className="m-0 list-none divide-y divide-line p-0">
							{data.productStats.slice(0, 5).map((stat, index) => (
								<li key={stat.productId} className="flex items-center gap-3 px-5 py-3">
									<span className="w-4 text-xs font-semibold text-ink-soft tabular-nums">{index + 1}</span>
									<span className="min-w-0 flex-1 truncate text-sm font-medium">{stat.productTitle ?? stat.productId}</span>
									<span className="text-sm font-semibold tabular-nums">{stat.orderIntents}</span>
								</li>
							))}
						</ol>
					)}
				</Card>
			</div>

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
								{byOwed.map((r) => {
									const share = data.totals.commissionOwedMinor ? r.commissionOwedMinor / data.totals.commissionOwedMinor : 0;
									return (
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
												<div className="flex items-center gap-2" title={`${Math.round(share * 100)}% of all commission`}>
													<div className="h-1.5 flex-1 rounded-full bg-canvas">
														<div className="h-full rounded-full bg-brand" style={{ width: `${share * 100}%` }} />
													</div>
													<span className="w-9 text-right text-xs text-ink-soft tabular-nums">{Math.round(share * 100)}%</span>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</Card>

			<Card title="Latest order intents" id="latest" flush actions={<SectionLink href="#orders">View ledger</SectionLink>}>
				<IntentTable intents={data?.recentOrderIntents.slice(0, 5) ?? null} showVendor />
			</Card>
		</>
	);
}

function SectionLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<a href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand no-underline hover:underline">
			{children} <ArrowRight className="size-4" aria-hidden="true" />
		</a>
	);
}

/* ---------- Vendors ---------- */

function VendorsSection({ vendors, onVendor }: { vendors: VendorCommissionSummary[] | null; onVendor: (id: string) => void }) {
	const [query, setQuery] = useState('');
	const all = vendors ?? NO_VENDORS;
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return all.filter((r) => !q || r.vendor.name.toLowerCase().includes(q) || r.vendor.phone.includes(q.replace(/\D/g, '') || '\0'));
	}, [all, query]);

	const { sorted, sort, toggle } = useSort(
		filtered,
		{
			name: (r) => r.vendor.name.toLowerCase(),
			products: (r) => r.productCount,
			intents: (r) => r.orderIntentCount,
			gross: (r) => r.grossMinor,
			rate: (r) => r.vendor.commissionBps,
			owed: (r) => r.commissionOwedMinor,
			joined: (r) => r.vendor.createdAt,
		},
		{ key: 'owed', dir: 'desc' },
	);

	function exportCsv() {
		downloadCsv('vendors.csv', [
			['Vendor', 'WhatsApp', 'Products', 'Order intents', 'Intent value (BDT)', 'Rate', 'Commission owed (BDT)', 'Joined'],
			...sorted.map((r) => [
				r.vendor.name,
				`+${r.vendor.phone}`,
				r.productCount,
				r.orderIntentCount,
				r.grossMinor / 100,
				formatPercent(r.vendor.commissionBps),
				r.commissionOwedMinor / 100,
				r.vendor.createdAt,
			]),
		]);
	}

	return (
		<Card
			title="All vendors"
			description={`${all.length} shops`}
			id="vendors"
			flush
			actions={
				<button type="button" className={secondaryButton} onClick={exportCsv} disabled={sorted.length === 0}>
					<Download className="size-4" aria-hidden="true" /> Export CSV
				</button>
			}
		>
			<Toolbar>
				<SearchInput value={query} onChange={setQuery} label="Search by name or phone" />
			</Toolbar>
			{!vendors ? (
				<TableSkeleton />
			) : sorted.length === 0 ? (
				<EmptyState icon={Users} title="No matching vendors" text="Try a different name or number." />
			) : (
				<div className="overflow-x-auto">
					<table className={table}>
						<thead>
							<tr>
								<SortTh label="Vendor" column="name" sort={sort} onSort={toggle} />
								<th className={th}>WhatsApp</th>
								<SortTh label="Products" column="products" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Order intents" column="intents" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Intent value" column="gross" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Rate" column="rate" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Commission owed" column="owed" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Joined" column="joined" sort={sort} onSort={toggle} />
							</tr>
						</thead>
						<tbody className={tbody}>
							{sorted.map((r) => (
								<tr key={r.vendor.id} className={row}>
									<td className={td}>
										<button
											type="button"
											onClick={() => onVendor(r.vendor.id)}
											className="font-medium hover:text-brand"
											title="Show this vendor's order intents"
										>
											{r.vendor.name}
										</button>
									</td>
									<td className={`${td} tabular-nums`}>
										<a href={`https://wa.me/${r.vendor.phone}`} target="_blank" rel="noopener" className="text-ink-soft no-underline hover:text-wa">
											+{r.vendor.phone}
										</a>
									</td>
									<td className={`${td} text-right tabular-nums`}>{r.productCount}</td>
									<td className={`${td} text-right tabular-nums`}>{r.orderIntentCount}</td>
									<td className={`${td} text-right tabular-nums`}>{formatBdt(r.grossMinor)}</td>
									<td className={`${td} text-right`}>
										<Badge tone={r.vendor.commissionBps === 1000 ? 'neutral' : 'brand'}>{formatPercent(r.vendor.commissionBps)}</Badge>
									</td>
									<td className={`${td} text-right font-semibold tabular-nums`}>{formatBdt(r.commissionOwedMinor)}</td>
									<td className={`${td} text-ink-soft`}>{formatDate(r.vendor.createdAt)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			{vendors && sorted.length > 0 && <TableFoot shown={sorted.length} total={all.length} noun="vendors" />}
		</Card>
	);
}

/* ---------- Products ---------- */

function ProductsSection({ data }: { data: AdminSummary | null }) {
	// Fetched only when this section is opened.
	const catalog = useApi<{ products: Product[] }>('/api/products');
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState('');
	const [vendorId, setVendorId] = useState('');

	const stats = useMemo(() => new Map((data?.productStats ?? []).map((s) => [s.productId, s])), [data]);
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return (catalog.data?.products ?? []).filter(
			(p) =>
				(!category || p.category === category) &&
				(!vendorId || p.vendorId === vendorId) &&
				(!q || p.title.toLowerCase().includes(q) || p.vendor.name.toLowerCase().includes(q)),
		);
	}, [catalog.data, query, category, vendorId]);

	const { sorted, sort, toggle } = useSort(
		filtered,
		{
			title: (p) => p.title.toLowerCase(),
			vendor: (p) => p.vendor.name.toLowerCase(),
			price: (p) => p.priceMinor,
			intents: (p) => stats.get(p.id)?.orderIntents ?? 0,
			commission: (p) => stats.get(p.id)?.commissionMinor ?? 0,
			added: (p) => p.createdAt,
		},
		{ key: 'intents', dir: 'desc' },
	);
	const total = catalog.data?.products.length ?? 0;

	return (
		<Card title="All listings" description={`${total} live`} id="products" flush>
			{catalog.error && (
				<div className="p-5">
					<ErrorNote message={catalog.error} onRetry={catalog.reload} />
				</div>
			)}
			<Toolbar>
				<SearchInput value={query} onChange={setQuery} label="Search products or vendors" />
				<FilterSelect
					label="Category"
					value={category}
					onChange={setCategory}
					options={[{ value: '', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c.slug, label: c.name }))]}
				/>
				<FilterSelect label="Vendor" value={vendorId} onChange={setVendorId} options={vendorOptions(data?.vendors ?? NO_VENDORS)} />
			</Toolbar>
			{!catalog.data ? (
				<TableSkeleton />
			) : sorted.length === 0 ? (
				<EmptyState icon={Package} title="No matching products" text="Try a different search or filter." />
			) : (
				<div className="overflow-x-auto">
					<table className={table}>
						<thead>
							<tr>
								<SortTh label="Product" column="title" sort={sort} onSort={toggle} />
								<SortTh label="Vendor" column="vendor" sort={sort} onSort={toggle} />
								<th className={th}>Category</th>
								<SortTh label="Price" column="price" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Intents" column="intents" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Commission" column="commission" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Added" column="added" sort={sort} onSort={toggle} />
							</tr>
						</thead>
						<tbody className={tbody}>
							{sorted.map((p) => (
								<tr key={p.id} className={row}>
									<td className={td}>
										<div className="flex items-center gap-3">
											<ProductImage title={p.title} imageUrl={p.imageUrl} category={p.category} className="size-9 shrink-0 rounded-md" />
											<a href={productPath(p.id)} className="max-w-xs truncate font-medium text-ink no-underline hover:text-brand">
												{p.title}
											</a>
										</div>
									</td>
									<td className={`${td} text-ink-soft`}>{p.vendor.name}</td>
									<td className={`${td} text-ink-soft`}>{categoryBySlug(p.category).name}</td>
									<td className={`${td} text-right tabular-nums`}>{formatBdt(p.priceMinor)}</td>
									<td className={`${td} text-right tabular-nums`}>{stats.get(p.id)?.orderIntents ?? 0}</td>
									<td className={`${td} text-right font-medium tabular-nums`}>{formatBdt(stats.get(p.id)?.commissionMinor ?? 0)}</td>
									<td className={`${td} text-ink-soft`}>{formatDate(p.createdAt)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			{catalog.data && sorted.length > 0 && <TableFoot shown={sorted.length} total={total} noun="products" />}
		</Card>
	);
}

/* ---------- Orders ---------- */

function OrdersSection({
	data,
	vendorFilter,
	onVendorFilter,
}: {
	data: AdminSummary | null;
	vendorFilter: string;
	onVendorFilter: (id: string) => void;
}) {
	const [query, setQuery] = useState('');
	const intents = data?.recentOrderIntents ?? null;
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return (intents ?? []).filter(
			(i) => (!vendorFilter || i.vendorId === vendorFilter) && (!q || (i.productTitle ?? i.productId).toLowerCase().includes(q)),
		);
	}, [intents, query, vendorFilter]);
	const filteredOwed = filtered.reduce((sum, i) => sum + i.commissionMinor, 0);

	function exportCsv() {
		downloadCsv('order-intents.csv', [
			['Time', 'Product', 'Vendor', 'Price (BDT)', 'Rate', 'Commission (BDT)', 'Intent ID'],
			...filtered.map((i) => [
				i.createdAt,
				i.productTitle ?? i.productId,
				i.vendorName ?? i.vendorId,
				i.priceMinor / 100,
				formatPercent(i.commissionBps),
				i.commissionMinor / 100,
				i.id,
			]),
		]);
	}

	const totalIntents = data?.totals.orderIntents ?? 0;
	return (
		<Card
			title="Ledger"
			description={
				intents && totalIntents > intents.length ? `Latest ${intents.length} of ${totalIntents}` : `${totalIntents} in total`
			}
			id="ledger"
			flush
			actions={
				<button type="button" className={secondaryButton} onClick={exportCsv} disabled={filtered.length === 0}>
					<Download className="size-4" aria-hidden="true" /> Export CSV
				</button>
			}
		>
			<Toolbar>
				<SearchInput value={query} onChange={setQuery} label="Filter by product" />
				<FilterSelect label="Vendor" value={vendorFilter} onChange={onVendorFilter} options={vendorOptions(data?.vendors ?? NO_VENDORS)} />
				{intents && filtered.length > 0 && (
					<p className="m-0 ml-auto text-sm text-ink-soft">
						Commission in view: <span className="font-semibold text-ink tabular-nums">{formatBdt(filteredOwed)}</span>
					</p>
				)}
			</Toolbar>
			<IntentTable intents={intents ? filtered : null} showVendor />
			{intents && filtered.length > 0 && <TableFoot shown={filtered.length} total={intents.length} noun="order intents" />}
		</Card>
	);
}
