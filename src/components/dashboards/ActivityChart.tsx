import { useState } from 'react';
import { formatBdt, formatDay } from '../../lib/format';
import type { DailyPoint } from '../../lib/types';
import { td, th } from './ui';

type Metric = 'orderIntents' | 'commissionMinor';

const FULL_HEIGHT_PERCENT = 100;
/** A non-zero day stays visible even when tiny next to the busiest day. */
const MIN_BAR_PX = 3;
/** Bars at each edge whose tooltip aligns inward so it is not clipped. */
const EDGE_BARS = 2;

const METRICS: { id: Metric; label: string; format: (value: number) => string }[] = [
	{ id: 'orderIntents', label: 'Order intents', format: (value) => String(value) },
	{ id: 'commissionMinor', label: 'Commission', format: formatBdt },
];

/** Even axis tops per power of ten, so the midline is always a whole count. */
const AXIS_STEPS = [2, 4, 6, 8, 10];
const SMALLEST_AXIS_TOP = AXIS_STEPS[0]!;
const LARGEST_STEP = AXIS_STEPS.at(-1)!;

function niceMax(value: number): number {
	if (value <= SMALLEST_AXIS_TOP) return SMALLEST_AXIS_TOP;
	const power = 10 ** Math.floor(Math.log10(value));
	return (AXIS_STEPS.find((step) => step * power >= value) ?? LARGEST_STEP) * power;
}

/**
 * Daily bars for one measure at a time. The two measures have different
 * scales, so they share a toggle instead of two y-axes.
 */
export default function ActivityChart({ daily }: { daily: DailyPoint[] }) {
	const [metricId, setMetricId] = useState<Metric>('orderIntents');
	const metric = METRICS.find((m) => m.id === metricId)!;
	const max = niceMax(Math.max(...daily.map((point) => point[metricId])));
	const empty = daily.every((point) => point.orderIntents === 0);
	const ticks = [max, max / 2, 0];

	return (
		<div>
			<div className="mb-4 inline-flex rounded-lg border border-line bg-canvas p-0.5" role="group" aria-label="Chart measure">
				{METRICS.map((m) => (
					<button
						key={m.id}
						type="button"
						aria-pressed={m.id === metricId}
						onClick={() => setMetricId(m.id)}
						className={`rounded-md px-3 py-1 text-xs font-semibold ${
							m.id === metricId ? 'bg-surface text-ink shadow-xs' : 'text-ink-soft hover:text-ink'
						}`}
					>
						{m.label}
					</button>
				))}
			</div>

			<div className="relative grid grid-cols-[auto_minmax(0,1fr)] gap-x-3" aria-hidden="true">
				<div className="flex h-44 flex-col justify-between text-right text-[0.7rem] text-ink-soft tabular-nums">
					{ticks.map((tick) => (
						<span key={tick} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
							{metric.format(tick)}
						</span>
					))}
				</div>
				<div className="relative h-44">
					{/* Recessive grid: top, middle, baseline. */}
					<div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
						<span className="border-t border-dashed border-line" />
						<span className="border-t border-dashed border-line" />
						<span className="border-t border-ink/25" />
					</div>
					<div className="absolute inset-0 flex items-end gap-0.5 min-[640px]:gap-1.5">
						{daily.map((point, index) => {
							const value = point[metricId];
							const edge = index < EDGE_BARS ? 'left-0' : index >= daily.length - EDGE_BARS ? 'right-0' : 'left-1/2 -translate-x-1/2';
							return (
								<div key={point.date} className="group relative flex h-full flex-1 items-end justify-center">
									<div
										className="w-full max-w-8 rounded-t bg-brand transition-colors group-hover:bg-brand-deep"
										style={{ height: value > 0 ? `max(${(value / max) * FULL_HEIGHT_PERCENT}%, ${MIN_BAR_PX}px)` : 0 }}
									/>
									<div
										className={`pointer-events-none absolute bottom-full z-10 mb-2 hidden rounded-lg border border-line bg-surface px-3 py-2 whitespace-nowrap shadow-lg group-hover:block ${edge}`}
									>
										<p className="m-0 text-sm font-bold tabular-nums">{metric.format(value)}</p>
										<p className="m-0 text-xs text-ink-soft">{formatDay(point.date)}</p>
									</div>
								</div>
							);
						})}
					</div>
					{empty && (
						<p className="absolute inset-0 m-0 grid place-items-center text-sm text-ink-soft">No order intents in this period yet</p>
					)}
				</div>
				<div />
				<div className="mt-2 flex justify-between text-[0.7rem] text-ink-soft">
					<span>{formatDay(daily[0]!.date)}</span>
					<span>{formatDay(daily[Math.floor(daily.length / 2)]!.date)}</span>
					<span>Today</span>
				</div>
			</div>

			<details className="mt-4 text-sm">
				<summary className="cursor-pointer text-xs font-semibold text-ink-soft hover:text-ink">Show as table</summary>
				<div className="mt-2 max-h-64 overflow-auto rounded-lg border border-line">
					<table className="w-full border-collapse text-sm">
						<thead>
							<tr>
								<th className={th}>Day</th>
								<th className={`${th} text-right`}>Order intents</th>
								<th className={`${th} text-right`}>Commission</th>
							</tr>
						</thead>
						<tbody className="[&>tr:last-child>td]:border-b-0">
							{[...daily].reverse().map((point) => (
								<tr key={point.date}>
									<td className={td}>{formatDay(point.date)}</td>
									<td className={`${td} text-right tabular-nums`}>{point.orderIntents}</td>
									<td className={`${td} text-right tabular-nums`}>{formatBdt(point.commissionMinor)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</details>
		</div>
	);
}
