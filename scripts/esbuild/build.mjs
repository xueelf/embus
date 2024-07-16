import arg from 'arg';
import { build, context } from 'esbuild';

const args = arg({
  '--watch': Boolean,
  '-w': '--watch',
});
/**
 * @type {import('esbuild').BuildOptions}
 */
const options = {
  bundle: true,
  format: 'esm',
  outdir: 'dist',
  entryPoints: ['src/index.ts'],
};

args['--watch'] ? await context(options).then(ctx => ctx.watch()) : await build(options);
