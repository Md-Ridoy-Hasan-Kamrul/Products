// Runs the API and the Astro dev server together; Ctrl+C stops both.
import { spawn } from 'node:child_process';

const children = [
	spawn('npm', ['--prefix', 'api', 'run', 'dev'], { stdio: 'inherit' }),
	spawn('npx', ['astro', 'dev', ...process.argv.slice(2)], { stdio: 'inherit' }),
];

function stop(code = 0) {
	for (const child of children) child.kill('SIGTERM');
	process.exit(code);
}

for (const child of children) {
	child.on('exit', (code) => stop(code ?? 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
