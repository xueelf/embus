import test, { type TestContext } from 'node:test';
import { createTestServer } from './server';
import { Embus } from '../../src';

const request = new Embus();
const params = {
  key: 'value',
};

request.useResponseInterceptor(({ status }) => {
  if (status < 200 || status >= 300) {
    throw new Error(`Request failed with status ${status}`);
  }
});

test('Request GET', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.get('/get', null, {
    origin: url,
    responseType: 'text',
  });

  ctx.assert.strictEqual(result.data, 'GET');
});

test('Request DELETE', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.delete('/delete', null, {
    origin: url,
    responseType: 'text',
  });

  ctx.assert.strictEqual(result.data, 'DELETE');
});

test('Request HEAD', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.head('/head', null, {
    origin: url,
    responseType: 'text',
  });

  ctx.assert.strictEqual(result.data, '');
});

test('Request POST', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.post('/post', null, {
    origin: url,
    responseType: 'text',
  });

  ctx.assert.strictEqual(result.data, 'POST');
});

test('Request PUT', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.put('/put', null, {
    origin: url,
    responseType: 'text',
  });

  ctx.assert.strictEqual(result.data, 'PUT');
});

test('Request PATCH', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.patch('/patch', null, {
    origin: url,
    responseType: 'text',
  });

  ctx.assert.strictEqual(result.data, 'PATCH');
});

test('Echo DELETE', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.delete('/echo/delete', params, {
    origin: url,
  });
  ctx.assert.deepEqual(result.data, params);
});

test('Echo POST', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.post('/echo/post', params, {
    origin: url,
  });
  ctx.assert.deepEqual(result.data, params);
});

test('Echo PUT', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.put('/echo/put', params, {
    origin: url,
  });
  ctx.assert.deepEqual(result.data, params);
});

test('Echo PATCH', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.patch('/echo/patch', params, {
    origin: url,
  });
  ctx.assert.deepEqual(result.data, params);
});
