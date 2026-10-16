import { useCallback, useEffect, useState } from 'react';

/** The dashboard section named by the URL hash, e.g. `#products`. Falls back to the first id. */
export function useSection<Id extends string>(ids: readonly Id[]): [Id, (id: Id) => void] {
	const read = useCallback((): Id => {
		const hash = window.location.hash.slice(1) as Id;
		return ids.includes(hash) ? hash : ids[0]!;
	}, [ids]);
	const [section, setSection] = useState<Id>(read);

	useEffect(() => {
		const onHash = () => {
			setSection(read());
			window.scrollTo({ top: 0 });
		};
		window.addEventListener('hashchange', onHash);
		return () => window.removeEventListener('hashchange', onHash);
	}, [read]);

	const go = useCallback((id: Id) => {
		window.location.hash = id;
	}, []);
	return [section, go];
}
