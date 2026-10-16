import { useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc';
export interface SortState<K extends string> {
	key: K;
	dir: SortDir;
}

/** Sorts `rows` by one of `accessors`. Clicking the active column flips direction. */
export function useSort<T, K extends string>(
	rows: readonly T[],
	accessors: Record<K, (row: T) => string | number>,
	initial: SortState<NoInfer<K>>,
) {
	const [sort, setSort] = useState(initial);
	const sorted = useMemo(() => {
		const get = accessors[sort.key];
		const sign = sort.dir === 'asc' ? 1 : -1;
		return [...rows].sort((a, b) => {
			const x = get(a);
			const y = get(b);
			return sign * (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)));
		});
		// `accessors` is a fresh object literal each render but static per table, so it is left out.
	}, [rows, sort]);
	// Numbers start biggest first, text A to Z.
	const firstDir = (key: K): SortDir => (rows.length > 0 && typeof accessors[key](rows[0]!) === 'number' ? 'desc' : 'asc');
	const toggle = (key: K) =>
		setSort((current) =>
			current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: firstDir(key) },
		);
	return { sorted, sort, toggle };
}
