import {
	AlertTriangle,
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	CheckCircle2,
	Clock,
	ExternalLink,
	Loader2,
	LogOut,
	Search,
	X,
	type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { loginPath, signOut, type Role, type SessionUser } from '../../lib/auth';
import type { SessionState } from './hooks/useSession';
import type { SortState } from './hooks/useSort';

export const field =
	'mt-1.5 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-xs outline-none placeholder:text-ink-soft/60 focus:border-brand focus:ring-3 focus:ring-brand/15';
export const primaryButton =
	'inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold whitespace-nowrap text-white shadow-xs hover:bg-brand-deep disabled:opacity-60';
export const secondaryButton =
	'inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink shadow-xs hover:bg-canvas disabled:opacity-60';
export const iconButton = 'rounded-lg p-2 text-ink-soft hover:bg-canvas hover:text-ink';
export const th = 'border-b border-line bg-canvas/60 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-ink-soft uppercase whitespace-nowrap';
export const td = 'border-b border-line px-4 py-3 align-middle whitespace-nowrap';
/** `relative` keeps sr-only header labels inside the table's scroll area instead of widening the page. */
export const table = 'relative w-full border-collapse text-sm';
export const tbody = '[&>tr:last-child>td]:border-b-0';
export const row = 'hover:bg-canvas/50';

/* ---------- Session ---------- */

export function SessionGate({ state, children }: { state: SessionState; children: (user: SessionUser) => ReactNode }) {
	if (state.status === 'ready') return <>{children(state.user)}</>;
	return (
		<div className="grid min-h-screen place-items-center bg-canvas p-6">
			{state.status === 'loading' ? (
				<p className="m-0 flex items-center gap-2 text-sm text-ink-soft">
					<Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking your login…
				</p>
			) : (
				<div className="w-full max-w-md">
					<ErrorNote message={state.message} />
				</div>
			)}
		</div>
	);
}

/* ---------- Shell ---------- */

export interface NavItem<Id extends string = string> {
	id: Id;
	label: string;
	icon: LucideIcon;
	/** Small count shown next to the label. */
	count?: number;
}

interface ShellProps<Id extends string> {
	role: Role;
	user: SessionUser;
	nav: NavItem<Id>[];
	section: Id;
	/** Shown under the brand and in the account card, e.g. the shop name. */
	workspace: string;
	title: string;
	description?: string;
	actions?: ReactNode;
	children: ReactNode;
}

export function DashboardShell<Id extends string>({
	role,
	user,
	nav,
	section,
	workspace,
	title,
	description,
	actions,
	children,
}: ShellProps<Id>) {
	const [leaving, setLeaving] = useState(false);
	const area = role === 'admin' ? 'Admin' : 'Seller Center';
	const current = nav.find((item) => item.id === section);

	async function logout() {
		setLeaving(true);
		await signOut().catch(() => {});
		window.location.assign(loginPath(role));
	}

	const logoutButton = (
		<button
			type="button"
			onClick={logout}
			disabled={leaving}
			className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-soft hover:bg-canvas hover:text-ink"
		>
			<LogOut className="size-4" aria-hidden="true" />
			{/* Icon only on the narrowest phones, so the header fits in 320px. */}
			<span className="max-[374px]:sr-only">{leaving ? 'Logging out…' : 'Log out'}</span>
		</button>
	);

	return (
		<div className="min-h-screen bg-canvas min-[1024px]:grid min-[1024px]:grid-cols-[16rem_minmax(0,1fr)]">
			<aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface min-[1024px]:flex">
				<div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
					<Brand />
					<span className="ml-auto rounded-md bg-canvas px-2 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap text-ink-soft">{area}</span>
				</div>
				<div className="px-5 pt-5 pb-2">
					<p className="m-0 text-[0.7rem] font-semibold tracking-wider text-ink-soft uppercase">Workspace</p>
					<p className="m-0 mt-0.5 truncate text-sm font-semibold">{workspace}</p>
				</div>
				<nav aria-label={`${area} navigation`} className="flex-1 overflow-y-auto p-3">
					{nav.map((item) => (
						<NavLink key={item.id} item={item} active={item.id === section} />
					))}
					<div className="my-3 border-t border-line" />
					<a
						href="/"
						className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft no-underline hover:bg-canvas hover:text-ink"
					>
						<ExternalLink className="size-4" aria-hidden="true" />
						View storefront
					</a>
				</nav>
				<div className="border-t border-line p-3">
					<div className="flex items-center gap-3 px-2 py-2">
						<Avatar name={role === 'vendor' ? workspace : user.name} />
						<div className="min-w-0">
							<p className="m-0 truncate text-sm font-semibold">{role === 'vendor' ? workspace : user.name}</p>
							<p className="m-0 truncate text-xs text-ink-soft">{user.email}</p>
						</div>
					</div>
					{logoutButton}
				</div>
			</aside>

			<div className="min-w-0">
				<header className="sticky top-0 z-30 border-b border-line bg-surface min-[1024px]:hidden">
					<div className="flex h-14 items-center gap-3 px-4">
						<Brand />
						<span className="rounded-md bg-canvas px-2 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap text-ink-soft">{area}</span>
						<div className="ml-auto">{logoutButton}</div>
					</div>
					<nav aria-label={`${area} sections`} className="flex gap-1 overflow-x-auto px-3 pb-2">
						{nav.map((item) => (
							<a
								key={item.id}
								href={`#${item.id}`}
								aria-current={item.id === section ? 'page' : undefined}
								className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium no-underline ${
									item.id === section ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-canvas'
								}`}
							>
								<item.icon className="size-4" aria-hidden="true" />
								{item.label}
							</a>
						))}
					</nav>
				</header>

				<main id="main" className="mx-auto max-w-6xl px-4 py-6 min-[640px]:px-8 min-[640px]:py-8">
					<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
						<div className="min-w-0">
							{current && (
								<p className="m-0 mb-1 text-xs font-semibold tracking-wider text-ink-soft uppercase">
									{area} / {current.label}
								</p>
							)}
							<h1 className="m-0 text-2xl font-bold tracking-tight">{title}</h1>
							{description && <p className="m-0 mt-1 text-sm text-ink-soft">{description}</p>}
						</div>
						{actions && <div className="flex flex-wrap gap-2">{actions}</div>}
					</div>
					<div className="grid grid-cols-1 gap-6">{children}</div>
				</main>
			</div>
		</div>
	);
}

function Brand() {
	return (
		<a href="/" className="flex items-center gap-2 text-ink no-underline">
			<span className="grid size-8 place-items-center rounded-lg bg-brand text-sm font-black text-white" aria-hidden="true">
				Y
			</span>
			<span className="text-sm font-bold whitespace-nowrap">Your Products</span>
		</a>
	);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
	const Icon = item.icon;
	return (
		<a
			href={`#${item.id}`}
			aria-current={active ? 'page' : undefined}
			className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium no-underline ${
				active ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-canvas hover:text-ink'
			}`}
		>
			<Icon className="size-4" aria-hidden="true" />
			{item.label}
			{item.count !== undefined && (
				<span
					className={`ml-auto rounded-full px-2 text-xs font-semibold tabular-nums ${active ? 'bg-surface text-brand' : 'bg-canvas text-ink-soft'}`}
				>
					{item.count}
				</span>
			)}
		</a>
	);
}

function Avatar({ name }: { name: string }) {
	const initials = name
		.split(/\s+/)
		.map((part) => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();
	return (
		<span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white" aria-hidden="true">
			{initials}
		</span>
	);
}

/* ---------- Building blocks ---------- */

export function Card({
	title,
	description,
	id,
	actions,
	children,
	flush = false,
	className = '',
}: {
	title: string;
	description?: string;
	id: string;
	actions?: ReactNode;
	children: ReactNode;
	/** No body padding, for edge-to-edge tables. */
	flush?: boolean;
	className?: string;
}) {
	return (
		<section aria-labelledby={id} className={`overflow-hidden rounded-xl border border-line bg-surface shadow-xs ${className}`}>
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
				<div className="min-w-0">
					<h2 id={id} className="m-0 text-base font-semibold">
						{title}
					</h2>
					{description && <p className="m-0 mt-0.5 text-sm text-ink-soft">{description}</p>}
				</div>
				{actions}
			</div>
			<div className={flush ? '' : 'p-5'}>{children}</div>
		</section>
	);
}

export function StatGrid({ children }: { children: ReactNode }) {
	return <div className="grid grid-cols-2 gap-3 min-[640px]:gap-4 min-[1200px]:grid-cols-4">{children}</div>;
}

export function Stat({
	label,
	value,
	icon: Icon,
	hint,
	tone = 'neutral',
}: {
	label: string;
	/** null while loading. */
	value: string | null;
	icon: LucideIcon;
	hint?: string;
	tone?: 'neutral' | 'brand';
}) {
	return (
		<div className="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-xs min-[640px]:p-5">
			<div className="flex items-center justify-between gap-3">
				<p className="m-0 text-sm font-medium text-ink-soft">{label}</p>
				<span
					className={`grid size-8 place-items-center rounded-lg ${tone === 'brand' ? 'bg-brand-soft text-brand' : 'bg-canvas text-ink-soft'}`}
					aria-hidden="true"
				>
					<Icon className="size-4" />
				</span>
			</div>
			{value === null ? (
				<span className="mt-3 block h-7 w-24 animate-pulse rounded-md bg-canvas" aria-label="Loading" />
			) : (
				<p className="m-0 mt-2 truncate text-xl font-bold tracking-tight tabular-nums min-[640px]:text-2xl">{value}</p>
			)}
			{hint && <p className="m-0 mt-1 text-xs text-ink-soft">{hint}</p>}
		</div>
	);
}

export type BadgeTone = 'neutral' | 'success' | 'brand' | 'warning' | 'danger';

const BADGE_TONES: Record<BadgeTone, string> = {
	neutral: 'bg-canvas text-ink-soft ring-line',
	success: 'bg-green-50 text-green-700 ring-green-600/20',
	brand: 'bg-brand-soft text-brand-deep ring-brand/20',
	warning: 'bg-amber-50 text-amber-800 ring-amber-600/20',
	danger: 'bg-red-50 text-red-700 ring-red-600/20',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
	return (
		<span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${BADGE_TONES[tone]}`}>
			{children}
		</span>
	);
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
	return (
		<div className="grid place-items-center px-6 py-14 text-center">
			<span className="grid size-12 place-items-center rounded-full bg-canvas text-ink-soft" aria-hidden="true">
				<Icon className="size-5" />
			</span>
			<p className="m-0 mt-3 font-semibold">{title}</p>
			<p className="m-0 mt-1 max-w-sm text-sm text-ink-soft">{text}</p>
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
	return (
		<div role="alert" className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
			<span className="flex-1">{message}</span>
			{onRetry && (
				<button type="button" onClick={onRetry} className="font-semibold underline">
					Try again
				</button>
			)}
		</div>
	);
}

/** A standing message about the account, e.g. a shop in review. */
export function StatusNote({ tone, title, children }: { tone: 'warning' | 'danger'; title: string; children: ReactNode }) {
	const tones = { warning: 'border-amber-200 bg-amber-50 text-amber-900', danger: 'border-red-200 bg-red-50 text-red-900' };
	const Icon = tone === 'warning' ? Clock : AlertTriangle;
	return (
		<div role="note" className={`flex gap-3 rounded-xl border px-4 py-3.5 text-sm ${tones[tone]}`}>
			<Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
			<div>
				<p className="m-0 font-semibold">{title}</p>
				<p className="m-0 mt-0.5">{children}</p>
			</div>
		</div>
	);
}

export function Notice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
	return (
		<div role="status" className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
			<CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
			<span className="flex-1">{message}</span>
			<button type="button" onClick={onDismiss} className="rounded p-0.5 hover:bg-green-100" aria-label="Dismiss">
				<X className="size-4" aria-hidden="true" />
			</button>
		</div>
	);
}

/** One row of filters above a table. */
export function Toolbar({ children }: { children: ReactNode }) {
	return <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">{children}</div>;
}

export function SearchInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
	return (
		<label className="relative min-w-48 flex-1">
			<span className="sr-only">{label}</span>
			<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
			<input
				type="search"
				value={value}
				onChange={(e) => onChange(e.currentTarget.value)}
				placeholder={label}
				className="block w-full rounded-lg border border-line bg-surface py-2 pr-3 pl-9 text-sm outline-none placeholder:text-ink-soft/70 focus:border-brand focus:ring-3 focus:ring-brand/15"
			/>
		</label>
	);
}

export function FilterSelect({
	label,
	value,
	onChange,
	options,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	options: { value: string; label: string }[];
}) {
	return (
		<select
			aria-label={label}
			value={value}
			onChange={(e) => onChange(e.currentTarget.value)}
			className="rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/15"
		>
			{options.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	);
}

export function SortTh<K extends string>({
	label,
	column,
	sort,
	onSort,
	align = 'left',
}: {
	label: string;
	column: K;
	sort: SortState<K>;
	onSort: (key: K) => void;
	align?: 'left' | 'right';
}) {
	const active = sort.key === column;
	const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
	return (
		<th
			className={`${th} ${align === 'right' ? 'text-right' : ''}`}
			aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
		>
			<button
				type="button"
				onClick={() => onSort(column)}
				className={`inline-flex items-center gap-1 uppercase hover:text-ink ${active ? 'text-ink' : ''}`}
			>
				{label}
				<Icon className={`size-3.5 ${active ? '' : 'opacity-40'}`} aria-hidden="true" />
			</button>
		</th>
	);
}

/** Footer line under a filtered table. */
export function TableFoot({ shown, total, noun }: { shown: number; total: number; noun: string }) {
	return (
		<p className="m-0 border-t border-line px-5 py-3 text-xs text-ink-soft">
			Showing {shown} of {total} {noun}
		</p>
	);
}

export function TableSkeleton() {
	return (
		<div className="grid gap-3 p-5" aria-label="Loading">
			{[0, 1, 2].map((i) => (
				<div key={i} className="h-8 animate-pulse rounded-md bg-canvas" />
			))}
		</div>
	);
}

/** One label/value pair inside a `<dl>`. */
export function Detail({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="grid gap-0.5 min-[480px]:grid-cols-[11rem_minmax(0,1fr)]">
			<dt className="text-ink-soft">{label}</dt>
			<dd className="m-0 font-medium">{children}</dd>
		</div>
	);
}

/** Click-to-close overlay behind a dialog or drawer. */
export function Backdrop({ onClose }: { onClose: () => void }) {
	return <button type="button" aria-label="Close" tabIndex={-1} className="absolute inset-0 bg-ink/40" onClick={onClose} />;
}
