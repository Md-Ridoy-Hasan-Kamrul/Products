import {
	ArrowRight,
	Coins,
	Download,
	LayoutDashboard,
	MousePointerClick,
	Package,
	Pencil,
	Percent,
	Plus,
	ReceiptText,
	Store,
	Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch } from '../../lib/api';
import type { SessionUser } from '../../lib/auth';
import { CATEGORIES, categoryBySlug } from '../../lib/categories';
import { downloadCsv, formatBdt, formatDate, formatPercent } from '../../lib/format';
import type { OrderIntentRow, Product, Vendor, VendorInsights } from '../../lib/types';
import { productPath } from '../../lib/whatsapp';
import ProductImage from '../products/ProductImage';
import ActivityChart from './ActivityChart';
import IntentTable from './IntentTable';
import { DeleteDialog, ProductDrawer } from './ProductEditor';
import {
	Badge,
	Card,
	DashboardShell,
	Detail,
	EmptyState,
	ErrorNote,
	FilterSelect,
	Notice,
	SearchInput,
	SessionGate,
	SortTh,
	Stat,
	StatGrid,
	TableFoot,
	TableSkeleton,
	Toolbar,
	iconButton,
	primaryButton,
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

const SECTIONS = ['overview', 'products', 'orders', 'shop'] as const;
type Section = (typeof SECTIONS)[number];

const NO_PRODUCTS: Product[] = [];

type Editing = { mode: 'add' } | { mode: 'edit'; product: Product };

export default function VendorDashboard() {
	const session = useRequiredSession('vendor');
	return <SessionGate state={session}>{(user) => <SellerCenter user={user} />}</SessionGate>;
}

function SellerCenter({ user }: { user: SessionUser }) {
	const [section, go] = useSection(SECTIONS);
	const [vendor, setVendor] = useState<Vendor | null>(null);
	const [products, setProducts] = useState<Product[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const insights = useApi<VendorInsights>('/api/vendor/insights');
	const [editing, setEditing] = useState<Editing | null>(null);
	const [deleting, setDeleting] = useState<Product | null>(null);
	const [notice, setNotice] = useState<string | null>(null);

	useEffect(() => {
		Promise.all([
			apiFetch<{ vendor: Vendor }>('/api/vendor/me'),
			apiFetch<{ products: Product[] }>('/api/vendor/products'),
		])
			.then(([me, mine]) => {
				setVendor(me.vendor);
				setProducts(mine.products);
			})
			.catch((e: Error) => setError(e.message));
	}, []);

	/** Order intents per product id, for the product table and top list. */
	const intentsByProduct = useMemo(
		() => new Map((insights.data?.productStats ?? []).map((stat) => [stat.productId, stat.orderIntents])),
		[insights.data],
	);

	const nav: NavItem<Section>[] = [
		{ id: 'overview', label: 'Overview', icon: LayoutDashboard },
		{ id: 'products', label: 'Products', icon: Package, count: products?.length },
		{ id: 'orders', label: 'Order intents', icon: ReceiptText, count: insights.data?.totals.orderIntents },
		{ id: 'shop', label: 'Shop & billing', icon: Store },
	];

	const addButton = (
		<button type="button" className={primaryButton} onClick={() => setEditing({ mode: 'add' })}>
			<Plus className="size-4" aria-hidden="true" /> Add product
		</button>
	);

	function saved(product: Product) {
		const isNew = editing?.mode === 'add';
		setProducts((list) => (isNew ? [product, ...(list ?? [])] : (list ?? []).map((p) => (p.id === product.id ? product : p))));
		setEditing(null);
		setNotice(
			isNew ? `“${product.title}” is live. It shows on the storefront after the next build.` : `“${product.title}” was updated.`,
		);
		if (isNew) go('products');
	}

	function deleted(product: Product) {
		setProducts((list) => (list ?? []).filter((p) => p.id !== product.id));
		setDeleting(null);
		setNotice(`“${product.title}” was deleted.`);
	}

	const shopName = vendor?.name ?? user.name;
	const headers: Record<Section, { title: string; description: string; actions?: ReactNode }> = {
		overview: { title: shopName, description: 'How your shop is doing. Buyers order your products on WhatsApp.', actions: addButton },
		products: { title: 'Products', description: 'Everything listed in your shop.', actions: addButton },
		orders: { title: 'Order intents', description: 'Every Order Now click on your products, with the commission it adds.' },
		shop: { title: 'Shop & billing', description: 'Your shop details and how commission is charged.' },
	};

	return (
		<DashboardShell role="vendor" user={user} nav={nav} section={section} workspace={shopName} {...headers[section]}>
			{error && <ErrorNote message={error} />}
			{insights.error && <ErrorNote message={insights.error} onRetry={insights.reload} />}
			{notice && <Notice message={notice} onDismiss={() => setNotice(null)} />}

			{section === 'overview' && (
				<Overview
					vendor={vendor}
					products={products}
					insights={insights.data}
					intentsByProduct={intentsByProduct}
					addButton={addButton}
				/>
			)}
			{section === 'products' && (
				<ProductsSection
					products={products}
					intentsByProduct={intentsByProduct}
					addButton={addButton}
					onEdit={(product) => setEditing({ mode: 'edit', product })}
					onDelete={setDeleting}
				/>
			)}
			{section === 'orders' && <OrdersSection intents={insights.data?.recentOrderIntents ?? null} total={insights.data?.totals.orderIntents ?? 0} />}
			{section === 'shop' && <ShopSection vendor={vendor} user={user} insights={insights.data} />}

			{editing && (
				<ProductDrawer
					product={editing.mode === 'edit' ? editing.product : null}
					onClose={() => setEditing(null)}
					onSaved={saved}
				/>
			)}
			{deleting && <DeleteDialog product={deleting} onClose={() => setDeleting(null)} onDeleted={deleted} />}
		</DashboardShell>
	);
}

/* ---------- Overview ---------- */

function Overview({
	vendor,
	products,
	insights,
	intentsByProduct,
	addButton,
}: {
	vendor: Vendor | null;
	products: Product[] | null;
	insights: VendorInsights | null;
	intentsByProduct: Map<string, number>;
	addButton: ReactNode;
}) {
	const lastTwoWeeks = insights?.daily.reduce((sum, day) => sum + day.orderIntents, 0);
	const top = useMemo(
		() =>
			(products ?? [])
				.map((product) => ({ product, intents: intentsByProduct.get(product.id) ?? 0 }))
				.filter((entry) => entry.intents > 0)
				.sort((a, b) => b.intents - a.intents)
				.slice(0, 5),
		[products, intentsByProduct],
	);

	return (
		<>
			<StatGrid>
				<Stat label="Live products" value={products ? String(products.length) : null} icon={Package} hint="Listed on the storefront" />
				<Stat
					label="Order intents"
					value={insights ? String(insights.totals.orderIntents) : null}
					icon={MousePointerClick}
					hint={lastTwoWeeks !== undefined ? `${lastTwoWeeks} in the last 14 days` : undefined}
				/>
				<Stat
					label="Commission owed"
					value={insights ? formatBdt(insights.totals.commissionOwedMinor) : null}
					icon={Coins}
					tone="brand"
					hint="All time, not yet billed"
				/>
				<Stat label="Commission rate" value={vendor ? formatPercent(vendor.commissionBps) : null} icon={Percent} hint="Per order intent" />
			</StatGrid>

			{products?.length === 0 && (
				<Card title="Get started" id="get-started">
					<EmptyState
						icon={Package}
						title="Add your first product"
						text="Give it a name, price, and photo. Buyers can order it on WhatsApp as soon as it's live."
						action={addButton}
					/>
				</Card>
			)}

			<div className="grid gap-6 min-[1200px]:grid-cols-3">
				<Card title="Activity" description="Order Now clicks over the last 14 days." id="activity" className="min-[1200px]:col-span-2">
					{insights ? <ActivityChart daily={insights.daily} /> : <ChartSkeleton />}
				</Card>
				<Card title="Top products" description="By order intents, all time." id="top-products" flush>
					{top.length === 0 ? (
						<p className="m-0 px-5 py-8 text-center text-sm text-ink-soft">No clicks yet. Share your product links to get started.</p>
					) : (
						<ol className="m-0 list-none divide-y divide-line p-0">
							{top.map(({ product, intents }, index) => (
								<li key={product.id} className="flex items-center gap-3 px-5 py-3">
									<span className="w-4 text-xs font-semibold text-ink-soft tabular-nums">{index + 1}</span>
									<ProductImage title={product.title} imageUrl={product.imageUrl} category={product.category} className="size-9 shrink-0 rounded-md" />
									<span className="min-w-0 flex-1 truncate text-sm font-medium">{product.title}</span>
									<span className="text-sm font-semibold tabular-nums">{intents}</span>
								</li>
							))}
						</ol>
					)}
				</Card>
			</div>

			<Card
				title="Latest order intents"
				id="latest"
				flush
				actions={
					<a href="#orders" className="inline-flex items-center gap-1 text-sm font-semibold text-brand no-underline hover:underline">
						View all <ArrowRight className="size-4" aria-hidden="true" />
					</a>
				}
			>
				<IntentTable intents={insights?.recentOrderIntents.slice(0, 5) ?? null} />
			</Card>
		</>
	);
}

function ChartSkeleton() {
	return <div className="h-56 animate-pulse rounded-lg bg-canvas" aria-label="Loading chart" />;
}

/* ---------- Products ---------- */

function ProductsSection({
	products,
	intentsByProduct,
	addButton,
	onEdit,
	onDelete,
}: {
	products: Product[] | null;
	intentsByProduct: Map<string, number>;
	addButton: ReactNode;
	onEdit: (product: Product) => void;
	onDelete: (product: Product) => void;
}) {
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState('');
	const all = products ?? NO_PRODUCTS;

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return all.filter((p) => (!category || p.category === category) && (!q || p.title.toLowerCase().includes(q)));
	}, [all, query, category]);

	const { sorted, sort, toggle } = useSort(
		filtered,
		{
			title: (p) => p.title.toLowerCase(),
			category: (p) => categoryBySlug(p.category).name,
			price: (p) => p.priceMinor,
			intents: (p) => intentsByProduct.get(p.id) ?? 0,
			updated: (p) => p.updatedAt,
		},
		{ key: 'updated', dir: 'desc' },
	);

	if (products && products.length === 0) {
		return (
			<Card title="Products" id="my-products" flush>
				<EmptyState icon={Package} title="No products yet" text="Add your first product and buyers can order it on WhatsApp right away." action={addButton} />
			</Card>
		);
	}

	return (
		<Card title="All products" description={`${all.length} listed`} id="my-products" flush>
			<Toolbar>
				<SearchInput value={query} onChange={setQuery} label="Search your products" />
				<FilterSelect
					label="Category"
					value={category}
					onChange={setCategory}
					options={[{ value: '', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c.slug, label: c.name }))]}
				/>
			</Toolbar>
			{!products ? (
				<TableSkeleton />
			) : sorted.length === 0 ? (
				<EmptyState icon={Package} title="No matching products" text="Try a different search or category." />
			) : (
				<div className="overflow-x-auto">
					<table className={table}>
						<thead>
							<tr>
								<SortTh label="Product" column="title" sort={sort} onSort={toggle} />
								<SortTh label="Category" column="category" sort={sort} onSort={toggle} />
								<SortTh label="Price" column="price" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Intents" column="intents" sort={sort} onSort={toggle} align="right" />
								<th className={th}>Status</th>
								<SortTh label="Updated" column="updated" sort={sort} onSort={toggle} />
								<th className={`${th} text-right`}>
									<span className="sr-only">Actions</span>
								</th>
							</tr>
						</thead>
						<tbody className={tbody}>
							{sorted.map((product) => (
								<tr key={product.id} className={row}>
									<td className={td}>
										<div className="flex items-center gap-3">
											<ProductImage title={product.title} imageUrl={product.imageUrl} category={product.category} className="size-10 shrink-0 rounded-md" />
											<a href={productPath(product.id)} className="max-w-xs truncate font-medium text-ink no-underline hover:text-brand">
												{product.title}
											</a>
										</div>
									</td>
									<td className={`${td} text-ink-soft`}>{categoryBySlug(product.category).name}</td>
									<td className={`${td} text-right font-medium tabular-nums`}>{formatBdt(product.priceMinor)}</td>
									<td className={`${td} text-right tabular-nums`}>{intentsByProduct.get(product.id) ?? 0}</td>
									<td className={td}>
										<Badge tone="success">Live</Badge>
									</td>
									<td className={`${td} text-ink-soft`}>{formatDate(product.updatedAt)}</td>
									<td className={`${td} text-right`}>
										<div className="inline-flex gap-1">
											<button type="button" className={iconButton} aria-label={`Edit ${product.title}`} title="Edit" onClick={() => onEdit(product)}>
												<Pencil className="size-4" aria-hidden="true" />
											</button>
											<button
												type="button"
												className={`${iconButton} hover:bg-red-50 hover:text-red-700`}
												aria-label={`Delete ${product.title}`}
												title="Delete"
												onClick={() => onDelete(product)}
											>
												<Trash2 className="size-4" aria-hidden="true" />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			{products && sorted.length > 0 && <TableFoot shown={sorted.length} total={all.length} noun="products" />}
		</Card>
	);
}

/* ---------- Orders ---------- */

function OrdersSection({ intents, total }: { intents: OrderIntentRow[] | null; total: number }) {
	const [query, setQuery] = useState('');
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return (intents ?? []).filter((i) => !q || (i.productTitle ?? i.productId).toLowerCase().includes(q));
	}, [intents, query]);

	function exportCsv() {
		downloadCsv('order-intents.csv', [
			['Time', 'Product', 'Price (BDT)', 'Rate', 'Commission (BDT)'],
			...filtered.map((i) => [i.createdAt, i.productTitle ?? i.productId, i.priceMinor / 100, formatPercent(i.commissionBps), i.commissionMinor / 100]),
		]);
	}

	return (
		<Card
			title="Ledger"
			description={total > (intents?.length ?? 0) ? `Latest ${intents?.length} of ${total}` : `${total} in total`}
			id="orders"
			flush
			actions={
				<button type="button" className={secondaryButton} onClick={exportCsv} disabled={filtered.length === 0}>
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

/* ---------- Shop ---------- */

function ShopSection({ vendor, user, insights }: { vendor: Vendor | null; user: SessionUser; insights: VendorInsights | null }) {
	return (
		<div className="grid gap-6 min-[1024px]:grid-cols-2">
			<Card title="Shop details" id="shop-details">
				<dl className="m-0 grid gap-4 text-sm">
					<Detail label="Shop name">{vendor?.name ?? '—'}</Detail>
					<Detail label="WhatsApp number">{vendor ? `+${vendor.phone}` : '—'}</Detail>
					<Detail label="Login email">{user.email}</Detail>
					<Detail label="Seller since">{vendor ? formatDate(vendor.createdAt) : '—'}</Detail>
				</dl>
				{vendor && (
					<a
						href={`/search?q=${encodeURIComponent(vendor.name)}`}
						className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand no-underline hover:underline"
					>
						See your shop on the storefront <ArrowRight className="size-4" aria-hidden="true" />
					</a>
				)}
			</Card>
			<Card title="Billing" id="billing">
				<dl className="m-0 grid gap-4 text-sm">
					<Detail label="Commission rate">{vendor ? `${formatPercent(vendor.commissionBps)} of the price, per order intent` : '—'}</Detail>
					<Detail label="Order intents to date">{insights ? insights.totals.orderIntents : '—'}</Detail>
					<Detail label="Commission owed">{insights ? formatBdt(insights.totals.commissionOwedMinor) : '—'}</Detail>
				</dl>
				<p className="m-0 mt-5 rounded-lg bg-canvas p-4 text-xs leading-relaxed text-ink-soft">
					Each Order Now click records the product's price and your rate at that moment. Changing a price later does not
					change past commission. Monthly statements are coming soon.
				</p>
			</Card>
		</div>
	);
}
