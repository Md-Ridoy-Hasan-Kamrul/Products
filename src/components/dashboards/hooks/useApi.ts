import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

export interface ApiState<T> {
	data: T | null;
	error: string | null;
	/** True while a request is in flight; `data` keeps the previous result meanwhile. */
	loading: boolean;
	reload: () => void;
}

export function useApi<T>(path: string): ApiState<T> {
	const [data, setData] = useState<T | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [version, setVersion] = useState(0);

	useEffect(() => {
		let current = true;
		setLoading(true);
		apiFetch<T>(path)
			.then((result) => {
				if (!current) return;
				setData(result);
				setError(null);
			})
			.catch((e: Error) => current && setError(e.message))
			.finally(() => current && setLoading(false));
		return () => {
			current = false;
		};
	}, [path, version]);

	const reload = useCallback(() => setVersion((v) => v + 1), []);
	return { data, error, loading, reload };
}
