import { createApp } from './app.js';
import { loadEnv } from './env.js';

const env = loadEnv();
const app = await createApp(env);

app.listen(env.PORT, () => {
	console.log(`Your Products Your Dreams API running at http://localhost:${env.PORT}`);
});
