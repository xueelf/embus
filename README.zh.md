# Totte

Totte 是一个基于 [Fetch API](https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API) 的轻量级 HTTP 网络请求库，适用于任何支持 `fetch` 的 JavaScript 运行时。

使用其他语言阅读：[English](./README.md) | 简体中文

## 安装

```shell
npm i totte
```

> [!IMPORTANT]
> Totte 是一个纯 ESM 包。如果你的项目使用 CommonJS，请参阅 [Pure ESM package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)。

### CDN

```html
<script type="module">
  import totte from 'https://esm.sh/totte';
</script>
```

也可以使用 import map：

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

## 使用

### 基本用法

```javascript
import totte from 'totte';

const { data: users } = await totte('https://api.example.com/users', {
  payload: { username: 'example' },
});

const { data: user } = await totte.post('https://api.example.com/users', {
  username: 'example',
});
```

GET 和 HEAD 请求会将 `payload` 转换为 query 参数，其他请求默认编码为 JSON。

### 与 Fetch 对比

Totte 在 Fetch 的基础上封装了常见的重复逻辑，例如使用 `fetch` 发送 JSON 请求时，需要自行指定请求方法和请求头、序列化请求体、检查响应状态并解析响应内容：

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

使用 Totte 完成相同请求：

```javascript
const { data: user } = await totte.post('https://api.example.com/users', {
  username: 'example',
});
```

发送 `multipart/form-data` 时，`fetch` 需要先构造 `FormData`。此时不能手动设置 `Content-Type`，否则请求头会缺少 boundary：

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

使用 Totte 可以直接传入普通对象：

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

Totte 会将 `payload` 转换为 `FormData`，并由 Fetch 生成包含 boundary 的 `Content-Type` 请求头。

Totte 会根据请求方法和 `Content-Type` 处理 `payload`，检查 HTTP 状态并按 `responseType` 解析响应。它还提供基础地址、独立实例和请求/响应拦截器，减少在多个请求中重复编写的代码。

## 实例

`totte.create()` 返回一个独立的可调用实例：

```javascript
import totte from 'totte';

const request = totte.create({
  origin: 'https://api.example.com',
});

const { data } = await request('/users');
```

`Totte` 类提供相同的方法，但类实例本身不可调用：

```javascript
import { Totte } from 'totte';

const request = new Totte({
  origin: 'https://api.example.com',
});

const { data } = await request.get('/users');
```

实例请求头会与单次请求头合并，同名请求头以单次请求为准。

## 配置

`RequestConfig` 继承 `RequestInit`，增加四个 Totte 专用字段，并将 `method` 限定为支持的请求方法：

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

- 使用配置对象发起请求时必须提供 `url`。
- `origin` 是相对请求 URL 的基础地址。
- `payload` 表示 query 参数或请求体。
- `responseType` 默认为 `json`。
- 请求方法快捷函数的第三个参数接受 `RequestOptions`。

### Payload 序列化

| 请求                                                              | 行为                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------ |
| GET 或 HEAD                                                       | 将 `payload` 追加为 query 参数                         |
| 未设置 `Content-Type`、`application/json` 或 `application/*+json` | 使用 `JSON.stringify` 序列化 `payload`                 |
| `multipart/form-data`                                             | 将 `payload` 转换为 `FormData`，由 Fetch 设置 boundary |
| 显式提供 `body`                                                   | 直接发送 `body`，不再序列化 `payload`                  |

其他编码格式请直接提供 `body`。

## 响应

所有请求均返回 `Result<T>`：

```typescript
interface Result<T = unknown> {
  data: T;
  config: RequestConfig;
  status: number;
  statusText: string;
  headers: Headers;
}
```

响应体根据 `responseType` 解析。HEAD 响应、状态码 204 或 205，以及空 JSON 响应均返回 `null`。

## 拦截器

请求和响应拦截器支持异步，并按照注册顺序执行：

```javascript
request.useRequestInterceptor(config => {
  const headers = new Headers(config.headers);
  headers.set('Authorization', 'Bearer token');
  return { ...config, headers };
});

request.useResponseInterceptor(result => result.data);
```

请求拦截器必须返回 `RequestConfig`。响应拦截器可以修改结果，也可以返回一个值替换 `result.data`。

## 错误

HTTP 响应状态码不在 200–299 范围内或响应解析失败时，会抛出 `TotteError`：

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

HTTP 错误的 `cause` 是 `Response`，解析错误的 `cause` 是原始错误。`fetch` 产生的网络错误不会被包装。

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

导出的类型包括 `RequestConfig`、`RequestOptions`、`Result`、`Method`、`ResponseType`、`RequestInterceptor`、`ResponseInterceptor` 和 `TotteInstance`。
