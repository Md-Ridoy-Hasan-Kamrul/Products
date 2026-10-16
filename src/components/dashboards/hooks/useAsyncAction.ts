import { useCallback, useState } from 'react';

/** Busy and error state around one async action, e.g. a form submit. */
export function useAsyncAction() {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	/** Resolves true when `action` succeeded. */
	const run = useCallback(async (action: () => Promise<unknown>): Promise<boolean> => {
		setBusy(true);
		setError(null);
		try {
			await action();
			return true;
		} catch (e) {
			setError((e as Error).message);
			return false;
		} finally {
			setBusy(false);
		}
	}, []);

	return { busy, error, setError, run };
}
