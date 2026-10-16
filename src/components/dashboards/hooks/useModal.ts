import { useEffect } from 'react';

/** Closes on Escape and locks page scroll while a panel or dialog is open. */
export function useModal(onClose: () => void) {
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
		window.addEventListener('keydown', onKey);
		document.body.style.overflow = 'hidden';
		return () => {
			window.removeEventListener('keydown', onKey);
			document.body.style.overflow = '';
		};
	}, [onClose]);
}
