import { afterEach, expect, mock, test } from 'bun:test';

import embus, { Embus } from '~/src';

import { createMockRequest } from './helpers/fetch';
import { createServer } from './helpers/server';

const server = createServer();

afterEach(() => {
  mock.restore();
});

test('可调用实例', async () => {
  const instance = embus.create({ origin: server.url.origin });

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

test('请求头合并', async () => {
  const controller = new AbortController();
  const instance = new Embus({
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

test('方法绑定与实例隔离', async () => {
  const instance = embus.create({ origin: server.url.origin });
  instance.useRequestInterceptor(config => ({ ...config, payload: { isolated: true } }));
  const { get } = instance;
  expect((await get('/anything')).data).toEqual({ isolated: 'true' });

  const child = instance.create({ origin: server.url.origin });
  expect((await child.get('/anything')).data).toEqual({});
});

test('实例默认配置', async () => {
  const { fetchSpy } = createMockRequest();
  const headers = new Headers({ 'x-default': 'original' });
  const options = { origin: 'https://example.com/api', headers };
  const request = new Embus(options);
  options.origin = 'https://changed.example.com';
  headers.set('x-default', 'changed');

  const { config } = await request.get('users');
  expect(fetchSpy.mock.calls[0]?.[0]).toBe('https://example.com/api/users');
  expect(new Headers(config.headers).get('x-default')).toBe('original');
});

test('请求头隔离', async () => {
  createMockRequest();
  const options = { headers: new Headers({ 'x-default': 'original' }) };
  const request = new Embus(options);
  const first = await request.get('https://example.com', null, {
    headers: { 'X-Default': 'override', 'x-request': 'only once' },
  });
  const headers = new Headers(first.config.headers);
  expect(headers.get('x-default')).toBe('override');

  const second = await request.get('https://example.com');
  expect(new Headers(second.config.headers).get('x-default')).toBe('original');
  expect(new Headers(second.config.headers).has('x-request')).toBe(false);
  expect(options.headers.get('x-default')).toBe('original');
});
