# adfer

Adfer is a lightweight JavaScript HTTP client based on [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), which can be used in any runtime that supports `fetch`.

Read this in other languages: English | [简体中文](./README_zh.md)

## Installation

> [!IMPORTANT]
> Adfer is a pure ESM package, if you encounter difficulties using it in your project, can [read this](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).

### CDN

```html
<script type="module">
  import adfer from 'https://esm.sh/adfer';
</script>
```

or

```html
<script type="importmap">
  {
    "imports": {
      "adfer": "https://esm.sh/adfer"
    }
  }
</script>
<script type="module">
  import adfer from 'adfer';
</script>
```

You can also use other CDNs according to your preferences, such as [jsDelivr](https://www.jsdelivr.com/) and [UNPKG](https://unpkg.com/) etc.

### NPM

```shell
npm install adfer
```

## Usage

```javascript
import adfer from 'adfer';

// Request GET
const result1 = await adfer('https://example.org/products.json');
// Request POST
const result2 = await adfer.post('https://example.org/post', {
  username: 'example',
});
// Request FormData
const result3 = await adfer.post(
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

Compared to `fetch`, `adfer` provides a simpler and more flexible API.

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

You can also use `Adfer` or `create` to generate new instance:

```javascript
import adfer from 'adfer';

const request = adfer.create({
  origin: 'https://example.org',
});
const result = await adfer('/products.json');
```

```javascript
import { Adfer } from 'adfer';

const request = new Adfer(({
  origin: 'https://example.org',
});
const result = await adfer('/products.json');
```

## API

**adfer(init, config?)**  
**adfer.get(url, payload?, options?)**  
**adfer.post(url, payload?, options?)**  
**adfer.put(url, payload?, options?)**  
**adfer.patch(url, payload?, options?)**  
**adfer.head(url, payload?, options?)**  
**adfer.delete(url, payload?, options?)**  
**adfer.create(options?)**  
**adfer.useRequestInterceptor(callback?)**  
**adfer.useResponseInterceptor(callback?)**

## Config

The request configuration items are exactly the same as fetch, and the following four additional attributes are added to it:

```typescript
interface RequestConfig {
  url: string;
  origin?: string;
  // request payload
  payload?: object | null;
  // default 'json', options are: 'arrayBuffer' | 'blob' | 'json' | 'text' | 'formData'
  responseType?: ResponseType;
}
```

## About

"adfer" comes from the Latin verb "affero" (ad + ferre), meaning "to bring toward, to fetch". It follows the same naming philosophy as the Fetch API - a single verb that directly describes what the library does: fetching data.
