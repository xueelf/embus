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

const result = await embus('https://api.yuki.sh/ping');

console.log(result);
// -> { status: 200, data: 'Ciallo～(∠·ω< )⌒★', ... }
```

你还可以使用 class 或者 create 来创建新的实体：

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
**embus.get(url, data?, options?)**  
**embus.post(url, data?, options?)**  
**embus.put(url, data?, options?)**  
**embus.patch(url, data?, options?)**  
**embus.head(url, data?, options?)**  
**embus.delete(url, data?, options?)**  
**embus.create(options?)**  
**embus.useRequestInterceptor(callback?)**  
**embus.useResponseInterceptor(callback?)**

## 配置项

网络请求的配置项与 fetch 完全相同，并在其基础上追加了下列四个额外属性：

```javascript
{
  origin: 'https://api.yuki.sh';
  url: '/ping';
  // 可选值：'GET' | 'DELETE' | 'HEAD' | 'POST' | 'PUT' | 'PATCH'
  method: 'GET'; // 默认值
  // 可选值：'arraybuffer' | 'blob' | 'json' | 'text' | 'formData'
  responseType: 'json', // 默认值
}
```

## 关于

Embus 是日语「取って」的罗马音，其英语正是 Fetch，而且「embus」也和 「tote」非常相似，我便将其用做了该项目的名字。
