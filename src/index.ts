import { parseError, paramsToString, assignDeep, objectToFormData, cloneDeep } from './util';

export interface RequestConfig extends RequestInit {
  [key: string]: unknown;
  url: string;
  origin?: string;
  href?: string;
  method?: Method;
  headers?: Record<string, string>;
  payload?: object | null;
  responseType?: ResponseType;
}
export type RequestOptions = Omit<RequestConfig, 'url' | 'href' | 'method' | 'body' | 'payload'>;
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
export type ResponseInterceptor<T = unknown, R extends Result<T> = Result<T>> = (
  result: R,
) => void | R | Promise<void | R>;

const methods = ['get', 'delete', 'head', 'post', 'put', 'patch'];

export interface Embus {
  useRequestInterceptor(interceptor: RequestInterceptor): void;
  useResponseInterceptor<T>(interceptor: ResponseInterceptor<T>): void;
  create(options?: RequestOptions): EmbusInstance;
  request<T>(config: RequestConfig): Promise<Result<T>>;
  get<T>(url: string, payload?: object | null, options?: RequestOptions): Promise<Result<T>>;
  delete<T>(url: string, payload?: object | null, options?: RequestOptions): Promise<Result<T>>;
  head<T>(url: string, payload?: object | null, options?: RequestOptions): Promise<Result<T>>;
  post<T>(url: string, payload?: object | null, options?: RequestOptions): Promise<Result<T>>;
  put<T>(url: string, payload?: object | null, options?: RequestOptions): Promise<Result<T>>;
  patch<T>(url: string, payload?: object | null, options?: RequestOptions): Promise<Result<T>>;
}
export class Embus {
  private options: RequestOptions;
  private requestInterceptors: RequestInterceptor[];
  private responseInterceptors: ResponseInterceptor[];

  constructor(options: RequestOptions = {}) {
    this.options = options;
    this.requestInterceptors = [];
    this.responseInterceptors = [];

    this.useRequestInterceptor(config => {
      config.origin ??= '';
      config.method ??= 'GET';
      config.responseType ??= 'json';
      config.headers = assignDeep<Record<string, string>>(
        {
          'Content-Type': 'application/json',
        },
        config.headers,
      );
      config.href = config.origin + config.url;

      this.parseBody(config);
      return config;
    });

    methods.forEach(method => {
      Reflect.set(
        this,
        method,
        (url: string, payload?: object | null, options: RequestOptions = {}): Promise<Result> =>
          this.request.call(this, url, {
            method: <Method>method.toUpperCase(),
            payload,
            ...options,
          }),
      );
    });
  }

  private parseHref(config: RequestConfig): string {
    let href: string = config.href!;

    if (config.method === 'GET') {
      href += (/\?/.test(href) ? '&' : '?') + paramsToString(config.payload);
    }
    return href;
  }

  private parseBody(config: RequestConfig): RequestConfig {
    const { body, method, payload } = config;

    if (method === 'GET' || body || !payload) {
      return config;
    }
    // const has_blob = Object.entries(payload).some(([_, value]) => value instanceof Blob);

    switch (config.headers?.['Content-Type']) {
      case 'application/json':
        config.body = JSON.stringify(payload);
        break;
      case 'multipart/form-data':
        config.body = objectToFormData(payload);
        break;
    }
    return config;
  }

  public useRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  public useResponseInterceptor<T>(interceptor: ResponseInterceptor<T>): void {
    this.responseInterceptors.push(<ResponseInterceptor>interceptor);
  }

  public create(options?: RequestOptions): EmbusInstance {
    return createInstance(options);
  }

  public async request<T>(config: RequestConfig): Promise<Result<T>>;
  public async request<T>(url: string, config?: Omit<RequestConfig, 'url'>): Promise<Result<T>>;
  public async request<T>(
    init: string | RequestConfig,
    config?: Omit<RequestConfig, 'url'>,
  ): Promise<Result<T>> {
    const defaultConfig = cloneDeep(this.options) as RequestConfig;

    switch (typeof init) {
      case 'string':
        assignDeep(defaultConfig, { url: init }, config);
        break;
      case 'object':
        assignDeep(defaultConfig, init);
        break;
      default:
        throw new EmbusError('Invalid arguments');
    }
    const req_interceptor_count = this.requestInterceptors.length;

    for (let index = 0; index < req_interceptor_count; index++) {
      const interceptor = this.requestInterceptors[index];
      assignDeep(defaultConfig, await interceptor(defaultConfig));
    }
    const href = this.parseHref(defaultConfig);
    const response = await fetch(href, defaultConfig);
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
    const res_interceptor_count = this.responseInterceptors.length;

    for (let index = 0; index < res_interceptor_count; index++) {
      const interceptor = this.responseInterceptors[index];
      const ripeData = await interceptor(result);

      if (!ripeData) {
        continue;
      }
      result.data = ripeData;
    }
    return <Result<T>>result;
  }
}

export interface EmbusInstance extends Embus {
  (...args: Parameters<Embus['request']>): ReturnType<Embus['request']>;
}

export function createInstance(options: RequestOptions = {}): EmbusInstance {
  const context = new Embus(options);
  const instance = Embus.prototype.request.bind(context);
  const keys = <Array<keyof Embus>>[...Object.getOwnPropertyNames(Embus.prototype), ...methods];

  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    const method = context[key];

    if (typeof method !== 'function') {
      continue;
    }
    Reflect.set(instance, key, method.bind(context));
  }
  return instance as unknown as EmbusInstance;
}
const instance: EmbusInstance = createInstance();

export default instance;
export * from './util';
