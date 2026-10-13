import { useState } from 'react';
import { trackOrderClick } from '../../lib/api';
import type { Product } from '../../lib/types';
import { buildWhatsAppUrl, productPath } from '../../lib/whatsapp';
import WhatsAppIcon from './WhatsAppIcon';

interface Props {
	product: Pick<Product, 'id' | 'title' | 'vendor'>;
	/** Site origin used for the product link inside the WhatsApp message. */
	origin: string;
	size?: 'md' | 'lg';
}

export default function OrderNowButton({ product, origin, size = 'md' }: Props) {
	const [opened, setOpened] = useState(false);
	const href = buildWhatsAppUrl({
		vendorPhone: product.vendor.phone,
		productTitle: product.title,
		productUrl: new URL(productPath(product.id), origin).href,
	});

	// A real link opens WhatsApp even before hydration and is never popup-blocked;
	// once hydrated, the click is also tracked for commission.
	function track() {
		setOpened(true);
		trackOrderClick(product.id).catch((error) => console.warn('[order] click not tracked', error));
	}

	const sizing = size === 'lg' ? 'px-6 py-3.5 text-base' : 'px-3 py-2.5 text-sm';

	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			onClick={track}
			className={`flex items-center justify-center gap-2 rounded-lg bg-wa font-semibold text-white no-underline transition-colors hover:bg-wa-deep ${sizing}`}
		>
			<WhatsAppIcon className={size === 'lg' ? 'size-5' : 'size-4'} />
			{opened ? 'Opened in WhatsApp' : 'Order Now'}
		</a>
	);
}
