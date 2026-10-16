import { MessageCircle, ReceiptText, X } from 'lucide-react';
import { useCallback, useEffect, useRef, type FormEvent } from 'react';
import { adminActionsFor, bpsToPercentInput, percentInputToBps, shopVisibility, type AdminAction } from '../../../lib/dashboard';
import { formatDate, formatPercent } from '../../../lib/format';
import type { Vendor } from '../../../lib/types';
import type { VendorChanges } from '../hooks/useAdminWorkspace';
import { useAsyncAction } from '../hooks/useAsyncAction';
import { useModal } from '../hooks/useModal';
import { Backdrop, Badge, Detail, ErrorNote, field, iconButton, primaryButton, secondaryButton } from '../ui';

interface Props {
	vendor: Vendor;
	onClose: () => void;
	onSave: (changes: VendorChanges) => Promise<Vendor>;
	/** Called with the saved vendor and a short description of what changed. */
	onSaved: (vendor: Vendor, message: string) => void;
	onShowIntents: () => void;
}

const ACTION_STYLE: Record<AdminAction['tone'], string> = {
	primary: primaryButton,
	danger:
		'inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-60',
};

export default function VendorDialog({ vendor, onClose, onSave, onSaved, onShowIntents }: Props) {
	const { busy, error, setError, run } = useAsyncAction();
	const closeButton = useRef<HTMLButtonElement>(null);
	const close = useCallback(() => !busy && onClose(), [busy, onClose]);
	useModal(close);
	useEffect(() => closeButton.current?.focus(), []);
	const visibility = shopVisibility(vendor.status);

	async function save(changes: VendorChanges, message: string) {
		let saved: Vendor | undefined;
		if (await run(async () => (saved = await onSave(changes)))) onSaved(saved!, message);
	}

	function saveRate(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const bps = percentInputToBps(String(new FormData(event.currentTarget).get('rate')));
		if (bps === null) {
			setError('Enter a rate from 0 to 100, e.g. 10 or 7.5.');
			return;
		}
		save({ commissionBps: bps }, `rate set to ${formatPercent(bps)} for new order intents.`);
	}

	return (
		<div className="fixed inset-0 z-50 grid place-items-center p-4">
			<Backdrop onClose={close} />
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="vendor-dialog-title"
				className="relative max-h-full w-full max-w-lg overflow-y-auto rounded-xl bg-surface shadow-2xl"
			>
				<div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
					<div className="min-w-0">
						<h2 id="vendor-dialog-title" className="m-0 truncate text-lg font-semibold">
							{vendor.name}
						</h2>
						<p className="m-0 mt-1 flex items-center gap-2 text-sm text-ink-soft">
							<Badge tone={visibility.tone}>{visibility.label}</Badge> Seller since {formatDate(vendor.createdAt)}
						</p>
					</div>
					<button ref={closeButton} type="button" onClick={close} className={iconButton}>
						<X className="size-5" aria-hidden="true" />
						<span className="sr-only">Close</span>
					</button>
				</div>

				<div className="grid gap-6 px-6 py-5">
					<section aria-labelledby="vendor-status-title">
						<h3 id="vendor-status-title" className="m-0 text-sm font-semibold">
							Shop status
						</h3>
						<p className="m-0 mt-1 text-sm text-ink-soft">
							{visibility.visible ? 'Buyers can see and order this shop’s products.' : 'This shop’s products are hidden from buyers.'}
						</p>
						<div className="mt-3 flex flex-wrap gap-2">
							{adminActionsFor(vendor.status).map((action) => (
								<button
									key={action.label}
									type="button"
									disabled={busy}
									className={ACTION_STYLE[action.tone]}
									onClick={() => save({ status: action.status }, action.result)}
								>
									{action.label}
								</button>
							))}
						</div>
					</section>

					<form onSubmit={saveRate} aria-labelledby="vendor-rate-title">
						<h3 id="vendor-rate-title" className="m-0 text-sm font-semibold">
							Commission rate
						</h3>
						<p className="m-0 mt-1 text-sm text-ink-soft">Applies to new order intents. Past intents keep the rate they were made at.</p>
						<div className="mt-3 flex items-end gap-2">
							<label className="text-sm font-medium">
								Rate (%)
								<input
									name="rate"
									inputMode="decimal"
									required
									defaultValue={bpsToPercentInput(vendor.commissionBps)}
									className={`${field} w-28`}
								/>
							</label>
							<button type="submit" disabled={busy} className={secondaryButton}>
								Save rate
							</button>
						</div>
					</form>

					<dl className="m-0 grid gap-3 rounded-lg bg-canvas p-4 text-sm">
						<Detail label="WhatsApp">+{vendor.phone}</Detail>
						<Detail label="Vendor ID">
							<code className="text-xs">{vendor.id}</code>
						</Detail>
					</dl>

					{error && <ErrorNote message={error} />}
				</div>

				<div className="flex flex-wrap justify-end gap-2 border-t border-line bg-canvas/40 px-6 py-4">
					<a href={`https://wa.me/${vendor.phone}`} target="_blank" rel="noopener noreferrer" className={`${secondaryButton} no-underline`}>
						<MessageCircle className="size-4" aria-hidden="true" /> Message on WhatsApp
					</a>
					<button type="button" className={secondaryButton} onClick={onShowIntents}>
						<ReceiptText className="size-4" aria-hidden="true" /> View order intents
					</button>
				</div>
			</div>
		</div>
	);
}
