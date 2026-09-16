import { serve } from 'bun';
import { afterAll } from 'bun:test';

export const payload = { foo: 'bar' };

export function createServer() {
  const server = serve({
    port: 0,
    routes: {
      '/testing': {
        GET: () => new Response('GET'),
        DELETE: () => new Response('DELETE'),
        HEAD: req =>
          new Response(null, {
            headers: {
              'x-request-body': String(req.body),
              'x-query': new URL(req.url).searchParams.get('foo') ?? '',
            },
          }),
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

  afterAll(() => {
    server.stop(true);
  });

  return server;
}
