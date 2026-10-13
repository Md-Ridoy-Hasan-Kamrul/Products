import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { SessionUser } from '../../lib/auth';
import { formatBdt } from '../../lib/format';
import type { AdminSummary } from '../../lib/types';
import { DashboardHeader, ErrorNote, Panel, SessionGate, Stat, useRequiredSession } from './ui';

const cell = 'border-b border-line px-3 py-2.5 text-left whitespace-nowrap';
const dateTime = new Intl.DateTimeFormat('en-BD', { dateStyle: 'medium', timeStyle: 'short' });

export default function AdminDashboard() {
	const session = useRequiredSession('admin');
	return <SessionGate state={session}>{(user) => <Overview user={user} />}</SessionGate>;
}

function Overview({ user }: { user: SessionUser }) {
	const [summary, setSummary] = useState<AdminSummary | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		apiFetch<AdminSummary>('/api/admin/summary')
			.then(setSummary)
			.catch((e: Error) => setError(e.message));
	}, []);

	return (
		<div className="grid gap-6">
			<DashboardHeader eyebrow="Admin" title="Order intents & commission" user={user} role="admin" />
			{error && <ErrorNote message={error} />}
			{!summary && !error && <p className="text-ink-soft">Loading…</p>}

			{summary && (
				<>
					<div className="grid gap-4 min-[640px]:grid-cols-2 min-[960px]:grid-cols-4">
						<Stat label="Vendors" value={String(summary.totals.vendors)} />
						<Stat label="Order intents" value={String(summary.totals.orderIntents)} />
						<Stat label="Intent value" value={formatBdt(summary.totals.grossMinor)} />
						<Stat label="Commission owed" value={formatBdt(summary.totals.commissionOwedMinor)} accent />
					</div>

					<Panel title="Vendors" id="vendors">
						<div className="overflow-x-auto">
							<table className="w-full border-collapse text-sm">
								<thead className="text-ink-soft">
									<tr>
										<th className={cell}>Vendor</th>
										<th className={cell}>WhatsApp</th>
										<th className={`${cell} text-right`}>Products</th>
										<th className={`${cell} text-right`}>Order intents</th>
										<th className={`${cell} text-right`}>Intent value</th>
										<th className={`${cell} text-right`}>Rate</th>
										<th className={`${cell} text-right`}>Commission owed</th>
									</tr>
								</thead>
								<tbody>
									{summary.vendors.map((row) => (
										<tr key={row.vendor.id}>
											<td className={`${cell} font-medium`}>{row.vendor.name}</td>
											<td className={cell}>+{row.vendor.phone}</td>
											<td className={`${cell} text-right`}>{row.productCount}</td>
											<td className={`${cell} text-right`}>{row.orderIntentCount}</td>
											<td className={`${cell} text-right`}>{formatBdt(row.grossMinor)}</td>
											<td className={`${cell} text-right`}>{row.vendor.commissionBps / 100}%</td>
											<td className={`${cell} text-right font-bold text-brand`}>{formatBdt(row.commissionOwedMinor)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</Panel>

					<Panel title="Recent order intents" id="recent">
						{summary.recentOrderIntents.length === 0 ? (
							<p className="m-0 text-ink-soft">No Order Now clicks yet.</p>
						) : (
							<ul className="m-0 grid list-none gap-1 p-0 text-sm">
								{summary.recentOrderIntents.map((intent) => (
									<li key={intent.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-2 hover:bg-canvas">
										<span className="font-medium">{intent.productTitle ?? intent.productId}</span>
										<span className="text-ink-soft">
											{formatBdt(intent.priceMinor)} · commission {formatBdt(intent.commissionMinor)} ·{' '}
											{dateTime.format(new Date(intent.createdAt))}
										</span>
									</li>
								))}
							</ul>
						)}
					</Panel>
				</>
			)}
		</div>
	);
}
