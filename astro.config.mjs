// @ts-check
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
	site: 'https://ypyd.example.com',
	// Pages are prebuilt by default. Storefront pages that show vendor products
	// opt out with `prerender = false`, so a new product is live without a rebuild.
	adapter: node({ mode: 'standalone' }),
	integrations: [react(), sitemap()],
	env: {
		schema: {
			PUBLIC_API_URL: envField.string({
				context: 'client',
				access: 'public',
				url: true,
				default: 'http://localhost:4000',
			}),
		},
	},
	prefetch: {
		prefetchAll: true,
		defaultStrategy: 'hover',
	},
	vite: {
		plugins: [tailwindcss()],
	},
});
