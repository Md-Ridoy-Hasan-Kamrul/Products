import { ExternalLink, LayoutDashboard, Loader2, LogOut, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { dashboardPath, getSession, loginPath, signOut, type Role, type SessionUser } from '../../lib/auth';

export const field =
	'mt-1.5 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-xs outline-none placeholder:text-ink-soft/60 focus:border-brand focus:ring-3 focus:ring-brand/15';
export const primaryButton =
	'inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-brand-deep disabled:opacity-60';
export const secondaryButton =
	'inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-xs hover:bg-canvas disabled:opacity-60';
export const th = 'border-b border-line bg-canvas/60 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-ink-soft uppercase whitespace-nowrap';
export const td = 'border-b border-line px-4 py-3 align-middle whitespace-nowrap';

type SessionState =
	| { status: 'loading' }
	| { status: 'ready'; user: SessionUser }
	| { status: 'error'; message: string };

/** Loads the session and sends the visitor to the login page unless they have `role`. */
export function useRequiredSession(role: Role): SessionState {
	const [state, setState] = useState<SessionState>({ status: 'loading' });

	useEffect(() => {
		getSession()
			.then((user) => {
				if (user?.role === role) setState({ status: 'ready', user });
				else window.location.replace(loginPath(role));
			})
			.catch((error: Error) => setState({ status: 'error', message: error.message }));
	}, [role]);

	return state;
}

/** On a login page: skip the form if the visitor is already logged in with `role`. */
export function useRedirectIfLoggedIn(role: Role) {
	useEffect(() => {
		getSession()
			.then((user) => {
				if (user?.role === role) window.location.replace(dashboardPath(role));
			})
			.catch(() => {});
	}, [role]);
}

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

interface ShellProps {
	role: Role;
	user: SessionUser;
	title: string;
	description?: string;
	actions?: ReactNode;
	children: ReactNode;
}

export function DashboardShell({ role, user, title, description, actions, children }: ShellProps) {
	const [leaving, setLeaving] = useState(false);
	const area = role === 'admin' ? 'Admin' : 'Seller Center';

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
			{leaving ? 'Logging out…' : 'Log out'}
		</button>
	);

	return (
		<div className="min-h-screen bg-canvas min-[1024px]:grid min-[1024px]:grid-cols-[16rem_minmax(0,1fr)]">
			<aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface min-[1024px]:flex">
				<div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
					<Brand />
					<span className="ml-auto rounded-md bg-canvas px-2 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap text-ink-soft">{area}</span>
				</div>
				<nav aria-label={`${area} navigation`} className="flex-1 p-3">
					<NavLink href={dashboardPath(role)} icon={LayoutDashboard} label="Overview" active />
					<NavLink href="/" icon={ExternalLink} label="View storefront" />
				</nav>
				<div className="border-t border-line p-3">
					<div className="flex items-center gap-3 px-2 py-2">
						<Avatar name={user.name} />
						<div className="min-w-0">
							<p className="m-0 truncate text-sm font-semibold">{user.name}</p>
							<p className="m-0 truncate text-xs text-ink-soft">{user.email}</p>
						</div>
					</div>
					{logoutButton}
				</div>
			</aside>

			<div className="min-w-0">
				<header className="flex h-16 items-center gap-3 border-b border-line bg-surface px-4 min-[1024px]:hidden">
					<Brand />
					<span className="rounded-md bg-canvas px-2 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap text-ink-soft">{area}</span>
					<div className="ml-auto">{logoutButton}</div>
				</header>

				<main id="main" className="mx-auto max-w-6xl px-4 py-6 min-[640px]:px-8 min-[640px]:py-8">
					<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
						<div className="min-w-0">
							<h1 className="m-0 text-2xl font-bold tracking-tight">{title}</h1>
							{description && <p className="m-0 mt-1 text-sm text-ink-soft">{description}</p>}
						</div>
						{actions && <div className="flex gap-2">{actions}</div>}
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

function NavLink({ href, icon: Icon, label, active = false }: { href: string; icon: LucideIcon; label: string; active?: boolean }) {
	return (
		<a
			href={href}
			aria-current={active ? 'page' : undefined}
			className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium no-underline ${
				active ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-canvas hover:text-ink'
			}`}
		>
			<Icon className="size-4" aria-hidden="true" />
			{label}
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

export function Card({
	title,
	description,
	id,
	actions,
	children,
	flush = false,
}: {
	title: string;
	description?: string;
	id: string;
	actions?: ReactNode;
	children: ReactNode;
	/** No body padding, for edge-to-edge tables. */
	flush?: boolean;
}) {
	return (
		<section aria-labelledby={id} className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
				<div>
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

export function Stat({ label, value, icon: Icon, hint }: { label: string; value: string; icon: LucideIcon; hint?: string }) {
	return (
		<div className="rounded-xl border border-line bg-surface p-5 shadow-xs">
			<div className="flex items-center justify-between gap-3">
				<p className="m-0 text-sm font-medium text-ink-soft">{label}</p>
				<span className="grid size-8 place-items-center rounded-lg bg-canvas text-ink-soft" aria-hidden="true">
					<Icon className="size-4" />
				</span>
			</div>
			<p className="m-0 mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
			{hint && <p className="m-0 mt-1 text-xs text-ink-soft">{hint}</p>}
		</div>
	);
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' }) {
	const tones = {
		neutral: 'bg-canvas text-ink-soft ring-line',
		success: 'bg-green-50 text-green-700 ring-green-600/20',
	};
	return (
		<span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
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

export function ErrorNote({ message }: { message: string }) {
	return (
		<p role="alert" className="m-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
			{message}
		</p>
	);
}
