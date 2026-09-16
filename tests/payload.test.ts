import { afterEach, expect, mock, test } from 'bun:test';

import { Embus, EmbusError } from '~/src';

import { createMockRequest } from './helpers/fetch';
import { createServer, payload } from './helpers/server';

const server = createServer();
const request = new Embus({ origin: server.url.origin });

afterEach(() => {
  mock.restore();
});

test('请求数据序列化', async () => {
  expect((await request.get('/anything', payload)).data).toEqual(payload);
  expect((await request.delete('/anything', payload)).data).toEqual(payload);
  expect((await request.post('/anything', payload)).data).toEqual(payload);
  expect((await request.put('/anything', payload)).data).toEqual(payload);
  expect((await request.patch('/anything', payload)).data).toEqual(payload);
});

test('表单边界', async () => {
  const { data } = await request.post<typeof payload>('/multipart', payload, {
    headers: { 'content-type': 'multipart/form-data' },
  });

  expect(data).toEqual(payload);
});

test.each([
  ['原生表单默认编码', undefined],
  ['原生表单显式编码', 'multipart/form-data'],
  ['原生表单边界', 'multipart/form-data; boundary=custom'],
] as const)('%s', async (_label, contentType) => {
  const form = new FormData();
  form.append('foo', 'bar');
  form.append('file', new File(['content'], 'file.txt'));

  const { data, config } = await request.post('/multipart', form, {
    headers: contentType ? { 'content-type': contentType } : undefined,
  });

  expect(data).toEqual({ foo: 'bar', file: 'file.txt' });
  expect(config.body).toBe(form);
  expect(new Headers(config.headers).has('content-type')).toBe(false);
});

test('原生表单字段', async () => {
  const { request } = createMockRequest();
  const form = new FormData();
  form.append('tag', 'first');
  form.append('tag', 'second');
  form.append('file', new File(['content'], 'file.bin', { type: 'application/octet-stream' }));

  const { config } = await request.post('/multipart', form);
  const sent = await new Request('https://example.com/multipart', config).formData();
  const file = sent.get('file') as File;

  expect(sent.getAll('tag')).toEqual(['first', 'second']);
  expect(file.name).toBe('file.bin');
  expect(file.type).toBe('application/octet-stream');
  expect(await file.text()).toBe('content');
});

test.each([
  ['JSON 编码冲突', 'application/json'],
  ['文本编码冲突', 'text/plain'],
  ['表单编码冲突', 'application/x-www-form-urlencoded'],
] as const)('%s', async (_label, contentType) => {
  const { request, fetchSpy } = createMockRequest();
  const form = new FormData();
  form.append('foo', 'bar');

  await expect(
    request.post('/multipart', form, { headers: { 'content-type': contentType } }),
  ).rejects.toBeInstanceOf(EmbusError);
  expect(fetchSpy).not.toHaveBeenCalled();
});

test('表单请求体优先级', async () => {
  const form = new FormData();
  form.append('foo', 'bar');

  for (const body of ['raw', null]) {
    const { data } = await request.post('/body', form, {
      body,
      headers: { 'content-type': 'text/plain' },
      responseType: 'text',
    });
    expect(data).toBe(body ?? '');
  }
});

test('JSON 字符集', async () => {
  const { data } = await request.post<{ body: object; contentType: string }>('/inspect', payload, {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

  expect(data).toEqual({
    body: payload,
    contentType: 'application/json; charset=utf-8',
  });
});

test('显式请求体', async () => {
  const { data } = await request.post<string>('/body', payload, {
    body: 'raw',
    headers: { 'content-type': 'text/plain' },
    responseType: 'text',
  });

  expect(data).toBe('raw');

  const { data: empty } = await request.post<string>('/body', payload, {
    body: null,
    responseType: 'text',
  });

  expect(empty).toBe('');
});

test.each([
  ['纯文本', 'text/plain'],
  ['URL 编码', 'application/x-www-form-urlencoded'],
  ['文本 JSON 类型', 'text/custom+json'],
] as const)('%s', async (_label, contentType) => {
  const { request, fetchSpy } = createMockRequest();
  await expect(
    request.post(
      '/users',
      { name: 'Yuki' },
      {
        headers: { 'content-type': contentType },
      },
    ),
  ).rejects.toBeInstanceOf(EmbusError);
  expect(fetchSpy).not.toHaveBeenCalled();
});

test('JSON 媒体类型', async () => {
  const { request } = createMockRequest();
  const { config } = await request.post(
    '/users',
    { name: 'Yuki' },
    {
      headers: { 'Content-Type': 'Application/Problem+Json; charset=utf-8' },
    },
  );
  expect(config.body).toBe('{"name":"Yuki"}');
  expect(new Headers(config.headers).get('content-type')).toBe(
    'Application/Problem+Json; charset=utf-8',
  );
});
