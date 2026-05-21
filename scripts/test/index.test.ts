import { serve } from 'bun';
import { expect, test } from 'bun:test';
import { Adfer } from '../../src';

const server = serve({
  port: 8080,
  routes: {
    '/testing': {
      GET: () => new Response('GET'),
      DELETE: () => new Response('DELETE'),
      HEAD: () => new Response(),
      POST: () => new Response('POST'),
      PUT: () => new Response('PUT'),
      PATCH: () => new Response('PATCH'),
    },
    '/anything': {
      GET: req => {
        const { searchParams } = new URL(req.url);
        const data = Object.fromEntries(searchParams.entries());

        return Response.json(data);
      },
      DELETE: async req => Response.json(await req.json()),
      POST: async req => Response.json(await req.json()),
      PUT: async req => Response.json(await req.json()),
      PATCH: async req => Response.json(await req.json()),
    },
  },
  fetch(req) {
    return new Response('Not Found', { status: 404 });
  },
});

const request = new Adfer({
  origin: server.url.origin,
});
const payload = {
  foo: 'bar',
};

test('Request GET', async (): Promise<void> => {
  const { data } = await request.get('/testing', null, {
    responseType: 'text',
  });
  expect(data).toBe('GET');
});

test('Request DELETE', async (): Promise<void> => {
  const { data } = await request.delete('/testing', null, {
    responseType: 'text',
  });
  expect(data).toBe('DELETE');
});

test('Request HEAD', async (): Promise<void> => {
  const { data } = await request.head('/testing');
  expect(data).toBeNull();
});

test('Request POST', async (): Promise<void> => {
  const { data } = await request.post('/testing', null, {
    responseType: 'text',
  });
  expect(data).toBe('POST');
});

test('Request PUT', async (): Promise<void> => {
  const { data } = await request.put('/testing', null, {
    responseType: 'text',
  });
  expect(data).toBe('PUT');
});

test('Request Patch', async (): Promise<void> => {
  const { data } = await request.patch('/testing', null, {
    responseType: 'text',
  });
  expect(data).toBe('PATCH');
});

test('Echo GET', async (): Promise<void> => {
  const { data } = await request.get('/anything', payload);
  expect(data).toEqual(payload);
});

test('Echo DELETE', async (): Promise<void> => {
  const { data } = await request.delete('/anything', payload);
  expect(data).toEqual(payload);
});

test('Echo POST', async (): Promise<void> => {
  const { data } = await request.post('/anything', payload);
  expect(data).toEqual(payload);
});

test('Echo PUT', async (): Promise<void> => {
  const { data } = await request.put('/anything', payload);
  expect(data).toEqual(payload);
});

test('Echo PATCH', async (): Promise<void> => {
  const { data } = await request.patch('/anything', payload);
  expect(data).toEqual(payload);
});
