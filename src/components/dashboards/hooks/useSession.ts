import { useEffect, useState } from 'react';
import { dashboardPath, getSession, loginPath, type Role, type SessionUser } from '../../../lib/auth';

export type SessionState =
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
