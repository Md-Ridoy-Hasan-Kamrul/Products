import { ArrowRight, CheckCircle2, Circle, Coins, MousePointerClick, Package, Percent } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { PREVIEW_ROWS, TOP_LIST_LIMIT } from '../../../lib/constants';
import { onboardingSteps, type OnboardingStep } from '../../../lib/dashboard';
import { formatBdt, formatPercent } from '../../../lib/format';
import type { Product } from '../../../lib/types';
import ProductImage from '../../products/ProductImage';
import ActivityChart from '../ActivityChart';
import type { VendorWorkspace } from '../hooks/useVendorWorkspace';
import IntentTable from '../IntentTable';
import { Card, Stat, StatGrid } from '../ui';

export default function Overview({ workspace, addButton }: { workspace: VendorWorkspace; addButton: ReactNode }) {
	const { vendor, products, insights } = workspace;
	const data = insights.data;
	const steps =
		vendor && products && data
			? onboardingSteps({ status: vendor.status, productCount: products.length, orderIntentCount: data.totals.orderIntents })
			: null;

	return (
		<>
			<OverviewStats workspace={workspace} />
			{steps && !steps.every((step) => step.done) && <GettingStarted steps={steps} addButton={addButton} />}
			<div className="grid gap-6 min-[1200px]:grid-cols-3">
				<Card title="Activity" description="Order Now clicks over the last 14 days." id="activity" className="min-[1200px]:col-span-2">
					{data ? <ActivityChart daily={data.daily} /> : <div className="h-56 animate-pulse rounded-lg bg-canvas" />}
				</Card>
				<TopProducts products={products ?? []} intentsByProduct={workspace.intentsByProduct} />
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
				<IntentTable intents={data?.recentOrderIntents.slice(0, PREVIEW_ROWS) ?? null} />
			</Card>
		</>
	);
}

function OverviewStats({ workspace }: { workspace: VendorWorkspace }) {
	const { vendor, products, insights } = workspace;
	const data = insights.data;
	const lastTwoWeeks = data?.daily.reduce((sum, day) => sum + day.orderIntents, 0);
	return (
		<StatGrid>
			<Stat
				label="Products"
				value={products ? String(products.length) : null}
				icon={Package}
				hint={workspace.visibility?.visible === false ? 'Hidden until your shop is live' : 'Listed on the storefront'}
			/>
			<Stat
				label="Order intents"
				value={data ? String(data.totals.orderIntents) : null}
				icon={MousePointerClick}
				hint={lastTwoWeeks !== undefined ? `${lastTwoWeeks} in the last 14 days` : undefined}
			/>
			<Stat
				label="Commission owed"
				value={data ? formatBdt(data.totals.commissionOwedMinor) : null}
				icon={Coins}
				tone="brand"
				hint="All time, not yet billed"
			/>
			<Stat label="Commission rate" value={vendor ? formatPercent(vendor.commissionBps) : null} icon={Percent} hint="Per order intent" />
		</StatGrid>
	);
}

function GettingStarted({ steps, addButton }: { steps: OnboardingStep[]; addButton: ReactNode }) {
	const done = steps.filter((step) => step.done).length;
	return (
		<Card title="Get your shop selling" description={`${done} of ${steps.length} done`} id="getting-started" actions={addButton}>
			<ol aria-label="Getting started" className="m-0 grid list-none gap-4 p-0 min-[768px]:grid-cols-3">
				{steps.map((step) => (
					<li key={step.id} className="flex gap-3">
						{step.done ? (
							<CheckCircle2 className="size-5 shrink-0 text-green-600" aria-label="Done" />
						) : (
							<Circle className="size-5 shrink-0 text-ink-soft/50" aria-label="To do" />
						)}
						<div>
							<p className={`m-0 text-sm font-semibold ${step.done ? 'text-ink-soft line-through' : ''}`}>{step.label}</p>
							<p className="m-0 mt-0.5 text-xs text-ink-soft">{step.hint}</p>
						</div>
					</li>
				))}
			</ol>
		</Card>
	);
}

function TopProducts({ products, intentsByProduct }: { products: Product[]; intentsByProduct: Map<string, number> }) {
	const top = useMemo(
		() =>
			products
				.map((product) => ({ product, intents: intentsByProduct.get(product.id) ?? 0 }))
				.filter((entry) => entry.intents > 0)
				.sort((a, b) => b.intents - a.intents)
				.slice(0, TOP_LIST_LIMIT),
		[products, intentsByProduct],
	);

	return (
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
	);
}
