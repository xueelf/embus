import { parseBody, parseError, paramsToString, assignDeep } from '@/utils';

export interface RequestConfig extends RequestInit {
  url: string;
  origin?: string;
  method?: Method;
  responseType?: ResponseType;
}
export type RequestOptions = Omit<RequestConfig, 'url' | 'method' | 'body'>;
export type Method = 'GET' | 'DELETE' | 'HEAD' | 'POST' | 'PUT' | 'PATCH';
export type ResponseType = 'arraybuffer' | 'blob' | 'json' | 'text' | 'formData';

export interface Result<T = unknown> {
  data: T;
  config: RequestConfig;
  status: number;
  statusText: string;
  headers: Headers;
}

class EmbusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbusError';
  }
}

export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor<T = unknown> = (result: Result<T>) => Result | Promise<Result>;

export class Embus {
  private options?: RequestOptions;
  private requestInterceptors: RequestInterceptor[];
  private responseInterceptors: ResponseInterceptor[];

  constructor(options: RequestOptions = {}) {
    this.options = options;
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }

  public useRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  public useResponseInterceptor<T>(interceptor: ResponseInterceptor<T>): void {
    this.responseInterceptors.push(<ResponseInterceptor>interceptor);
  }

  public create(options: RequestOptions): EmbusInstance {
    return createInstance(new Embus(options));
  }

  public async request<T>(config: RequestConfig): Promise<Result<T>>;
  public async request<T>(url: string, config?: Omit<RequestConfig, 'url'>): Promise<Result<T>>;
  public async request<T>(
    init: string | RequestConfig,
    config?: Omit<RequestConfig, 'url'>,
  ): Promise<Result<T>> {
    const defaultConfig = assignDeep<RequestConfig>(
      {
        method: 'GET',
        responseType: 'json',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      this.options,
    );

    switch (typeof init) {
      case 'string':
        assignDeep(defaultConfig, { url: init }, config);
        break;
      case 'object':
        assignDeep(defaultConfig, init, config);
        break;
      default:
        throw new EmbusError('Invalid arguments');
    }

    for (const interceptor of this.requestInterceptors) {
      assignDeep(defaultConfig, await interceptor(defaultConfig));
    }
    const url = (defaultConfig.origin ?? '') + defaultConfig.url;
    const response = await fetch(url, defaultConfig);
    const result: Result = {
      data: null,
      status: response.status,
      config: defaultConfig,
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

    for (const interceptor of this.responseInterceptors) {
      await interceptor(result);
    }
    return <Result<T>>result;
  }

  public get<T>(url: string, data?: object, options: RequestOptions = {}): Promise<Result<T>> {
    if (data) {
      url += (/\?/.test(url) ? '&' : '?') + paramsToString(data);
    }

    return this.request<T>({
      url,
      method: 'GET',
      ...options,
    });
  }

  public delete<T>(url: string, data?: object, options: RequestOptions = {}): Promise<Result<T>> {
    return this.request<T>({
      url,
      method: 'DELETE',
      body: parseBody(data),
      ...options,
    });
  }

  public head<T = null>(url: string): Promise<Result<T>> {
    return this.request<T>({
      url,
      method: 'HEAD',
    });
  }

  public post<T>(url: string, data?: object, options: RequestOptions = {}): Promise<Result<T>> {
    return this.request<T>({
      url,
      method: 'POST',
      body: parseBody(data),
      ...options,
    });
  }

  public put<T>(url: string, data?: object, options: RequestOptions = {}): Promise<Result<T>> {
    return this.request<T>({
      url,
      method: 'PUT',
      body: parseBody(data),
      ...options,
    });
  }

  public patch<T>(url: string, data?: object, options: RequestOptions = {}): Promise<Result<T>> {
    return this.request<T>({
      url,
      method: 'PATCH',
      body: parseBody(data),
      ...options,
    });
  }
}

interface EmbusInstance extends Embus {
  (...args: Parameters<Embus['request']>): ReturnType<Embus['request']>;
}

function createInstance(context: Embus): EmbusInstance {
  const instance = Embus.prototype.request.bind(context);
  const keys = <Array<keyof Embus>>Object.getOwnPropertyNames(Embus.prototype);

  for (const key of keys) {
    Reflect.set(instance, key, context[key].bind(context));
  }
  return instance as unknown as EmbusInstance;
}

const context = new Embus();
const embus = createInstance(context);

export default embus;
