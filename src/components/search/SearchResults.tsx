import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { Product } from '../../lib/types';
import ProductCard from '../products/ProductCard';

type State =
	| { status: 'idle' }
	| { status: 'loading'; query: string }
	| { status: 'done'; query: string; products: Product[] }
	| { status: 'error'; query: string; message: string };

export default function SearchResults() {
	const [state, setState] = useState<State>({ status: 'idle' });

	useEffect(() => {
		const query = new URLSearchParams(window.location.search).get('q')?.trim() ?? '';
		const input = document.getElementById('site-search') as HTMLInputElement | null;
		if (input) input.value = query;
		if (!query) return;

		setState({ status: 'loading', query });
		apiFetch<{ products: Product[] }>(`/api/products?q=${encodeURIComponent(query)}`)
			.then(({ products }) => setState({ status: 'done', query, products }))
			.catch((error: Error) => setState({ status: 'error', query, message: error.message }));
	}, []);

	if (state.status === 'idle') {
		return <p className="rounded-xl bg-surface p-10 text-center text-ink-soft">Type something in the search bar above.</p>;
	}

	return (
		<>
			<h1 className="m-0 mb-6 text-2xl font-black">Results for “{state.query}”</h1>
			{state.status === 'loading' && <p className="text-ink-soft">Searching…</p>}
			{state.status === 'error' && (
				<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
					{state.message}
				</p>
			)}
			{state.status === 'done' &&
				(state.products.length === 0 ? (
					<p className="rounded-xl bg-surface p-10 text-center text-ink-soft">
						Nothing matched. Try a shorter word or browse a category.
					</p>
				) : (
					<ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 min-[640px]:grid-cols-3 min-[640px]:gap-4 min-[960px]:grid-cols-4 min-[1200px]:grid-cols-5">
						{state.products.map((product) => (
							<li key={product.id}>
								<ProductCard product={product} origin={window.location.origin} />
							</li>
						))}
					</ul>
				))}
		</>
	);
}
