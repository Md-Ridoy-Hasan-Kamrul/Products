import { useEffect, useState, type ReactNode } from 'react';
import { dashboardPath, getSession, loginPath, signOut, type Role, type SessionUser } from '../../lib/auth';

export const field =
	'mt-1.5 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
export const primaryButton =
	'rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-deep disabled:opacity-60';

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
	if (state.status === 'loading') return <p className="text-ink-soft">Checking your login…</p>;
	if (state.status === 'error') return <ErrorNote message={state.message} />;
	return <>{children(state.user)}</>;
}

export function DashboardHeader({
	eyebrow,
	title,
	user,
	role,
}: {
	eyebrow: string;
	title: string;
	user: SessionUser;
	role: Role;
}) {
	const [leaving, setLeaving] = useState(false);

	async function logout() {
		setLeaving(true);
		await signOut().catch(() => {});
		window.location.assign(loginPath(role));
	}

	return (
		<div className="flex flex-wrap items-end justify-between gap-4">
			<div>
				<p className="m-0 text-xs font-bold tracking-[0.16em] text-brand uppercase">{eyebrow}</p>
				<h1 className="m-0 mt-1 text-3xl font-black">{title}</h1>
			</div>
			<div className="flex items-center gap-3 text-sm">
				<span className="text-ink-soft">{user.email}</span>
				<button
					type="button"
					onClick={logout}
					disabled={leaving}
					className="rounded-lg border border-line bg-surface px-3 py-2 font-semibold hover:border-brand hover:text-brand"
				>
					{leaving ? 'Logging out…' : 'Log out'}
				</button>
			</div>
		</div>
	);
}

export function Panel({ title, id, children }: { title: string; id: string; children: ReactNode }) {
	return (
		<section aria-labelledby={id} className="rounded-2xl bg-surface p-5">
			<h2 id={id} className="m-0 mb-4 text-lg font-bold">
				{title}
			</h2>
			{children}
		</section>
	);
}

export function ErrorNote({ message }: { message: string }) {
	return (
		<p role="alert" className="m-0 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
			{message}
		</p>
	);
}

export function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
	return (
		<div className={`rounded-2xl p-5 ${accent ? 'bg-linear-to-br from-brand to-brand-deep text-white' : 'bg-surface'}`}>
			<p className={`m-0 text-sm ${accent ? 'text-white/85' : 'text-ink-soft'}`}>{label}</p>
			<p className="m-0 mt-1 text-2xl font-black">{value}</p>
		</div>
	);
}
