import { categoryBySlug } from '../../lib/categories';

interface Props {
	title: string;
	imageUrl: string | null;
	category: string;
	className?: string;
}

export default function ProductImage({ title, imageUrl, category, className = '' }: Props) {
	if (imageUrl) {
		return (
			<img
				src={imageUrl}
				alt={title}
				loading="lazy"
				decoding="async"
				className={`aspect-square w-full rounded-lg bg-canvas object-cover ${className}`}
			/>
		);
	}

	const { icon, tint } = categoryBySlug(category);
	return (
		<div
			className={`@container grid aspect-square w-full place-items-center rounded-lg ${className}`}
			style={{ backgroundColor: tint }}
			role="img"
			aria-label={title}
		>
			<span className="text-[36cqw] leading-none" aria-hidden="true">
				{icon}
			</span>
		</div>
	);
}
