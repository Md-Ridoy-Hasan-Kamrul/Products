import { ImagePlus, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { apiFetch } from '../../lib/api';
import { CATEGORIES } from '../../lib/categories';
import type { Product } from '../../lib/types';
import { ErrorNote, field, iconButton, primaryButton, secondaryButton } from './ui';

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

/** Closes on Escape and locks page scroll while a panel or dialog is open. */
function useModal(onClose: () => void) {
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
		window.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
		};
	}, [onClose]);
}

function Backdrop({ onClose }: { onClose: () => void }) {
	return <button type="button" aria-label="Close" tabIndex={-1} className="absolute inset-0 bg-ink/40" onClick={onClose} />;
}

export function ProductDrawer({
	product,
	onClose,
	onSaved,
}: {
	/** null to add a new product. */
	product: Product | null;
	onClose: () => void;
	onSaved: (product: Product) => void;
}) {
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [keptImage, setKeptImage] = useState<string | null>(product?.imageUrl ?? null);
	const fileInput = useRef<HTMLInputElement>(null);
	const firstField = useRef<HTMLInputElement>(null);
	useModal(onClose);
	useEffect(() => firstField.current?.focus(), []);
	useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

	const shownImage = preview ?? keptImage;
	const heading = product ? 'Edit product' : 'Add a product';

	function removeImage() {
		setPreview(null);
		setKeptImage(null);
		if (fileInput.current) fileInput.current.value = '';
	}

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
			let imageUrl = keptImage;
			if (image) {
				const upload = await apiFetch<{ url: string }>('/api/uploads', {
					method: 'POST',
					body: JSON.stringify({ dataUrl: await readAsDataUrl(image) }),
				});
				imageUrl = upload.url;
			}

			const body = JSON.stringify({
				title: data.get('title'),
				description: data.get('description'),
				category: data.get('category'),
				priceMinor: Math.round(Number(data.get('price')) * 100),
				imageUrl,
			});
			const { product: result } = product
				? await apiFetch<{ product: Product }>(`/api/vendor/products/${encodeURIComponent(product.id)}`, {
						method: 'PATCH',
						body,
					})
				: await apiFetch<{ product: Product }>('/api/vendor/products', { method: 'POST', body });
			onSaved(result);
		} catch (e) {
			setError((e as Error).message);
			setSaving(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex justify-end">
			<Backdrop onClose={onClose} />
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="product-drawer-title"
				className="relative flex h-full w-full max-w-lg flex-col bg-surface shadow-2xl"
			>
				<div className="flex items-center justify-between border-b border-line px-6 py-4">
					<div>
						<h2 id="product-drawer-title" className="m-0 text-lg font-semibold">
							{heading}
						</h2>
						<p className="m-0 text-sm text-ink-soft">
							{product ? 'Changes go live as soon as you save.' : 'It goes live as soon as you save.'}
						</p>
					</div>
					<button type="button" onClick={onClose} className={iconButton}>
						<X className="size-5" aria-hidden="true" />
						<span className="sr-only">Close panel</span>
					</button>
				</div>

				<form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
					<div className="grid flex-1 content-start gap-5 overflow-y-auto px-6 py-5">
						<label className="text-sm font-medium">
							Product name
							<input
								ref={firstField}
								name="title"
								required
								minLength={2}
								maxLength={200}
								defaultValue={product?.title}
								className={field}
							/>
						</label>
						<div className="grid gap-5 min-[480px]:grid-cols-2">
							<label className="text-sm font-medium">
								Category
								<select name="category" required className={field} defaultValue={product?.category ?? CATEGORIES[0]!.slug}>
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
									defaultValue={product ? product.priceMinor / 100 : undefined}
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
								defaultValue={product?.description}
								className={field}
							/>
						</label>
						<div className="text-sm font-medium">
							<label htmlFor="product-image">
								Product image <span className="font-normal text-ink-soft">(optional)</span>
							</label>
							<div className="mt-1.5 flex items-center gap-4 rounded-lg border border-dashed border-line p-4">
								{shownImage ? (
									<img src={shownImage} alt="Product image preview" className="size-16 rounded-md object-cover" />
								) : (
									<span className="grid size-16 place-items-center rounded-md bg-canvas text-ink-soft" aria-hidden="true">
										<ImagePlus className="size-6" strokeWidth={1.5} />
									</span>
								)}
								<div className="font-normal">
									<label htmlFor="product-image" className="cursor-pointer font-semibold text-brand hover:underline">
										{shownImage ? 'Change image' : 'Upload an image'}
									</label>
									{shownImage && (
										<button
											type="button"
											onClick={removeImage}
											className="ml-3 text-sm font-semibold text-ink-soft hover:text-red-700"
										>
											Remove
										</button>
									)}
									<span className="block text-xs text-ink-soft">PNG, JPEG, or WebP up to 2 MB</span>
								</div>
							</div>
							<input
								ref={fileInput}
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
							{saving ? 'Saving…' : product ? 'Save changes' : 'Save product'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

export function DeleteDialog({
	product,
	onClose,
	onDeleted,
}: {
	product: Product;
	onClose: () => void;
	onDeleted: (product: Product) => void;
}) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const cancel = useRef<HTMLButtonElement>(null);
	useModal(onClose);
	useEffect(() => cancel.current?.focus(), []);

	async function confirm() {
		setBusy(true);
		setError(null);
		try {
			await apiFetch(`/api/vendor/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' });
			onDeleted(product);
		} catch (e) {
			setError((e as Error).message);
			setBusy(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 grid place-items-center p-4">
			<Backdrop onClose={onClose} />
			<div
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="delete-title"
				aria-describedby="delete-text"
				className="relative w-full max-w-md rounded-xl bg-surface p-6 shadow-2xl"
			>
				<div className="flex gap-4">
					<span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-700" aria-hidden="true">
						<Trash2 className="size-5" />
					</span>
					<div className="min-w-0">
						<h2 id="delete-title" className="m-0 text-base font-semibold">
							Delete this product?
						</h2>
						<p id="delete-text" className="m-0 mt-1 text-sm text-ink-soft">
							<Strong>{product.title}</Strong> will be removed from your shop. Past order intents and commission stay
							on record.
						</p>
					</div>
				</div>
				{error && (
					<div className="mt-4">
						<ErrorNote message={error} />
					</div>
				)}
				<div className="mt-6 flex justify-end gap-3">
					<button ref={cancel} type="button" onClick={onClose} className={secondaryButton}>
						Cancel
					</button>
					<button
						type="button"
						onClick={confirm}
						disabled={busy}
						className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-60"
					>
						{busy ? 'Deleting…' : 'Delete product'}
					</button>
				</div>
			</div>
		</div>
	);
}

function Strong({ children }: { children: ReactNode }) {
	return <span className="font-semibold text-ink">{children}</span>;
}
