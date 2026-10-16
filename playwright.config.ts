import { defineConfig, devices } from '@playwright/test';
import { E2E_ADMIN, E2E_API_URL, E2E_WEB_URL } from './e2e/env';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : undefined,
	reporter: 'list',
	use: {
		baseURL: E2E_WEB_URL,
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: [
		{
			command: 'npx tsx src/index.ts',
			cwd: 'api',
			url: `${E2E_API_URL}/health`,
			timeout: 60_000,
			reuseExistingServer: false,
			env: {
				NODE_ENV: 'test',
				PORT: '4100',
				WEB_ORIGIN: E2E_WEB_URL,
				PUBLIC_URL: E2E_API_URL,
				ADMIN_EMAIL: E2E_ADMIN.email,
				ADMIN_PASSWORD: E2E_ADMIN.password,
				IMAGE_PROVIDER: 'mock',
				VENDOR_APPROVAL: 'manual',
			},
		},
		{
			// --ignore-lock lets e2e run while a regular `npm run dev` is open.
			command: 'npx astro dev --host 127.0.0.1 --port 4421 --ignore-lock',
			url: `${E2E_WEB_URL}/`,
			timeout: 120_000,
			reuseExistingServer: false,
			env: { PUBLIC_API_URL: E2E_API_URL, ASTRO_TELEMETRY_DISABLED: '1' },
		},
	],
});
