import { parseError } from '@/utils';

interface Config extends RequestInit {
  url: string;
  origin?: string;
  method?: Method;
  responseType?: ResponseType;
}

type Method = 'GET' | 'DELETE' | 'HEAD' | 'POST' | 'PUT' | 'PATCH';
type ResponseType = 'arraybuffer' | 'blob' | 'json' | 'text' | 'formData';

interface Result<T = unknown> {
  data: T;
  /** 请求配置项 */
  config: Config;
  /** 响应状态码 */
  status: number;
  /** 状态码消息 */
  statusText: string;
  /** 请求头 */
  headers: Headers;
}

export class EmbusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbusError';
  }
}

class Embus {
  constructor() {}

  async request<T>(config: Config): Promise<Result<T>>;
  async request<T>(url: string, config?: Omit<Config, 'url'>): Promise<Result<T>>;
  async request<T>(option: string | Config, config?: Omit<Config, 'url'>): Promise<Result<T>> {
    const defaultConfig: Partial<Config> = {
      method: 'GET',
      responseType: 'json',
    };

    if (typeof option === 'string') {
      Object.assign(defaultConfig, { url: option }, config);
    } else {
      Object.assign(defaultConfig, option);
    }
    const url = (defaultConfig.origin ?? '') + defaultConfig.url;
    const response = await fetch(url, defaultConfig);
    const result: Result = {
      data: null,
      status: response.status,
      config: <Config>defaultConfig,
      statusText: response.statusText,
      headers: response.headers,
    };

    try {
      switch (defaultConfig.responseType) {
        case 'arraybuffer':
          result.data = await response.arrayBuffer();
          break;
        case 'blob':
          result.data = await response.blob();
          break;
        case 'formData':
          result.data = await response.formData();
          break;
        case 'json':
          result.data = await response.json();
          break;
        case 'text':
          result.data = await response.text();
          break;
      }
    } catch (error) {
      if (!response.ok) {
        throw new EmbusError(parseError(error));
      }
    }
    return <Result<T>>result;
  }
  async get() {}
  async delete() {}
  async head() {}
  async post() {}
  async put() {}
  async patch() {}
}

interface EmbusInstance extends Embus {
  (...args: Parameters<Embus['request']>): ReturnType<Embus['request']>;
}

function createInstance(): EmbusInstance {
  const context = new Embus();
  const instance = Embus.prototype.request.bind(context);
  const keys = <Array<keyof Embus>>Object.getOwnPropertyNames(Embus.prototype);

  for (const key of keys) {
    Reflect.set(instance, key, context[key]);
  }
  return instance as unknown as EmbusInstance;
}

const embus = createInstance();

export default embus;
