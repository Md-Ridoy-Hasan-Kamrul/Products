import { useEffect, useState, type FormEvent } from 'react';
import { apiFetch } from '../../lib/api';
import type { SessionUser } from '../../lib/auth';
import { CATEGORIES, categoryBySlug } from '../../lib/categories';
import { formatBdt } from '../../lib/format';
import type { Product, Vendor } from '../../lib/types';
import { productPath } from '../../lib/whatsapp';
import ProductImage from '../products/ProductImage';
import { DashboardHeader, ErrorNote, Panel, SessionGate, Stat, field, primaryButton, useRequiredSession } from './ui';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function readAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

export default function VendorDashboard() {
	const session = useRequiredSession('vendor');
	return <SessionGate state={session}>{(user) => <Shop user={user} />}</SessionGate>;
}

function Shop({ user }: { user: SessionUser }) {
	const [vendor, setVendor] = useState<Vendor | null>(null);
	const [products, setProducts] = useState<Product[]>([]);
	const [error, setError] = useState<string | null>(null);

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

	const catalogValue = products.reduce((sum, product) => sum + product.priceMinor, 0);

	return (
		<div className="grid grid-cols-1 gap-6">
			<DashboardHeader eyebrow="Seller Center" title={vendor?.name ?? 'Your shop'} user={user} role="vendor" />
			{error && <ErrorNote message={error} />}

			<div className="grid gap-4 min-[640px]:grid-cols-3">
				<Stat label="Products" value={String(products.length)} accent />
				<Stat label="Catalog value" value={formatBdt(catalogValue)} />
				<Stat label="Commission rate" value={vendor ? `${vendor.commissionBps / 100}%` : '—'} />
			</div>

			<div className="grid grid-cols-1 items-start gap-6 min-[960px]:grid-cols-[22rem_minmax(0,1fr)]">
				<AddProductForm onAdded={(product) => setProducts((list) => [...list, product])} />

				<Panel title={`Your products (${products.length})`} id="my-products">
					{products.length === 0 ? (
						<p className="m-0 text-ink-soft">No products yet. Add your first one.</p>
					) : (
						<ul className="m-0 list-none divide-y divide-line p-0">
							{products.map((product) => (
								<li key={product.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
									<ProductImage
										title={product.title}
										imageUrl={product.imageUrl}
										category={product.category}
										className="size-14 shrink-0"
									/>
									<div className="min-w-0 flex-1">
										<a href={productPath(product.id)} className="block truncate font-medium text-ink no-underline hover:text-brand">
											{product.title}
										</a>
										<p className="m-0 text-xs text-ink-soft">{categoryBySlug(product.category).name}</p>
									</div>
									<p className="m-0 shrink-0 font-semibold whitespace-nowrap">{formatBdt(product.priceMinor)}</p>
								</li>
							))}
						</ul>
					)}
				</Panel>
			</div>
		</div>
	);
}

function AddProductForm({ onAdded }: { onAdded: (product: Product) => void }) {
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [preview, setPreview] = useState<string | null>(null);

	useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		const file = data.get('image');
		setError(null);
		setMessage(null);

		const image = file instanceof File && file.size > 0 ? file : null;
		if (image && (!IMAGE_TYPES.includes(image.type) || image.size > MAX_IMAGE_BYTES)) {
			setError('Image must be PNG, JPEG, or WebP, 2 MB or less.');
			return;
		}

		setSaving(true);
		try {
			let imageUrl: string | null = null;
			if (image) {
				const upload = await apiFetch<{ url: string }>('/api/uploads', {
					method: 'POST',
					body: JSON.stringify({ dataUrl: await readAsDataUrl(image) }),
				});
				imageUrl = upload.url;
			}

			const { product } = await apiFetch<{ product: Product }>('/api/vendor/products', {
				method: 'POST',
				body: JSON.stringify({
					title: data.get('title'),
					description: data.get('description'),
					category: data.get('category'),
					priceMinor: Math.round(Number(data.get('price')) * 100),
					imageUrl,
				}),
			});
			onAdded(product);
			form.reset();
			setPreview(null);
			setMessage(`“${product.title}” is live. It shows on the storefront after the next build.`);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setSaving(false);
		}
	}

	return (
		<Panel title="Add a product" id="add-product">
			<form onSubmit={submit} className="grid gap-4">
				<label className="text-sm font-medium">
					Product name
					<input name="title" required minLength={2} maxLength={200} className={field} />
				</label>
				<label className="text-sm font-medium">
					Category
					<select name="category" required className={field} defaultValue={CATEGORIES[0]!.slug}>
						{CATEGORIES.map((category) => (
							<option key={category.slug} value={category.slug}>
								{category.name}
							</option>
						))}
					</select>
				</label>
				<label className="text-sm font-medium">
					Price (BDT)
					<input name="price" type="number" required min="1" step="0.01" inputMode="decimal" className={field} />
				</label>
				<label className="text-sm font-medium">
					Description <span className="font-normal text-ink-soft">(optional)</span>
					<textarea name="description" rows={3} maxLength={2000} className={field} />
				</label>
				<label className="text-sm font-medium">
					Product image <span className="font-normal text-ink-soft">(optional)</span>
					<input
						name="image"
						type="file"
						accept={IMAGE_TYPES.join(',')}
						className={`${field} file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-1 file:font-semibold file:text-brand`}
						onChange={(e) => {
							const picked = e.currentTarget.files?.[0];
							setPreview(picked ? URL.createObjectURL(picked) : null);
						}}
					/>
				</label>
				{preview && <img src={preview} alt="Selected product preview" className="aspect-square w-32 rounded-lg object-cover" />}
				{error && <ErrorNote message={error} />}
				{message && (
					<p role="status" className="m-0 rounded-lg bg-green-50 p-3 text-sm text-wa-deep">
						{message}
					</p>
				)}
				<button type="submit" disabled={saving} className={primaryButton}>
					{saving ? 'Saving…' : 'Add product'}
				</button>
			</form>
		</Panel>
	);
}
