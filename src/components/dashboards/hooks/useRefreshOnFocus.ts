import { useEffect } from 'react';

/** Calls `refresh` when the visitor comes back to the tab, e.g. after an admin approved their shop. */
export function useRefreshOnFocus(refresh: () => void) {
	useEffect(() => {
		const onVisible = () => document.visibilityState === 'visible' && refresh();
		document.addEventListener('visibilitychange', onVisible);
		return () => document.removeEventListener('visibilitychange', onVisible);
	}, [refresh]);
}
