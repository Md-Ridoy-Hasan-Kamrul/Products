import { ArrowRight } from 'lucide-react';
import type { FormEvent } from 'react';
import { normalizeBdPhone, toLocalBdPhone } from '../../../lib/dashboard';
import { formatBdt, formatDate, formatPercent } from '../../../lib/format';
import type { Vendor } from '../../../lib/types';
import { useAsyncAction } from '../hooks/useAsyncAction';
import type { VendorWorkspace } from '../hooks/useVendorWorkspace';
import { Badge, Card, Detail, ErrorNote, field, primaryButton } from '../ui';

interface Props {
	workspace: VendorWorkspace;
	email: string;
	onSaved: () => void;
}

export default function ShopSection({ workspace, email, onSaved }: Props) {
	const { vendor, visibility, insights } = workspace;
	const totals = insights.data?.totals;

	return (
		<div className="grid gap-6 min-[1024px]:grid-cols-2">
			<Card title="Shop details" description="Buyers see your shop name. Orders go to your WhatsApp number." id="shop-details">
				{vendor ? <ShopForm vendor={vendor} onSave={workspace.saveShop} onSaved={onSaved} /> : <div className="h-40 animate-pulse rounded-lg bg-canvas" />}
			</Card>
			<Card title="Account & billing" id="billing">
				<dl className="m-0 grid gap-4 text-sm">
					<Detail label="Shop status">{visibility ? <Badge tone={visibility.tone}>{visibility.label}</Badge> : '—'}</Detail>
					<Detail label="Login email">{email}</Detail>
					<Detail label="Seller since">{vendor ? formatDate(vendor.createdAt) : '—'}</Detail>
					<Detail label="Commission rate">{vendor ? `${formatPercent(vendor.commissionBps)} of the price, per order intent` : '—'}</Detail>
					<Detail label="Order intents to date">{totals ? totals.orderIntents : '—'}</Detail>
					<Detail label="Commission owed">{totals ? formatBdt(totals.commissionOwedMinor) : '—'}</Detail>
				</dl>
				<p className="m-0 mt-5 rounded-lg bg-canvas p-4 text-xs leading-relaxed text-ink-soft">
					Each Order Now click records the product's price and your rate at that moment. Changing a price later does not change
					past commission. Monthly statements are coming soon.
				</p>
				{vendor && visibility?.visible && (
					<a
						href={`/search?q=${encodeURIComponent(vendor.name)}`}
						className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand no-underline hover:underline"
					>
						See your shop on the storefront <ArrowRight className="size-4" aria-hidden="true" />
					</a>
				)}
			</Card>
		</div>
	);
}

function ShopForm({
	vendor,
	onSave,
	onSaved,
}: {
	vendor: Vendor;
	onSave: VendorWorkspace['saveShop'];
	onSaved: () => void;
}) {
	const { busy, error, setError, run } = useAsyncAction();

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const phone = normalizeBdPhone(String(data.get('phone')));
		if (!phone) {
			setError('Enter a Bangladeshi mobile number, e.g. 01711000000.');
			return;
		}
		if (await run(() => onSave({ name: String(data.get('name')).trim(), phone }))) onSaved();
	}

	return (
		<form onSubmit={submit} className="grid gap-5">
			<label className="text-sm font-medium">
				Shop name
				<input name="name" required minLength={2} maxLength={100} defaultValue={vendor.name} className={field} />
			</label>
			<label className="text-sm font-medium">
				WhatsApp number
				<input name="phone" required inputMode="tel" autoComplete="tel" defaultValue={toLocalBdPhone(vendor.phone)} className={field} />
				<span className="mt-1 block text-xs font-normal text-ink-soft">Every Order Now message goes to this number.</span>
			</label>
			{error && <ErrorNote message={error} />}
			<div>
				<button type="submit" disabled={busy} className={primaryButton}>
					{busy ? 'Saving…' : 'Save shop details'}
				</button>
			</div>
		</form>
	);
}
