# embus

Embus 是一个基于 [Fetch API](https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API) 的轻量级 JavaScript 网络请求库，它可以在任何支持 `fetch` 的环境中使用。

使用其他语言阅读：[English](./README.md) | 简体中文

## 安装

> [!IMPORTANT]
> Embus 是一个纯 ESM 包，如果你在自己的项目中使用它遇到了困难，可以 [查看这里](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)。

### CDN

```html
<script type="module">
  import embus from 'https://esm.sh/embus';
</script>
```

或者

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

你也可以根据自己的喜好来使用其它 CDN，例如 [jsDelivr](https://www.jsdelivr.com/) 和 [UNPKG](https://unpkg.com/)。

### NPM

```shell
npm install embus
```

## 使用

```javascript
import embus from 'embus';

// Request GET
const result1 = await embus('https://example.org/products.json');
// Request POST
const result2 = await embus.post('https://example.org/post', {
  username: 'example',
});
// Request FormData
const result3 = await embus.post(
  'https://example.org/post',
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

与 `fetch` 相比，`embus` 提供的 API 更加简便、灵活。

```javascript
// GET Request
const response1 = await fetch('https://example.org/products.json');
const json1 = await response1.json();

// POST Request
const response2 = await fetch('https://example.org/post', {
  method: 'POST',
  body: JSON.stringify({
    username: 'example',
  }),
});
const json2 = await response2.json();

// Request FormData
const formData = new FormData();
formData.append('username', 'example');

const response3 = await fetch('https://example.org/post', {
  method: 'POST',
  body: formData,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
const json3 = await response3.json();
```

你还可以使用 `Embus` 类或者 `create` 来构建新的实例：

```javascript
import embus from 'embus';

const request = embus.create({
  origin: 'https://example.org',
});
const result = await embus('/products.json');
```

```javascript
import { Embus } from 'embus';

const request = new Embus(({
  origin: 'https://example.org',
});
const result = await embus('/products.json');
```

## API

**embus(init, config?)**  
**embus.get(url, payload?, options?)**  
**embus.post(url, payload?, options?)**  
**embus.put(url, payload?, options?)**  
**embus.patch(url, payload?, options?)**  
**embus.head(url, payload?, options?)**  
**embus.delete(url, payload?, options?)**  
**embus.create(options?)**  
**embus.useRequestInterceptor(callback?)**  
**embus.useResponseInterceptor(callback?)**

## 配置项

网络请求的配置项与 `fetch` 完全相同，并在其基础上追加了下列四个额外属性：

```typescript
interface RequestConfig {
  url: string;
  origin?: string;
  // 请求载荷
  payload?: object | null;
  // 默认 'json'，可选值：'arraybuffer' | 'blob' | 'json' | 'text' | 'formData'
  responseType?: ResponseType;
}
```

## 关于

Embus 是日语「取って」的罗马音，其英语正是 Fetch，而且「embus」也和 「tote」非常相似，我便将其用做了该项目的名字。
