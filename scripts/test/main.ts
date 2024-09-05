import test, { type TestContext } from 'node:test';
import { Embus } from '../../src';
import { createTestServer } from './server';

const request = new Embus({
  responseType: 'text',
});
const params = {
  key: 'value',
};

test('Request GET', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.get('/get', null, {
    origin: url,
  });

  ctx.assert.strictEqual(result.status, 200);
  ctx.assert.strictEqual(result.data, 'GET');
});

test('Request DELETE', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.delete('/delete', null, {
    origin: url,
  });

  ctx.assert.strictEqual(result.status, 200);
  ctx.assert.strictEqual(result.data, 'DELETE');
});

test('Request HEAD', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.head('/head', null, {
    origin: url,
  });

  ctx.assert.strictEqual(result.status, 200);
  ctx.assert.strictEqual(result.data, '');
});

test('Request POST', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.post('/post', null, {
    origin: url,
  });

  ctx.assert.strictEqual(result.status, 200);
  ctx.assert.strictEqual(result.data, 'POST');
});

test('Request PUT', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.put('/put', null, {
    origin: url,
  });

  ctx.assert.strictEqual(result.status, 200);
  ctx.assert.strictEqual(result.data, 'PUT');
});

test('Request PATCH', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.patch('/patch', null, {
    origin: url,
  });

  ctx.assert.strictEqual(result.status, 200);
  ctx.assert.strictEqual(result.data, 'PATCH');
});

test('Echo DELETE', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.delete('/echo/delete', params, {
    origin: url,
    responseType: 'json',
  });
  ctx.assert.strictEqual(result.status, 200);
  ctx.assert.deepEqual(result.data, params);
});

test('Echo POST', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.post('/echo/post', params, {
    origin: url,
    responseType: 'json',
  });
  ctx.assert.strictEqual(result.status, 200);
  ctx.assert.deepEqual(result.data, params);
});

test('Echo PUT', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.put('/echo/put', params, {
    origin: url,
    responseType: 'json',
  });
  ctx.assert.strictEqual(result.status, 200);
  ctx.assert.deepEqual(result.data, params);
});

test('Echo PATCH', async (ctx: TestContext): Promise<void> => {
  const url = await createTestServer();
  const result = await request.patch('/echo/patch', params, {
    origin: url,
    responseType: 'json',
  });
  ctx.assert.strictEqual(result.status, 200);
  ctx.assert.deepEqual(result.data, params);
});
