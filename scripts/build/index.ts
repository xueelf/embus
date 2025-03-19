import { build, type BuildConfig } from 'bun';
import { rmPlugin } from './plugin';

const config: BuildConfig = {
  entrypoints: ['src/index.ts', 'src/util.ts'],
  outdir: 'lib',
  splitting: true,
  plugins: [rmPlugin()],
};

await build(config);
