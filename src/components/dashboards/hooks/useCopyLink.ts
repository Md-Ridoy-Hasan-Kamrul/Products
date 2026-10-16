import { useCallback, useEffect, useRef, useState } from 'react';
import { COPY_FEEDBACK_MS } from '../../../lib/constants';

/** Copies text to the clipboard; `copied` names what was copied last, for a short while. */
export function useCopyLink() {
	const [copied, setCopied] = useState<string | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	const copy = useCallback(async (key: string, text: string) => {
		await navigator.clipboard.writeText(text);
		setCopied(key);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setCopied(null), COPY_FEEDBACK_MS);
	}, []);

	return { copied, copy };
}
