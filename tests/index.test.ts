import { serve } from 'bun';
import { afterAll, expect, test } from 'bun:test';

import totte, { type RequestConfig, Totte, TotteError } from '~/src';
import { objectToFormData, paramsToString } from '~/src/util';

const payload = {
  foo: 'bar',
};

const server = serve({
  port: 0,
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
        return Response.json(Object.fromEntries(searchParams.entries()));
      },
      DELETE: async req => Response.json(await req.json()),
      POST: async req => Response.json(await req.json()),
      PUT: async req => Response.json(await req.json()),
      PATCH: async req => Response.json(await req.json()),
    },
    '/inspect': {
      GET: req =>
        Response.json({
          authorization: req.headers.get('authorization'),
          contentType: req.headers.get('content-type'),
          custom: req.headers.get('x-custom'),
        }),
      POST: async req =>
        Response.json({
          body: await req.json(),
          contentType: req.headers.get('content-type'),
        }),
    },
    '/multipart': {
      POST: async req => {
        const formData = await req.formData();
        const entries: Record<string, unknown> = {};

        for (const [key, value] of formData.entries()) {
          entries[key] = value instanceof File ? value.name : value;
        }
        return Response.json(entries);
      },
    },
    '/body': {
      POST: async req => new Response(await req.text()),
    },
    '/empty': {
      DELETE: () => new Response(null, { status: 204 }),
    },
    '/error': {
      GET: () => new Response('Teapot', { status: 418, statusText: "I'm a teapot" }),
    },
  },
  fetch() {
    return new Response('Not Found', { status: 404 });
  },
});

const request = new Totte({ origin: server.url.origin });

afterAll(() => {
  server.stop(true);
});

test('requests every supported HTTP method', async () => {
  expect((await request.get('/testing', null, { responseType: 'text' })).data).toBe('GET');
  expect((await request.delete('/testing', null, { responseType: 'text' })).data).toBe('DELETE');
  expect((await request.head('/testing')).data).toBeNull();
  expect((await request.post('/testing', null, { responseType: 'text' })).data).toBe('POST');
  expect((await request.put('/testing', null, { responseType: 'text' })).data).toBe('PUT');
  expect((await request.patch('/testing', null, { responseType: 'text' })).data).toBe('PATCH');
});

test('serializes query and JSON payloads', async () => {
  expect((await request.get('/anything', payload)).data).toEqual(payload);
  expect((await request.delete('/anything', payload)).data).toEqual(payload);
  expect((await request.post('/anything', payload)).data).toEqual(payload);
  expect((await request.put('/anything', payload)).data).toEqual(payload);
  expect((await request.patch('/anything', payload)).data).toEqual(payload);
});

test('default export creates callable instances', async () => {
  const instance = totte.create({ origin: server.url.origin });

  expect((await instance('/testing', { responseType: 'text' })).data).toBe('GET');
  expect(
    (
      await instance({
        origin: server.url.origin,
        url: '/testing',
        responseType: 'text',
      })
    ).data,
  ).toBe('GET');
});

test('runs request and response interceptors', async () => {
  const instance = new Totte({ origin: server.url.origin });

  instance.useRequestInterceptor(config => ({
    ...config,
    payload: { intercepted: true },
  }));
  instance.useResponseInterceptor<Record<string, boolean>>(result => ({
    ...result.data,
    transformed: true,
  }));

  const { data } = await instance.post<Record<string, boolean>>('/anything', payload);

  expect(data).toEqual({ intercepted: true, transformed: true });
});

test('response interceptors preserve falsy return values', async () => {
  const instance = new Totte({ origin: server.url.origin });
  instance.useResponseInterceptor(() => 0);

  expect((await instance.get('/testing', null, { responseType: 'text' })).data).toBe(0);

  instance.useResponseInterceptor(() => '');
  expect((await instance.get('/testing', null, { responseType: 'text' })).data).toBe('');
});

test('supports lowercase multipart headers and lets Fetch add the boundary', async () => {
  const { data } = await request.post('/multipart', payload, {
    headers: { 'content-type': 'multipart/form-data' },
  });

  expect(data).toEqual(payload);
});

test('merges instance and request headers and accepts AbortSignal', async () => {
  const controller = new AbortController();
  const instance = new Totte({
    origin: server.url.origin,
    headers: new Headers({ authorization: 'Bearer token' }),
    signal: controller.signal,
  });

  const { data } = await instance.get<{
    authorization: string;
    contentType: string | null;
    custom: string;
  }>('/inspect', null, {
    headers: { 'x-custom': 'present' },
  });

  expect(data).toEqual({
    authorization: 'Bearer token',
    contentType: null,
    custom: 'present',
  });
});

test('preserves JSON content-type parameters', async () => {
  const { data } = await request.post<{ body: object; contentType: string }>('/inspect', payload, {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

  expect(data).toEqual({
    body: payload,
    contentType: 'application/json; charset=utf-8',
  });
});

test('explicit bodies, including null, take precedence over payloads', async () => {
  const { data } = await request.post('/body', payload, {
    body: 'raw',
    headers: { 'content-type': 'text/plain' },
    responseType: 'text',
  });

  expect(data).toBe('raw');

  const { data: empty } = await request.post('/body', payload, {
    body: null,
    responseType: 'text',
  });

  expect(empty).toBe('');
});

test('adds HEAD payload to the query without sending a body', async () => {
  const { data } = await request.head('/testing', payload);
  expect(data).toBeNull();
});

test('inserts query parameters before a URL fragment', async () => {
  const { data } = await request.get('/anything#section', payload);
  expect(data).toEqual(payload);
});

test('joins origins and relative paths without requiring slashes', async () => {
  const instance = new Totte({ origin: server.url.origin });
  const { data } = await instance.get('testing', null, {
    responseType: 'text',
  });

  expect(data).toBe('GET');
});

test('returns null for empty successful responses', async () => {
  const { data } = await request.delete<null>('/empty');

  expect(data).toBeNull();
});

test('uses the generic type for response data', async () => {
  const { data } = await request.get<string>('/testing', null, { responseType: 'text' });
  const text: string = data;

  expect(text).toBe('GET');
});

test('throws an exported TotteError for unsuccessful responses', async () => {
  await expect(request.get('/error')).rejects.toBeInstanceOf(TotteError);
});

test('rejects request objects without a URL', async () => {
  await expect(request.request({} as RequestConfig)).rejects.toThrow('Invalid URL');
});

test('rejects unsupported response types', async () => {
  const config = {
    url: '/testing',
    responseType: 'invalid',
  } as unknown as RequestConfig;

  await expect(request.request(config)).rejects.toThrow('Unsupported response type: invalid');
});

test('objectToFormData preserves files, arrays, and skips undefined', () => {
  const first = new File(['first'], 'first.txt');
  const second = new File(['second'], 'second.txt');
  const formData = objectToFormData({
    files: [first, second],
    keep: 'value',
    skip: undefined,
  });

  expect((formData.getAll('files')[0] as File).name).toBe('first.txt');
  expect((formData.getAll('files')[1] as File).name).toBe('second.txt');
  expect(formData.get('keep')).toBe('value');
  expect(formData.get('skip')).toBeNull();
});

test('paramsToString handles arrays, URLSearchParams, and undefined', () => {
  expect(paramsToString({ tags: ['a', undefined, 'b'], skip: undefined })).toBe('tags=a&tags=b');
  expect(paramsToString(new URLSearchParams({ foo: 'bar' }))).toBe('foo=bar');
  expect(paramsToString(null)).toBe('');
  expect(paramsToString('value')).toBe('');
});
