import { toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { createAuth } from './auth.js';
import type { Env } from './env.js';
import { createImageProvider, type ImageProvider } from './providers/images/index.js';
import { adminRouter } from './routes/admin.js';
import { catalogRouter } from './routes/catalog.js';
import { devRouter } from './routes/dev.js';
import { healthRouter } from './routes/health.js';
import { ordersRouter } from './routes/orders.js';
import { uploadsRouter } from './routes/uploads.js';
import { vendorRouter } from './routes/vendor.js';
import type { MemoryStore } from './store/memory.js';
import { createSeededStore, seedUsers } from './store/seed.js';

export interface AppDeps {
	store?: MemoryStore;
	images?: ImageProvider;
}

export async function createApp(env: Env, deps: AppDeps = {}) {
	const store = deps.store ?? createSeededStore();
	const images = deps.images ?? createImageProvider(env);
	const auth = createAuth(env);
	await seedUsers(auth, store, env);

	const app = express();

	app.disable('x-powered-by');
	app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));

	app.use('/health', healthRouter);
	// Both mounted before the global JSON parser: Better Auth reads the raw body,
	// and uploads need a larger body limit.
	app.all('/api/auth/{*splat}', toNodeHandler(auth));
	app.use('/api/uploads', uploadsRouter(store, images, auth));

	app.use(express.json({ limit: '1mb' }));
	app.use('/api', catalogRouter(store));
	app.use('/api/orders', ordersRouter(store));
	app.use('/api/vendor', vendorRouter(store, auth));
	app.use('/api/admin', adminRouter(store, auth));
	if (env.NODE_ENV !== 'production') app.use('/api/dev', devRouter(auth, store, env));

	app.use((_req, res) => {
		res.status(404).json({ error: 'Not found' });
	});

	const onError: ErrorRequestHandler = (err, _req, res, _next) => {
		if (err instanceof ZodError) {
			res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid request', issues: err.issues });
			return;
		}
		if (typeof err?.status === 'number' && err.status < 500 && err.expose) {
			res.status(err.status).json({ error: err.message });
			return;
		}
		console.error(err);
		res.status(500).json({ error: 'Internal server error' });
	};
	app.use(onError);

	return app;
}
