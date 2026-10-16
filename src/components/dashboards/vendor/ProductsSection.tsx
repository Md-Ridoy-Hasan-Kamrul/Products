import { Check, Link2, Package, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { CATEGORIES, categoryBySlug } from '../../../lib/categories';
import { filterProducts, productShareUrl, type ShopVisibility } from '../../../lib/dashboard';
import { formatBdt, formatDate } from '../../../lib/format';
import type { Product } from '../../../lib/types';
import { productPath } from '../../../lib/whatsapp';
import ProductImage from '../../products/ProductImage';
import { useCopyLink } from '../hooks/useCopyLink';
import { useSort } from '../hooks/useSort';
import type { VendorWorkspace } from '../hooks/useVendorWorkspace';
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
	iconButton,
	row,
	table,
	tbody,
	td,
	th,
} from '../ui';

const NO_PRODUCTS: Product[] = [];
const CATEGORY_OPTIONS = [{ value: '', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c.slug, label: c.name }))];

interface Props {
	workspace: VendorWorkspace;
	addButton: ReactNode;
	onEdit: (product: Product) => void;
	onDelete: (product: Product) => void;
}

export default function ProductsSection({ workspace, addButton, onEdit, onDelete }: Props) {
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState('');
	const all = workspace.products ?? NO_PRODUCTS;
	const { intentsByProduct } = workspace;
	const filtered = useMemo(() => filterProducts(all, { query, category }), [all, query, category]);
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

	if (workspace.products?.length === 0) {
		return (
			<Card title="All products" id="my-products" flush>
				<EmptyState icon={Package} title="No products yet" text="Add your first product and buyers can order it on WhatsApp." action={addButton} />
			</Card>
		);
	}

	return (
		<Card title="All products" description={`${all.length} listed`} id="my-products" flush>
			<Toolbar>
				<SearchInput value={query} onChange={setQuery} label="Search your products" />
				<FilterSelect label="Category" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
			</Toolbar>
			{!workspace.products ? (
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
								<ProductRow
									key={product.id}
									product={product}
									intents={intentsByProduct.get(product.id) ?? 0}
									visibility={workspace.visibility}
									onEdit={onEdit}
									onDelete={onDelete}
								/>
							))}
						</tbody>
					</table>
				</div>
			)}
			{workspace.products && sorted.length > 0 && <TableFoot shown={sorted.length} total={all.length} noun="products" />}
		</Card>
	);
}

function ProductRow({
	product,
	intents,
	visibility,
	onEdit,
	onDelete,
}: {
	product: Product;
	intents: number;
	visibility: ShopVisibility | null;
	onEdit: (product: Product) => void;
	onDelete: (product: Product) => void;
}) {
	return (
		<tr className={row}>
			<td className={td}>
				<div className="flex items-center gap-3">
					<ProductImage title={product.title} imageUrl={product.imageUrl} category={product.category} className="size-10 shrink-0 rounded-md" />
					<a
						href={productPath(product.id)}
						target="_blank"
						rel="noopener"
						className="max-w-xs truncate font-medium text-ink no-underline hover:text-brand"
					>
						{product.title}
					</a>
				</div>
			</td>
			<td className={`${td} text-ink-soft`}>{categoryBySlug(product.category).name}</td>
			<td className={`${td} text-right font-medium tabular-nums`}>{formatBdt(product.priceMinor)}</td>
			<td className={`${td} text-right tabular-nums`}>{intents}</td>
			<td className={td}>{visibility && <Badge tone={visibility.tone}>{visibility.label}</Badge>}</td>
			<td className={`${td} text-ink-soft`}>{formatDate(product.updatedAt)}</td>
			<td className={`${td} text-right`}>
				<div className="inline-flex gap-1">
					{visibility?.visible && <CopyLinkButton product={product} />}
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
	);
}

function CopyLinkButton({ product }: { product: Product }) {
	const { copied, copy } = useCopyLink();
	const done = copied === product.id;
	return (
		<button
			type="button"
			className={`${iconButton} ${done ? 'text-green-700' : ''}`}
			aria-label={done ? 'Link copied' : `Copy link to ${product.title}`}
			title={done ? 'Copied' : 'Copy link to share'}
			onClick={() => copy(product.id, productShareUrl(window.location.origin, product.id))}
		>
			{done ? <Check className="size-4" aria-hidden="true" /> : <Link2 className="size-4" aria-hidden="true" />}
		</button>
	);
}
