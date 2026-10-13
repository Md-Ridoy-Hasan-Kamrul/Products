import { categoryBySlug } from '../../lib/categories';

interface Props {
	title: string;
	imageUrl: string | null;
	category: string;
	/** Sizing classes; defaults to filling the parent's width. */
	className?: string;
}

export default function ProductImage({ title, imageUrl, category, className = 'w-full' }: Props) {
	if (imageUrl) {
		return (
			<img
				src={imageUrl}
				alt={title}
				loading="lazy"
				decoding="async"
				className={`aspect-square rounded-lg bg-canvas object-cover ${className}`}
			/>
		);
	}

	const { icon: Icon } = categoryBySlug(category);
	return (
		<div
			className={`grid aspect-square place-items-center rounded-lg bg-linear-to-br from-[#f6f7f9] to-[#eceef2] ${className}`}
			role="img"
			aria-label={title}
		>
			<Icon className="size-1/3 text-[#b4bac4]" strokeWidth={1.25} aria-hidden="true" />
		</div>
	);
}
