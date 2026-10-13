import { Coins, Inbox, MousePointerClick, Store, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { SessionUser } from '../../lib/auth';
import { formatBdt } from '../../lib/format';
import type { AdminSummary } from '../../lib/types';
import { Badge, Card, DashboardShell, EmptyState, ErrorNote, SessionGate, Stat, td, th, useRequiredSession } from './ui';

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
		<DashboardShell
			role="admin"
			user={user}
			title="Marketplace overview"
			description="Order intents from Order Now clicks and the commission each vendor owes."
		>
			{error && <ErrorNote message={error} />}
			{!summary && !error && <p className="m-0 text-sm text-ink-soft">Loading…</p>}

			{summary && (
				<>
					<div className="grid gap-4 min-[640px]:grid-cols-2 min-[1200px]:grid-cols-4">
						<Stat label="Vendors" value={String(summary.totals.vendors)} icon={Store} />
						<Stat label="Order intents" value={String(summary.totals.orderIntents)} icon={MousePointerClick} />
						<Stat label="Intent value" value={formatBdt(summary.totals.grossMinor)} icon={Wallet} />
						<Stat
							label="Commission owed"
							value={formatBdt(summary.totals.commissionOwedMinor)}
							icon={Coins}
							hint="Across all vendors"
						/>
					</div>

					<Card title="Vendors" description="Commission is calculated per order intent at the vendor's rate." id="vendors" flush>
						<div className="overflow-x-auto">
							<table className="w-full border-collapse text-sm">
								<thead>
									<tr>
										<th className={th}>Vendor</th>
										<th className={th}>WhatsApp</th>
										<th className={`${th} text-right`}>Products</th>
										<th className={`${th} text-right`}>Order intents</th>
										<th className={`${th} text-right`}>Intent value</th>
										<th className={`${th} text-right`}>Rate</th>
										<th className={`${th} text-right`}>Commission owed</th>
									</tr>
								</thead>
								<tbody className="[&>tr:last-child>td]:border-b-0">
									{summary.vendors.map((row) => (
										<tr key={row.vendor.id} className="hover:bg-canvas/50">
											<td className={`${td} font-medium`}>{row.vendor.name}</td>
											<td className={`${td} text-ink-soft tabular-nums`}>+{row.vendor.phone}</td>
											<td className={`${td} text-right tabular-nums`}>{row.productCount}</td>
											<td className={`${td} text-right tabular-nums`}>{row.orderIntentCount}</td>
											<td className={`${td} text-right tabular-nums`}>{formatBdt(row.grossMinor)}</td>
											<td className={`${td} text-right`}>
												<Badge>{row.vendor.commissionBps / 100}%</Badge>
											</td>
											<td className={`${td} text-right font-semibold tabular-nums`}>{formatBdt(row.commissionOwedMinor)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</Card>

					<Card title="Recent order intents" description="Latest 20 Order Now clicks." id="recent" flush>
						{summary.recentOrderIntents.length === 0 ? (
							<EmptyState icon={Inbox} title="No order intents yet" text="They appear here when buyers tap Order Now." />
						) : (
							<div className="overflow-x-auto">
								<table className="w-full border-collapse text-sm">
									<thead>
										<tr>
											<th className={th}>Product</th>
											<th className={`${th} text-right`}>Price</th>
											<th className={`${th} text-right`}>Commission</th>
											<th className={th}>Time</th>
										</tr>
									</thead>
									<tbody className="[&>tr:last-child>td]:border-b-0">
										{summary.recentOrderIntents.map((intent) => (
											<tr key={intent.id} className="hover:bg-canvas/50">
												<td className={`${td} font-medium`}>{intent.productTitle ?? intent.productId}</td>
												<td className={`${td} text-right tabular-nums`}>{formatBdt(intent.priceMinor)}</td>
												<td className={`${td} text-right tabular-nums`}>{formatBdt(intent.commissionMinor)}</td>
												<td className={`${td} text-ink-soft`}>{dateTime.format(new Date(intent.createdAt))}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</Card>
				</>
			)}
		</DashboardShell>
	);
}
