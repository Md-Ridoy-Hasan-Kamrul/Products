import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { createApp } from './app.js';
import { loadEnv } from './env.js';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
	const app = await createApp(loadEnv({ NODE_ENV: 'test' }));
	server = app.listen(0);
	await new Promise<void>((resolve) => server.once('listening', resolve));
	baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('GET /health returns ok', async () => {
	const res = await fetch(`${baseUrl}/health`);
	expect(res.status).toBe(200);
	expect(await res.json()).toEqual({ status: 'ok' });
});

test('unknown route returns 404 JSON', async () => {
	const res = await fetch(`${baseUrl}/nope`);
	expect(res.status).toBe(404);
	expect(await res.json()).toEqual({ error: 'Not found' });
});

test('invalid env is rejected', () => {
	expect(() => loadEnv({ PORT: 'abc' })).toThrow(/Invalid environment/);
});
