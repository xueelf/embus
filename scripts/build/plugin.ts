import type { BunPlugin } from 'bun';
import { Logger } from 'nebia';
import { rm } from 'node:fs/promises';

const logger = new Logger({
  name: 'build',
});

export function rmPlugin(): BunPlugin {
  return {
    name: 'rm',
    async setup(): Promise<void> {
      await rm('lib', { recursive: true, force: true });
      logger.info('lib directory removed');
    },
  };
}
