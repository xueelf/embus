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

const result = await embus('https://api.yuki.sh/ping');

console.log(result);
// -> { status: 200, data: 'Ciallo～(∠·ω< )⌒★', ... }
```

You can also use class or create to create new instance:

```javascript
import embus from 'embus';

const request = embus.create({
  origin: 'https://api.yuki.sh',
});
const result = await embus('/ping');
```

```javascript
import { Embus } from 'embus';

const request = new Embus(({
  origin: 'https://api.yuki.sh',
});
const result = await embus('/ping');
```

## API

**embus(init, config?)**  
**embus.get(url, data?)**  
**embus.post(url, data?)**  
**embus.put(url, data?)**  
**embus.patch(url, data?)**  
**embus.head(url, data?)**  
**embus.delete(url, data?)**  
**embus.create(options?)**  
**embus.useRequestInterceptor(callback?)**  
**embus.useResponseInterceptor(callback?)**

## Config

The request configuration items are exactly the same as fetch, and the following four additional attributes are added to it:

```javascript
{
  origin: 'https://api.yuki.sh';
  url: '/ping';
  // options are: 'GET' | 'DELETE' | 'HEAD' | 'POST' | 'PUT' | 'PATCH'
  method: 'GET'; // default
  // options are: 'array buffer' | 'bloom' | 'json' | 'text' | 'formData'
  responseType: 'json', // default
}
```
