import { CheckCircle2, ImagePlus, Package, Percent, Plus, Wallet, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiFetch } from '../../lib/api';
import type { SessionUser } from '../../lib/auth';
import { CATEGORIES, categoryBySlug } from '../../lib/categories';
import { formatBdt } from '../../lib/format';
import type { Product, Vendor } from '../../lib/types';
import { productPath } from '../../lib/whatsapp';
import ProductImage from '../products/ProductImage';
import {
	Badge,
	Card,
	DashboardShell,
	EmptyState,
	ErrorNote,
	SessionGate,
	Stat,
	field,
	primaryButton,
	secondaryButton,
	td,
	th,
	useRequiredSession,
} from './ui';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const addedOn = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium' });

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
	const [adding, setAdding] = useState(false);
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

	const catalogValue = products.reduce((sum, product) => sum + product.priceMinor, 0);
	const addButton = (
		<button type="button" className={primaryButton} onClick={() => setAdding(true)}>
			<Plus className="size-4" aria-hidden="true" /> Add product
		</button>
	);

	return (
		<DashboardShell
			role="vendor"
			user={user}
			title={vendor?.name ?? user.name}
			description="Manage your products. Buyers order them on WhatsApp."
			actions={addButton}
		>
			{error && <ErrorNote message={error} />}
			{notice && (
				<p role="status" className="m-0 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
					<CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
					{notice}
				</p>
			)}

			<div className="grid gap-4 min-[640px]:grid-cols-3">
				<Stat label="Products" value={String(products.length)} icon={Package} hint="Live on the storefront" />
				<Stat label="Catalog value" value={formatBdt(catalogValue)} icon={Wallet} hint="Sum of listed prices" />
				<Stat
					label="Commission rate"
					value={vendor ? `${vendor.commissionBps / 100}%` : '—'}
					icon={Percent}
					hint="Charged per order intent"
				/>
			</div>

			<Card title="Products" description={`${products.length} listed`} id="my-products" flush>
				{products.length === 0 ? (
					<EmptyState
						icon={Package}
						title="No products yet"
						text="Add your first product and buyers can order it on WhatsApp right away."
						action={addButton}
					/>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr>
									<th className={th}>Product</th>
									<th className={th}>Category</th>
									<th className={`${th} text-right`}>Price</th>
									<th className={th}>Status</th>
									<th className={th}>Added</th>
								</tr>
							</thead>
							<tbody className="[&>tr:last-child>td]:border-b-0">
								{products.map((product) => (
									<tr key={product.id} className="hover:bg-canvas/50">
										<td className={td}>
											<div className="flex items-center gap-3">
												<ProductImage
													title={product.title}
													imageUrl={product.imageUrl}
													category={product.category}
													className="size-10 shrink-0 rounded-md"
												/>
												<a
													href={productPath(product.id)}
													className="max-w-xs truncate font-medium text-ink no-underline hover:text-brand"
												>
													{product.title}
												</a>
											</div>
										</td>
										<td className={`${td} text-ink-soft`}>{categoryBySlug(product.category).name}</td>
										<td className={`${td} text-right font-medium tabular-nums`}>{formatBdt(product.priceMinor)}</td>
										<td className={td}>
											<Badge tone="success">Live</Badge>
										</td>
										<td className={`${td} text-ink-soft`}>{addedOn.format(new Date(product.createdAt))}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>

			{adding && (
				<AddProductDrawer
					onClose={() => setAdding(false)}
					onAdded={(product) => {
						setProducts((list) => [product, ...list]);
						setAdding(false);
						setNotice(`“${product.title}” is live. It shows on the storefront after the next build.`);
					}}
				/>
			)}
		</DashboardShell>
	);
}

function AddProductDrawer({ onClose, onAdded }: { onClose: () => void; onAdded: (product: Product) => void }) {
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const firstField = useRef<HTMLInputElement>(null);

	useEffect(() => {
		firstField.current?.focus();
		const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
		window.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
		};
	}, [onClose]);

	useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const file = data.get('image');
		setError(null);

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
		} catch (e) {
			setError((e as Error).message);
			setSaving(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex justify-end">
			<button type="button" aria-label="Close" tabIndex={-1} className="absolute inset-0 bg-ink/40" onClick={onClose} />
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="add-product-title"
				className="relative flex h-full w-full max-w-lg flex-col bg-surface shadow-2xl"
			>
				<div className="flex items-center justify-between border-b border-line px-6 py-4">
					<div>
						<h2 id="add-product-title" className="m-0 text-lg font-semibold">
							Add a product
						</h2>
						<p className="m-0 text-sm text-ink-soft">It goes live as soon as you save.</p>
					</div>
					<button type="button" onClick={onClose} className="rounded-lg p-2 text-ink-soft hover:bg-canvas hover:text-ink">
						<X className="size-5" aria-hidden="true" />
						<span className="sr-only">Close panel</span>
					</button>
				</div>

				<form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
					<div className="grid flex-1 content-start gap-5 overflow-y-auto px-6 py-5">
						<label className="text-sm font-medium">
							Product name
							<input ref={firstField} name="title" required minLength={2} maxLength={200} className={field} />
						</label>
						<div className="grid gap-5 min-[480px]:grid-cols-2">
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
								<input
									name="price"
									type="number"
									required
									min="1"
									step="0.01"
									inputMode="decimal"
									placeholder="0.00"
									className={field}
								/>
							</label>
						</div>
						<label className="text-sm font-medium">
							Description <span className="font-normal text-ink-soft">(optional)</span>
							<textarea
								name="description"
								rows={4}
								maxLength={2000}
								placeholder="Size, material, what's in the box…"
								className={field}
							/>
						</label>
						<div className="text-sm font-medium">
							<label htmlFor="product-image">
								Product image <span className="font-normal text-ink-soft">(optional)</span>
							</label>
							<label
								htmlFor="product-image"
								className="mt-1.5 flex cursor-pointer items-center gap-4 rounded-lg border border-dashed border-line p-4 hover:border-brand/50 hover:bg-canvas/50"
							>
								{preview ? (
									<img src={preview} alt="Selected product preview" className="size-16 rounded-md object-cover" />
								) : (
									<span className="grid size-16 place-items-center rounded-md bg-canvas text-ink-soft" aria-hidden="true">
										<ImagePlus className="size-6" strokeWidth={1.5} />
									</span>
								)}
								<span className="font-normal">
									<span className="block font-semibold text-brand">{preview ? 'Change image' : 'Upload an image'}</span>
									<span className="block text-xs text-ink-soft">PNG, JPEG, or WebP up to 2 MB</span>
								</span>
							</label>
							<input
								id="product-image"
								name="image"
								type="file"
								accept={IMAGE_TYPES.join(',')}
								className="sr-only"
								onChange={(e) => {
									const picked = e.currentTarget.files?.[0];
									setPreview(picked ? URL.createObjectURL(picked) : null);
								}}
							/>
						</div>
						{error && <ErrorNote message={error} />}
					</div>

					<div className="flex justify-end gap-3 border-t border-line bg-canvas/40 px-6 py-4">
						<button type="button" onClick={onClose} className={secondaryButton}>
							Cancel
						</button>
						<button type="submit" disabled={saving} className={primaryButton}>
							{saving ? 'Saving…' : 'Save product'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
