import { afterEach, expect, mock, test } from 'bun:test';

import { Embus, EmbusError } from '~/src';

import { createMockRequest } from './helpers/fetch';
import { createServer, payload } from './helpers/server';

const server = createServer();
const request = new Embus({ origin: server.url.origin });

afterEach(() => {
  mock.restore();
});

test('HEAD 查询参数', async () => {
  const result = await request.head('/testing', payload);

  expect(result.data).toBeNull();
  expect(result.headers.get('x-query')).toBe('bar');
  expect(result.headers.get('x-request-body')).toBe('null');
});

test('片段前追加参数', async () => {
  const { data } = await request.get<typeof payload>('/anything#section', payload);
  expect(data).toEqual(payload);
});

test('相对地址', async () => {
  const instance = new Embus({ origin: server.url.origin });
  const { data } = await instance.get<string>('testing', null, {
    responseType: 'text',
  });

  expect(data).toBe('GET');
});

test.each([
  ['查询参数', '?token=value'],
  ['片段标识', '#fragment'],
  ['查询参数与片段', '?token=value#fragment'],
] as const)('%s', async (_label, suffix) => {
  const { request, fetchSpy } = createMockRequest();
  await request.get('users', null, { origin: `https://example.com/api${suffix}` });
  expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://example.com/api/users');
});

test('查询参数合并', async () => {
  const { request, fetchSpy } = createMockRequest();
  await request.get('/users?tag=first#section', {
    tag: ['second', undefined, 'third'],
    skip: undefined,
  });
  expect(fetchSpy.mock.calls[0]?.[0]).toBe(
    'https://example.com/users?tag=first&tag=second&tag=third#section',
  );
});

test.each(['GET', 'HEAD'] as const)('%s 原生表单', async method => {
  const { request, fetchSpy } = createMockRequest();
  const form = new FormData();
  form.append('foo', 'bar');

  await expect(request.request({ url: '/users', method, payload: form })).rejects.toBeInstanceOf(
    EmbusError,
  );
  expect(fetchSpy).not.toHaveBeenCalled();
});
