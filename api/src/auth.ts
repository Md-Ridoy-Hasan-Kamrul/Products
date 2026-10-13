import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { fromNodeHeaders } from 'better-auth/node';
import type { RequestHandler } from 'express';
import type { Env } from './env.js';
import type { MemoryStore } from './store/memory.js';
import type { Vendor } from './store/types.js';

export type Role = 'admin' | 'vendor';

export function createAuth(env: Env) {
	return betterAuth({
		// In-memory until the database step; users and sessions reset on restart.
		database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
		baseURL: env.PUBLIC_URL,
		basePath: '/api/auth',
		secret: env.BETTER_AUTH_SECRET,
		trustedOrigins: [env.WEB_ORIGIN],
		emailAndPassword: {
			enabled: true,
			// Accounts are created only through createCredentialUser, so nobody can pick their own role.
			disableSignUp: true,
			minPasswordLength: 8,
		},
		user: {
			additionalFields: {
				role: { type: 'string', required: true, defaultValue: 'vendor', input: false },
				vendorId: { type: 'string', required: false, input: false },
			},
		},
		telemetry: { enabled: false },
	});
}

export type Auth = ReturnType<typeof createAuth>;

export interface NewCredentialUser {
	email: string;
	password: string;
	name: string;
	role: Role;
	vendorId?: string;
}

export class EmailTakenError extends Error {}

/** Same steps as Better Auth's email sign-up, but server-side so the role can be set. */
export async function createCredentialUser(auth: Auth, input: NewCredentialUser) {
	const ctx = await auth.$context;
	const email = input.email.toLowerCase();
	if (await ctx.internalAdapter.findUserByEmail(email)) throw new EmailTakenError(email);

	const hash = await ctx.password.hash(input.password);
	const user = await ctx.internalAdapter.createUser(
		{ email, name: input.name, emailVerified: true, role: input.role, vendorId: input.vendorId ?? null },
		{ method: 'admin' },
	);
	await ctx.internalAdapter.linkAccount({ userId: user.id, providerId: 'credential', accountId: user.id, password: hash });
	return user;
}

declare module 'express-serve-static-core' {
	interface Locals {
		vendor?: Vendor;
	}
}

async function sessionUser(auth: Auth, headers: Parameters<typeof fromNodeHeaders>[0]) {
	const session = await auth.api.getSession({ headers: fromNodeHeaders(headers) });
	return session?.user as (NonNullable<typeof session>['user'] & { role: Role; vendorId?: string | null }) | undefined;
}

export function requireVendor(auth: Auth, store: MemoryStore): RequestHandler {
	return async (req, res, next) => {
		const user = await sessionUser(auth, req.headers);
		const vendor = user?.role === 'vendor' && user.vendorId ? store.getVendor(user.vendorId) : undefined;
		if (!vendor) {
			res.status(401).json({ error: 'Please log in as a vendor' });
			return;
		}
		res.locals.vendor = vendor;
		next();
	};
}

export function requireAdmin(auth: Auth): RequestHandler {
	return async (req, res, next) => {
		const user = await sessionUser(auth, req.headers);
		if (user?.role !== 'admin') {
			res.status(401).json({ error: 'Please log in as an admin' });
			return;
		}
		next();
	};
}
