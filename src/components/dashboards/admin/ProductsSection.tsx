import { Package } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CATEGORIES, categoryBySlug } from '../../../lib/categories';
import { filterProducts, shopVisibility } from '../../../lib/dashboard';
import { formatBdt, formatDate } from '../../../lib/format';
import type { AdminProduct, ProductIntentStat, VendorCommissionSummary } from '../../../lib/types';
import { productPath } from '../../../lib/whatsapp';
import ProductImage from '../../products/ProductImage';
import { useApi } from '../hooks/useApi';
import { useSort } from '../hooks/useSort';
import { vendorOptions } from './vendorOptions';
import {
	Badge,
	Card,
	EmptyState,
	ErrorNote,
	FilterSelect,
	SearchInput,
	SortTh,
	TableFoot,
	TableSkeleton,
	Toolbar,
	row,
	table,
	tbody,
	td,
	th,
} from '../ui';

const NO_PRODUCTS: AdminProduct[] = [];
const CATEGORY_OPTIONS = [{ value: '', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c.slug, label: c.name }))];

interface Props {
	vendors: VendorCommissionSummary[] | null;
	productStats: ProductIntentStat[] | null;
}

export default function ProductsSection({ vendors, productStats }: Props) {
	// Fetched only when this section is opened.
	const catalog = useApi<{ products: AdminProduct[] }>('/api/admin/products');
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState('');
	const [vendorId, setVendorId] = useState('');
	const all = catalog.data?.products ?? NO_PRODUCTS;
	const stats = useMemo(() => new Map((productStats ?? []).map((s) => [s.productId, s])), [productStats]);
	const filtered = useMemo(() => filterProducts(all, { query, category, vendorId }), [all, query, category, vendorId]);
	const options = useMemo(() => vendorOptions(vendors), [vendors]);
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

	return (
		<Card title="All listings" description={`${all.length} products`} id="products" flush>
			{catalog.error && (
				<div className="p-5">
					<ErrorNote message={catalog.error} onRetry={catalog.reload} />
				</div>
			)}
			<Toolbar>
				<SearchInput value={query} onChange={setQuery} label="Search products or vendors" />
				<FilterSelect label="Category" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
				<FilterSelect label="Vendor" value={vendorId} onChange={setVendorId} options={options} />
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
								<th className={th}>Visibility</th>
								<th className={th}>Category</th>
								<SortTh label="Price" column="price" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Intents" column="intents" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Commission" column="commission" sort={sort} onSort={toggle} align="right" />
								<SortTh label="Added" column="added" sort={sort} onSort={toggle} />
							</tr>
						</thead>
						<tbody className={tbody}>
							{sorted.map((p) => (
								<ProductRow key={p.id} product={p} stat={stats.get(p.id)} />
							))}
						</tbody>
					</table>
				</div>
			)}
			{catalog.data && sorted.length > 0 && <TableFoot shown={sorted.length} total={all.length} noun="products" />}
		</Card>
	);
}

function ProductRow({ product: p, stat }: { product: AdminProduct; stat: ProductIntentStat | undefined }) {
	const visibility = shopVisibility(p.vendorStatus);
	return (
		<tr className={row}>
			<td className={td}>
				<div className="flex items-center gap-3">
					<ProductImage title={p.title} imageUrl={p.imageUrl} category={p.category} className="size-9 shrink-0 rounded-md" />
					<a href={productPath(p.id)} target="_blank" rel="noopener" className="max-w-xs truncate font-medium text-ink no-underline hover:text-brand">
						{p.title}
					</a>
				</div>
			</td>
			<td className={`${td} text-ink-soft`}>{p.vendor.name}</td>
			<td className={td}>
				<Badge tone={visibility.tone}>{visibility.visible ? 'Visible' : `Hidden · ${visibility.label}`}</Badge>
			</td>
			<td className={`${td} text-ink-soft`}>{categoryBySlug(p.category).name}</td>
			<td className={`${td} text-right tabular-nums`}>{formatBdt(p.priceMinor)}</td>
			<td className={`${td} text-right tabular-nums`}>{stat?.orderIntents ?? 0}</td>
			<td className={`${td} text-right font-medium tabular-nums`}>{formatBdt(stat?.commissionMinor ?? 0)}</td>
			<td className={`${td} text-ink-soft`}>{formatDate(p.createdAt)}</td>
		</tr>
	);
}
