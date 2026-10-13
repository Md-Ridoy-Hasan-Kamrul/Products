import { useState, type FormEvent } from 'react';
import { dashboardPath, quickLogin, signIn, signOut, type Role, type SessionUser } from '../../lib/auth';
import { ErrorNote, field, primaryButton, useRedirectIfLoggedIn } from '../dashboards/ui';

interface Props {
	role: Role;
	/** Dev-only one-click login with the seeded account; never enabled in production builds. */
	quick?: boolean;
}

export default function LoginForm({ role, quick = false }: Props) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	useRedirectIfLoggedIn(role);

	async function enter(login: () => Promise<SessionUser>) {
		setBusy(true);
		setError(null);
		try {
			const user = await login();
			if (user.role !== role) {
				await signOut();
				throw new Error(role === 'admin' ? 'This account is not an admin.' : 'This account is not a vendor.');
			}
			window.location.assign(dashboardPath(role));
		} catch (e) {
			setError((e as Error).message);
			setBusy(false);
		}
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		enter(() => signIn(String(data.get('email')), String(data.get('password'))));
	}

	return (
		<div className="grid gap-4">
			{quick && (
				<>
					<button
						type="button"
						disabled={busy}
						onClick={() => enter(() => quickLogin(role))}
						className="rounded-lg bg-ink px-4 py-3 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
					>
						{role === 'admin' ? 'One-click admin login' : 'One-click login as Gadget Haat'}
					</button>
					<p className="m-0 text-center text-xs text-ink-soft">dev only · or use your email</p>
				</>
			)}
			<form onSubmit={submit} className="grid gap-4" aria-label={`${role === 'admin' ? 'Admin' : 'Vendor'} login`}>
				<label className="text-sm font-medium">
					Email
					<input name="email" type="email" required autoComplete="email" className={field} />
				</label>
				<label className="text-sm font-medium">
					Password
					<input name="password" type="password" required minLength={8} autoComplete="current-password" className={field} />
				</label>
				{error && <ErrorNote message={error} />}
				<button type="submit" disabled={busy} className={primaryButton}>
					{busy ? 'Logging in…' : 'Log in'}
				</button>
			</form>
		</div>
	);
}
