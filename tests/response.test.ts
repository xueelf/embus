import { afterEach, expect, mock, test } from 'bun:test';

import { Embus, EmbusError } from '~/src';

import { createMockRequest } from './helpers/fetch';
import { createServer } from './helpers/server';

const server = createServer();
const request = new Embus({ origin: server.url.origin });

afterEach(() => {
  mock.restore();
});

test('响应元数据', async () => {
  const result = await request.get<string>('/testing', null, { responseType: 'text' });

  expect(result.data).toBe('GET');
  expect(result.status).toBe(200);
  expect(result.headers).toBeInstanceOf(Headers);
});

test('204 响应', async () => {
  const { data } = await request.delete<null>('/empty');

  expect(data).toBeNull();
});

test('响应数据类型', async () => {
  const { data } = await request.get<string>('/testing', null, {
    responseType: 'text',
  });
  const text: string = data;

  expect(text).toBe('GET');
});

test('HTTP 错误', async () => {
  const error: unknown = await request.get('/error').catch((error: unknown) => error);

  if (!(error instanceof EmbusError)) {
    throw error;
  }
  expect(error.response).toBeInstanceOf(Response);
  expect(error.response?.status).toBe(418);
});

test('JSON 解析错误', async () => {
  await expect(request.get('/testing')).rejects.toBeInstanceOf(SyntaxError);
});

test('响应解析', async () => {
  const { request, fetchSpy } = createMockRequest();
  for (const responseType of ['text', 'blob', 'arrayBuffer', 'formData'] as const) {
    fetchSpy.mockResolvedValueOnce(
      new Response('foo=bar', {
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }),
    );
    const { data } = await request.get('/users', null, { responseType });
    if (responseType === 'blob') {
      expect(await (data as Blob).text()).toBe('foo=bar');
    } else if (responseType === 'arrayBuffer') {
      expect(new TextDecoder().decode(data as ArrayBuffer)).toBe('foo=bar');
    } else if (responseType === 'formData') {
      expect((data as FormData).get('foo')).toBe('bar');
    } else {
      expect(data).toBe('foo=bar');
    }
  }
  expect((await request.get('/users')).data).toEqual({ ok: true });
});

test('空响应', async () => {
  const { request, fetchSpy } = createMockRequest();
  for (const status of [204, 205]) {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status }));
    expect((await request.get('/users', null, { responseType: 'formData' })).data).toBeNull();
  }
  for (const body of ['', ' \n\t']) {
    fetchSpy.mockResolvedValueOnce(new Response(body));
    expect((await request.get('/users')).data).toBeNull();
  }
});
