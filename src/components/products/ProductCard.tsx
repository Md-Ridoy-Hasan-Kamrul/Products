import { formatBdt } from '../../lib/format';
import type { Product } from '../../lib/types';
import { productPath } from '../../lib/whatsapp';
import OrderNowButton from './OrderNowButton';
import ProductImage from './ProductImage';

interface Props {
	product: Product;
	origin: string;
}

export default function ProductCard({ product, origin }: Props) {
	const href = productPath(product.id);
	return (
		<article
			id={`product-${product.id}`}
			className="flex h-full flex-col rounded-xl bg-surface p-3 shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-shadow hover:shadow-[0_6px_20px_rgb(0_0_0/0.08)]"
		>
			<a href={href} aria-hidden="true" tabIndex={-1}>
				<ProductImage title={product.title} imageUrl={product.imageUrl} category={product.category} />
			</a>
			<h3 className="m-0 mt-3 line-clamp-2 min-h-[2.6em] text-sm leading-snug font-medium">
				<a href={href} className="text-ink no-underline hover:text-brand">
					{product.title}
				</a>
			</h3>
			<p className="m-0 mt-1.5 text-lg font-bold text-brand">{formatBdt(product.priceMinor)}</p>
			<p className="m-0 mb-3 truncate text-xs text-ink-soft">by {product.vendor.name}</p>
			<div className="mt-auto">
				<OrderNowButton product={product} origin={origin} />
			</div>
		</article>
	);
}
