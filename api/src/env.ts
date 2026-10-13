import { z } from 'zod';

const optionalString = z.preprocess((value) => (value === '' ? undefined : value), z.string().optional());

const DEV_AUTH_SECRET = 'dev-only-secret-change-me-in-production-0000';
const DEV_ADMIN_PASSWORD = 'admin12345';

const EnvSchema = z
	.object({
		NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
		PORT: z.coerce.number().int().positive().default(4000),
		WEB_ORIGIN: z.url().default('http://localhost:4321'),
		PUBLIC_URL: z.url().default('http://localhost:4000'),
		BETTER_AUTH_SECRET: z.preprocess(
			(value) => (value === '' ? undefined : value),
			z.string().min(32).default(DEV_AUTH_SECRET),
		),
		ADMIN_EMAIL: z.email().default('admin@ypyd.local'),
		ADMIN_PASSWORD: z.string().min(8).default(DEV_ADMIN_PASSWORD),
		IMAGE_PROVIDER: z.enum(['mock', 'cloudinary']).default('mock'),
		CLOUDINARY_CLOUD_NAME: optionalString,
		CLOUDINARY_API_KEY: optionalString,
		CLOUDINARY_API_SECRET: optionalString,
	})
	.superRefine((env, ctx) => {
		if (env.NODE_ENV === 'production') {
			if (env.BETTER_AUTH_SECRET === DEV_AUTH_SECRET) {
				ctx.addIssue({ code: 'custom', path: ['BETTER_AUTH_SECRET'], message: 'Set a real secret in production' });
			}
			if (env.ADMIN_PASSWORD === DEV_ADMIN_PASSWORD) {
				ctx.addIssue({ code: 'custom', path: ['ADMIN_PASSWORD'], message: 'Set a real admin password in production' });
			}
		}
		if (env.IMAGE_PROVIDER === 'cloudinary') {
			for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const) {
				if (!env[key]) {
					ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required when IMAGE_PROVIDER=cloudinary` });
				}
			}
		}
	});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
	const result = EnvSchema.safeParse(source);
	if (!result.success) {
		throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
	}
	return result.data;
}
