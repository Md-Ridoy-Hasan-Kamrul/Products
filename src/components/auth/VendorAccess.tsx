import { useState, type FormEvent } from 'react';
import { apiFetch } from '../../lib/api';
import { dashboardPath, quickRegister, signIn } from '../../lib/auth';
import { ErrorNote, field, primaryButton, secondaryButton } from '../dashboards/ui';
import LoginForm from './LoginForm';

type Mode = 'login' | 'register';

export default function VendorAccess({ quick = false }: { quick?: boolean }) {
	const [mode, setMode] = useState<Mode>(() =>
		new URLSearchParams(window.location.search).get('mode') === 'register' ? 'register' : 'login',
	);

	const tab = (value: Mode, label: string) => (
		<button
			type="button"
			role="tab"
			aria-selected={mode === value}
			onClick={() => setMode(value)}
			className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
				mode === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
			}`}
		>
			{label}
		</button>
	);

	return (
		<div>
			<div role="tablist" className="mb-6 flex gap-1 rounded-xl bg-canvas p-1">
				{tab('login', 'Log in')}
				{tab('register', 'Become a seller')}
			</div>
			{mode === 'login' ? (
				<LoginForm role="vendor" quick={quick} />
			) : (
				<div className="grid gap-4">
					{quick && <QuickRegister />}
					<RegisterForm />
				</div>
			)}
		</div>
	);
}

function QuickRegister() {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function create() {
		setBusy(true);
		setError(null);
		try {
			await quickRegister();
			window.location.assign(dashboardPath('vendor'));
		} catch (e) {
			setError((e as Error).message);
			setBusy(false);
		}
	}

	return (
		<>
			<button
				type="button"
				disabled={busy}
				onClick={create}
				className={`${secondaryButton} w-full`}
			>
				{busy ? 'Creating your shop…' : 'One-click: create a demo shop'}
			</button>
			{error && <ErrorNote message={error} />}
			<p className="m-0 text-center text-xs text-ink-soft">dev only · or fill in your shop details</p>
		</>
	);
}

function RegisterForm() {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const email = String(data.get('email'));
		const password = String(data.get('password'));
		setBusy(true);
		setError(null);
		try {
			await apiFetch('/api/vendor/register', {
				method: 'POST',
				body: JSON.stringify({ shopName: data.get('shopName'), phone: data.get('phone'), email, password }),
			});
			await signIn(email, password);
			window.location.assign(dashboardPath('vendor'));
		} catch (e) {
			setError((e as Error).message);
			setBusy(false);
		}
	}

	return (
		<form onSubmit={submit} className="grid gap-4" aria-label="Become a seller">
			<label className="text-sm font-medium">
				Shop name
				<input name="shopName" required minLength={2} maxLength={100} className={field} />
			</label>
			<label className="text-sm font-medium">
				WhatsApp number
				<input
					name="phone"
					type="tel"
					required
					placeholder="01711000000"
					autoComplete="tel"
					inputMode="tel"
					className={field}
				/>
			</label>
			<label className="text-sm font-medium">
				Email
				<input name="email" type="email" required autoComplete="email" className={field} />
			</label>
			<label className="text-sm font-medium">
				Password
				<input name="password" type="password" required minLength={8} autoComplete="new-password" className={field} />
			</label>
			{error && <ErrorNote message={error} />}
			<button type="submit" disabled={busy} className={primaryButton}>
				{busy ? 'Creating your shop…' : 'Create my shop'}
			</button>
			<p className="m-0 text-xs text-ink-soft">Buyers order on WhatsApp. You pay a 10% commission on each order.</p>
		</form>
	);
}
