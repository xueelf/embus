# Totte

Totte is a lightweight HTTP request library based on the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) for any JavaScript runtime that supports `fetch`.

Read this in other languages: English | [简体中文](./README.zh.md)

## Installation

```shell
npm i totte
```

> [!IMPORTANT]
> Totte is a pure ESM package. If your project uses CommonJS, see [Pure ESM package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).

### CDN

```html
<script type="module">
  import totte from 'https://esm.sh/totte';
</script>
```

Or use an import map:

```html
<script type="importmap">
  {
    "imports": {
      "totte": "https://esm.sh/totte"
    }
  }
</script>
<script type="module">
  import totte from 'totte';
</script>
```

## Usage

### Basic usage

```javascript
import totte from 'totte';

const { data: users } = await totte('https://api.example.com/users', {
  payload: { username: 'example' },
});

const { data: user } = await totte.post('https://api.example.com/users', {
  username: 'example',
});
```

GET and HEAD payloads become query parameters. Other payloads are encoded as JSON by default.

### Compared with Fetch

Totte handles common repetitive work on top of Fetch. For example, sending a JSON request with `fetch` requires setting the method and headers, serializing the body, checking the response status, and parsing the response:

```javascript
const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'example',
  }),
});

if (!response.ok) {
  throw new Error(`${response.status} ${response.statusText}`);
}
const user = await response.json();
```

The same request with Totte is:

```javascript
const { data: user } = await totte.post('https://api.example.com/users', {
  username: 'example',
});
```

When sending `multipart/form-data`, `fetch` requires constructing `FormData` first. The `Content-Type` header must not be set manually, or it will be missing the boundary:

```javascript
const formData = new FormData();
formData.append('username', 'example');

const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  body: formData,
});

if (!response.ok) {
  throw new Error(`${response.status} ${response.statusText}`);
}
const result = await response.json();
```

With Totte, a plain object can be passed directly:

```javascript
const { data: result } = await totte.post(
  'https://api.example.com/users',
  {
    username: 'example',
  },
  {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  },
);
```

Totte converts `payload` to `FormData` and lets Fetch generate the `Content-Type` header with its boundary.

Totte processes `payload` according to the request method and `Content-Type`, checks the HTTP status, and parses the response according to `responseType`. It also provides base URLs, isolated instances, and request and response interceptors to reduce repeated code across requests.

## Instances

`totte.create()` returns an isolated callable instance:

```javascript
import totte from 'totte';

const request = totte.create({
  origin: 'https://api.example.com',
});

const { data } = await request('/users');
```

The `Totte` class provides the same methods but is not callable:

```javascript
import { Totte } from 'totte';

const request = new Totte({
  origin: 'https://api.example.com',
});

const { data } = await request.get('/users');
```

Instance headers are merged with per-request headers. Per-request values take precedence.

## Configuration

`RequestConfig` extends `RequestInit` with four Totte-specific fields and narrows `method` to the supported methods:

```typescript
type Method = 'GET' | 'DELETE' | 'HEAD' | 'POST' | 'PUT' | 'PATCH';
type ResponseType = 'arrayBuffer' | 'blob' | 'json' | 'text' | 'formData';

interface RequestConfig extends RequestInit {
  url: string;
  origin?: string;
  method?: Method;
  payload?: object | null;
  responseType?: ResponseType;
}

type RequestOptions = Omit<RequestConfig, 'url' | 'method' | 'payload'>;
```

- `url` is required when passing a configuration object.
- `origin` is a base URL for relative request URLs.
- `payload` contains query parameters or a request body.
- `responseType` defaults to `json`.
- Method helpers accept `RequestOptions` as their third argument.

### Payload serialization

| Request                                                        | Behavior                                                         |
| -------------------------------------------------------------- | ---------------------------------------------------------------- |
| GET or HEAD                                                    | Appends `payload` as query parameters                            |
| No `Content-Type`, `application/json`, or `application/*+json` | Serializes `payload` with `JSON.stringify`                       |
| `multipart/form-data`                                          | Converts `payload` to `FormData` and lets Fetch set the boundary |
| Explicit `body`                                                | Sends `body` unchanged and ignores `payload` serialization       |

For other encodings, provide `body` directly.

## Response

Every request resolves to a `Result<T>`:

```typescript
interface Result<T = unknown> {
  data: T | null;
  config: RequestConfig;
  status: number;
  statusText: string;
  headers: Headers;
}
```

The response body is parsed according to `responseType`. HEAD responses, status 204 or 205, and empty JSON responses return `null`.

## Interceptors

Request and response interceptors run in registration order and may be asynchronous:

```javascript
request.useRequestInterceptor(config => {
  const headers = new Headers(config.headers);
  headers.set('Authorization', 'Bearer token');
  return { ...config, headers };
});

request.useResponseInterceptor(result => result.data);
```

A request interceptor must return a `RequestConfig`. A response interceptor may mutate the result or return a value that replaces `result.data`.

## Errors

Responses outside the 200–299 range and response parsing failures throw `TotteError`:

```javascript
import totte, { TotteError } from 'totte';

try {
  await totte.get('https://api.example.com/users');
} catch (error) {
  if (error instanceof TotteError) {
    console.error(error.message, error.cause);
  }
}
```

For HTTP errors, `cause` is the `Response`. For parsing errors, it is the original error. Network errors from `fetch` are not wrapped.

## API

- `totte<T>(config): Promise<Result<T>>`
- `totte<T>(url, config?): Promise<Result<T>>`
- `totte.request<T>(config): Promise<Result<T>>`
- `totte.request<T>(url, config?): Promise<Result<T>>`
- `totte.get/delete/head/post/put/patch<T>(url, payload?, options?): Promise<Result<T>>`
- `totte.create(options?): TotteInstance`
- `totte.useRequestInterceptor(callback): void`
- `totte.useResponseInterceptor(callback): void`
- `new Totte(options?)`
- `createInstance(options?): TotteInstance`

Exported types include `RequestConfig`, `RequestOptions`, `Result`, `Method`, `ResponseType`, `RequestInterceptor`, `ResponseInterceptor`, and `TotteInstance`.
