// Dedicated ports so e2e never reuses a dev server pointed at different settings.
export const E2E_API_URL = 'http://127.0.0.1:4100';
export const E2E_WEB_URL = 'http://127.0.0.1:4421';
export const E2E_ADMIN = { email: 'admin@e2e.local', password: 'e2e-admin-pass' };
export const E2E_VENDOR = { email: 'ghor@ypyd.local', password: 'vendor12345' };
