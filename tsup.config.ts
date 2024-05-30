import { defineConfig } from 'tsup';

export default defineConfig({
	target: 'esnext',
	bundle: true,
	clean: true,
	dts: true,
	entry: ['src/cli.ts'],
	format: 'esm',
	outDir: 'bin',
	platform: 'node',
	minify: true,
	treeshake: 'recommended',
});
