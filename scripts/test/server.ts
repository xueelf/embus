import { createServer } from 'node:http';
import { type AddressInfo } from 'node:net';

export function createTestServer(): Promise<string> {
  const server = createServer((request, response) => {
    const { method, url } = request;
    console.log(`${method} ${url}`);
    switch (`${method} ${url}`) {
      case 'GET /get':
      case 'DELETE /delete':
      case 'HEAD /head':
      case 'POST /post':
      case 'PUT /put':
      case 'PATCH /patch':
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.end(method);
        break;
      case 'DELETE /echo/delete':
      case 'POST /echo/post':
      case 'PUT /echo/put':
      case 'PATCH /echo/patch':
        let body: string = '';

        request.on('data', chunk => {
          body += chunk;
        });
        request.on('end', () => {
          response.writeHead(200, { 'Content-Type': 'application/json' });
          response.end(body);
        });
        break;
      default:
        response.writeHead(404);
        response.end();
        break;
    }
    server.close();
  });

  return new Promise(resolve => {
    server.listen(null, () => {
      const info = server.address() as AddressInfo | null;

      if (!info) {
        throw new Error('Server not listening');
      }
      let url: string;

      switch (info.family) {
        case 'IPv4':
          url = `http://${info.address}:${info.port}`;
          break;
        case 'IPv6':
          url = `http://[${info.address}]:${info.port}`;
          break;
        default:
          throw new Error('Unsupported address family');
      }
      resolve(url);
    });
  });
}
