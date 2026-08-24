# Embus

Embus is a lightweight HTTP request library based on the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) for any JavaScript runtime that supports `fetch`.

Read this in other languages: English | [简体中文](./README.zh.md)

## Installation

```shell
npm i embus
```

> [!IMPORTANT]
> Embus is a pure ESM package. If your project uses CommonJS, see [Pure ESM package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).

### CDN

```html
<script type="module">
  import embus from 'https://esm.sh/embus';
</script>
```

Or use an import map:

```html
<script type="importmap">
  {
    "imports": {
      "embus": "https://esm.sh/embus"
    }
  }
</script>
<script type="module">
  import embus from 'embus';
</script>
```

## Usage

### Basic usage

```javascript
import embus from 'embus';

const { data: users } = await embus('https://api.example.com/users', {
  payload: { username: 'example' },
});

const { data: user } = await embus.post('https://api.example.com/users', {
  username: 'example',
});
```

GET and HEAD payloads become query parameters. Other payloads are encoded as JSON by default.

### Compared with Fetch

Embus handles common repetitive work on top of Fetch. For example, sending a JSON request with `fetch` requires setting the method and headers, serializing the body, checking the response status, and parsing the response:

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

The same request with Embus is:

```javascript
const { data: user } = await embus.post('https://api.example.com/users', {
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

With Embus, a plain object can be passed directly:

```javascript
const { data: result } = await embus.post(
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

Embus converts `payload` to `FormData` and lets Fetch generate the `Content-Type` header with its boundary.

Embus processes `payload` according to the request method and `Content-Type`, checks the HTTP status, and parses the response according to `responseType`. It also provides base URLs, isolated instances, and request and response interceptors to reduce repeated code across requests.

## Instances

`embus.create()` returns an isolated callable instance:

```javascript
import embus from 'embus';

const request = embus.create({
  origin: 'https://api.example.com',
});

const { data } = await request('/users');
```

The `Embus` class provides the same methods but is not callable:

```javascript
import { Embus } from 'embus';

const request = new Embus({
  origin: 'https://api.example.com',
});

const { data } = await request.get('/users');
```

Instance headers are merged with per-request headers. Per-request values take precedence.

## Configuration

`RequestConfig` extends `RequestInit` with four Embus-specific fields and narrows `method` to the supported methods:

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

HTTP method names are case-sensitive. [Section 9.1 of RFC 9110](https://www.rfc-editor.org/rfc/rfc9110#section-9.1) defines standardized methods by convention using all-uppercase US-ASCII letters, so Embus accepts only `GET`, `DELETE`, `HEAD`, `POST`, `PUT`, and `PATCH` for `method`. See [MDN: HTTP request methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods) for their semantics and use cases.

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

By default, every request resolves to a `Result<T>` containing the parsed data and response metadata:

```typescript
interface Result<T = unknown> {
  data: T;
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

request.useResponseInterceptor(result => {
  console.log(result.status);
  return result.data;
});
```

A request interceptor must return a `RequestConfig`. When a response interceptor returns a value other than `undefined`, that value replaces the current result and is passed to later response interceptors.

When wrapping an API, use the function return type to declare the result after interception:

```typescript
interface User {
  id: number;
  name: string;
}

function getUsers(): Promise<User[]> {
  return request.get('/users');
}
```

The request infers its final return type from `Promise<User[]>`, which must match the actual value returned by the response interceptor. An explicit `request.get<User[]>()` still has the static type `Promise<Result<User[]>>`, so an unwrapped API should not also specify the request generic.

## Errors

Responses outside the 200–299 range and response parsing failures throw `EmbusError`:

```javascript
import embus, { EmbusError } from 'embus';

try {
  await embus.get('https://api.example.com/users');
} catch (error) {
  if (error instanceof EmbusError) {
    console.error(error.message, error.cause);
  }
}
```

For HTTP errors, `cause` is the `Response`. For parsing errors, it is the original error. Network errors from `fetch` are not wrapped.

## API

- `embus<T, R = Result<T>>(config): Promise<R>`
- `embus<T, R = Result<T>>(url, config?): Promise<R>`
- `embus.request<T, R = Result<T>>(config): Promise<R>`
- `embus.request<T, R = Result<T>>(url, config?): Promise<R>`
- `embus.get/delete/post/put/patch<T, R = Result<T>>(url, payload?, options?): Promise<R>`
- `embus.head<R = Result<null>>(url, payload?, options?): Promise<R>`
- `embus.create(options?): EmbusInstance`
- `embus.useRequestInterceptor(callback): void`
- `embus.useResponseInterceptor(callback): void`
- `new Embus(options?)`
- `createInstance(options?): EmbusInstance`

Exported types include `RequestConfig`, `RequestOptions`, `Result`, `Method`, `ResponseType`, `RequestInterceptor`, `ResponseInterceptor`, and `EmbusInstance`.
