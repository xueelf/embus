import { afterEach, expect, mock, test } from 'bun:test';

import { type RequestConfig, Embus, EmbusError } from '~/src';

import { createMockRequest } from './helpers/fetch';
import { createServer } from './helpers/server';

const server = createServer();
const request = new Embus({ origin: server.url.origin });

afterEach(() => {
  mock.restore();
});

test('HTTP 方法', async () => {
  expect((await request.get('/testing', null, { responseType: 'text' })).data).toBe('GET');
  expect((await request.delete('/testing', null, { responseType: 'text' })).data).toBe('DELETE');
  expect((await request.head('/testing')).data).toBeNull();
  expect((await request.post('/testing', null, { responseType: 'text' })).data).toBe('POST');
  expect((await request.put('/testing', null, { responseType: 'text' })).data).toBe('PUT');
  expect((await request.patch('/testing', null, { responseType: 'text' })).data).toBe('PATCH');
});

test('取消请求', async () => {
  const reason = new Error('Canceled by the caller');
  await expect(request.get('/testing', null, { signal: AbortSignal.abort(reason) })).rejects.toBe(
    reason,
  );
});

test('缺少 URL', async () => {
  await expect(request.request({} as RequestConfig)).rejects.toThrow('Invalid URL');
});

test('不支持的响应类型', async () => {
  const config = {
    url: '/testing',
    responseType: 'invalid',
  } as unknown as RequestConfig;

  await expect(request.request(config)).rejects.toThrow('Unsupported response type: invalid');
});

test.each([
  ['方法名大小写', { method: 'get' }],
  ['请求方法', { method: 'OPTIONS' }],
  ['响应类型', { responseType: 'invalid' }],
  ['请求数据', { payload: 'invalid' }],
  ['基础地址', { origin: 42 }],
] as const)('%s', async (_label, invalid) => {
  const { request, fetchSpy } = createMockRequest();
  await expect(
    request.request({ url: '/users', ...invalid } as unknown as RequestConfig),
  ).rejects.toBeInstanceOf(EmbusError);
  expect(fetchSpy).not.toHaveBeenCalled();
});

test('网络错误', async () => {
  const { request, fetchSpy } = createMockRequest();
  const error = new Error('failed');
  fetchSpy.mockRejectedValue(error);
  await expect(request.get('/users')).rejects.toBe(error);
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});
