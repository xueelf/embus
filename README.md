# embus

Embus is a lightweight JavaScript HTTP client based on [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), which can be used in any runtime that supports `fetch`.

Read this in other languages: English | [简体中文](./README.zh.md)

## Installation

> [!IMPORTANT]
> Embus is a pure ESM package, if you encounter difficulties using it in your project, can [read this](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).

### CDN

```html
<script type="module">
  import embus from 'https://esm.sh/embus';
</script>
```

or

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

You can also use other CDNs according to your preferences, such as [jsDelivr](https://www.jsdelivr.com/) and [UNPKG](https://unpkg.com/).

### NPM

```shell
npm install embus
```

## Usage

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

Compared to `fetch`, `embus` provides a simpler and more flexible API.

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

You can also use `Embus` or `create` to generate new instance:

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

Embus is the romanization of the Japanese word "取って", which is exactly Fetch in English, and "embus" is also very similar to "tote", so I used it as the name of the project.
