import { spyOn } from 'bun:test';

import { Embus } from '~/src';

export function createMockRequest() {
  const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(async () => Response.json({ ok: true }), { preconnect: fetch.preconnect }),
  );
  const request = new Embus({ origin: 'https://example.com' });

  return { request, fetchSpy };
}
