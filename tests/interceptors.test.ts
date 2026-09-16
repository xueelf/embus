import { afterEach, expect, mock, test } from 'bun:test';

import { type RequestConfig, type RequestInterceptor, type Result, Embus, EmbusError } from '~/src';

import { createMockRequest } from './helpers/fetch';
import { createServer, payload } from './helpers/server';

const server = createServer();

afterEach(() => {
  mock.restore();
});

test('请求与响应拦截器', async () => {
  const instance = new Embus({ origin: server.url.origin });

  instance.useRequestInterceptor(config => ({
    ...config,
    payload: { intercepted: true },
  }));
  instance.useResponseInterceptor<Result<Record<string, boolean>>>(result => ({
    ...result.data,
    transformed: true,
  }));

  const getData = (): Promise<Record<string, boolean>> => instance.post('/anything', payload);
  const data = await getData();

  expect(data).toEqual({ intercepted: true, transformed: true });
});

test.each([
  ['同步请求错误', false],
  ['异步请求错误', true],
] as const)('%s', async (_label, asyncError) => {
  const { request, fetchSpy } = createMockRequest();
  const error = new Error('请求拦截失败');
  request.useRequestInterceptor(() => {
    if (asyncError) {
      return Promise.reject(error);
    }
    throw error;
  });
  const later = mock((config: RequestConfig) => config);
  request.useRequestInterceptor(later);

  await expect(request.get('/users')).rejects.toBe(error);
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(later).not.toHaveBeenCalled();
});

test.each([
  ['同步响应错误', false],
  ['异步响应错误', true],
] as const)('%s', async (_label, asyncError) => {
  const { request, fetchSpy } = createMockRequest();
  const error = new Error('响应拦截失败');
  request.useResponseInterceptor(() => {
    if (asyncError) {
      return Promise.reject(error);
    }
    throw error;
  });
  const later = mock((result: Result) => result);
  request.useResponseInterceptor(later);

  await expect(request.get('/users')).rejects.toBe(error);
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  expect(later).not.toHaveBeenCalled();
});

test('假值返回', async () => {
  const instance = new Embus({ origin: server.url.origin });
  instance.useResponseInterceptor(() => 0);
  const zero: number = await instance.get('/testing', null, { responseType: 'text' });

  expect(zero).toBe(0);

  instance.useResponseInterceptor(() => '');
  const empty: string = await instance.get('/testing', null, { responseType: 'text' });

  expect(empty).toBe('');
});

test('配置替换', async () => {
  const { request } = createMockRequest();
  request.useRequestInterceptor(async ({ body: _body, headers: _headers, ...config }) => config);
  request.useRequestInterceptor(config => {
    expect(config.body).toBeUndefined();
    expect(new Headers(config.headers).has('x-secret')).toBe(false);
    return config;
  });

  const { config } = await request.post(
    '/users',
    { name: 'Yuki' },
    {
      body: 'stale',
      headers: { 'x-secret': 'token' },
    },
  );

  expect(config.body).toBe('{"name":"Yuki"}');
});

test.each([
  ['未定义返回值', undefined],
  ['空返回值', null],
  ['缺少 URL', {}],
  ['URL 类型', { url: 42 }],
  ['响应类型', { url: '/users', responseType: 'invalid' }],
] as const)('%s', async (_label, invalid) => {
  const { request, fetchSpy } = createMockRequest();
  request.useRequestInterceptor((() => invalid) as unknown as RequestInterceptor);
  const later = mock((config: RequestConfig) => config);
  request.useRequestInterceptor(later);

  await expect(request.get('/users')).rejects.toBeInstanceOf(EmbusError);
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(later).not.toHaveBeenCalled();
});

test('不可变配置', async () => {
  const { request } = createMockRequest();
  const config: RequestConfig = Object.freeze({
    url: 'https://example.com/users',
    method: 'POST',
    payload: { name: 'Yuki' },
  });
  request.useRequestInterceptor(() => config);

  const result = await request.get('/ignored');
  expect(result.config.body).toBe('{"name":"Yuki"}');
  expect(config.body).toBeUndefined();
  expect(config.responseType).toBeUndefined();
});

test('异步响应拦截器', async () => {
  const { request } = createMockRequest();
  request.useResponseInterceptor(async result => {
    expect(result.data).toEqual({ ok: true });
    return false;
  });
  request.useResponseInterceptor<boolean>(async value => {
    expect(value).toBe(false);
  });
  request.useResponseInterceptor<boolean>(value => {
    expect(value).toBe(false);
    return null;
  });
  expect(await request.get('/users')).toBeNull();
});
