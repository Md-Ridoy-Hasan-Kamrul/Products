import { apiFetch } from './api';

export type Role = 'admin' | 'vendor';

export interface SessionUser {
	id: string;
	email: string;
	name: string;
	role: Role;
	vendorId?: string | null;
}

/** Better Auth answers `null` when nobody is logged in. */
export async function getSession(): Promise<SessionUser | null> {
	const data = await apiFetch<{ user: SessionUser } | null>('/api/auth/get-session');
	return data?.user ?? null;
}

export async function signIn(email: string, password: string): Promise<SessionUser> {
	const { user } = await apiFetch<{ user: SessionUser }>('/api/auth/sign-in/email', {
		method: 'POST',
		body: JSON.stringify({ email, password }),
	});
	return user;
}

/** Dev-only: the API logs in with the seeded account for `role`. */
export async function quickLogin(role: Role): Promise<SessionUser> {
	const { user } = await apiFetch<{ user: SessionUser }>('/api/dev/login', {
		method: 'POST',
		body: JSON.stringify({ role }),
	});
	return user;
}

/** Dev-only: the API creates a demo shop with a vendor login and signs it in. */
export async function quickRegister(): Promise<SessionUser> {
	const { user } = await apiFetch<{ user: SessionUser }>('/api/dev/register', { method: 'POST', body: '{}' });
	return user;
}

export async function signOut(): Promise<void> {
	await apiFetch('/api/auth/sign-out', { method: 'POST', body: '{}' });
}

export function loginPath(role: Role): string {
	return `/${role}/login`;
}

export function dashboardPath(role: Role): string {
	return `/${role}/dashboard`;
}
