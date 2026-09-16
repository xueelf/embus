import { objectToFormData, paramsToString } from './util';

/** 包含所有原生 `RequestInit` 选项的请求配置。 */
export interface RequestConfig extends RequestInit {
  /** 绝对 URL 或相对于 `origin` 的 URL。 */
  url: string;
  /** 相对请求 URL 的基础地址。 */
  origin?: string;
  method?: Method;
  /** GET 和 HEAD 请求的查询参数，或其他请求方法待序列化的数据。 */
  payload?: object | null;
  /** 响应体的解析方式，默认为 `json`。 */
  responseType?: ResponseType;
}

/** 实例和请求方法快捷函数接受的选项。 */
export type RequestOptions = Omit<RequestConfig, 'url' | 'method' | 'payload'>;
const methods = ['GET', 'DELETE', 'HEAD', 'POST', 'PUT', 'PATCH'] as const;
const responseTypes = ['arrayBuffer', 'blob', 'json', 'text', 'formData'] as const;
export type Method = (typeof methods)[number];
export type ResponseType = (typeof responseTypes)[number];

export interface Result<T = unknown> {
  data: T;
  config: RequestConfig;
  status: number;
  statusText: string;
  headers: Response['headers'];
}

/** Embus 配置无效或 HTTP 响应失败时的错误类型。 */
export class EmbusError extends Error {
  constructor(
    message: string,
    public readonly response?: Response,
  ) {
    super(message);
    this.name = 'EmbusError';
  }
}

/** 发送请求前读取或修改请求配置。 */
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
/** 读取当前结果，非 undefined 返回值会替换当前结果。 */
export type ResponseInterceptor<T = Result<unknown>> = (result: T) => unknown | Promise<unknown>;

/** 在请求拦截器链的每个阶段校验并复制配置。 */
function normalizeConfig(config: RequestConfig) {
  if (!config || typeof config !== 'object') {
    throw new EmbusError('Invalid arguments');
  }
  if (typeof config.url !== 'string') {
    throw new EmbusError('Invalid URL');
  }
  if (config.origin !== undefined && typeof config.origin !== 'string') {
    throw new EmbusError('Invalid origin');
  }
  const method = config.method ?? 'GET';
  const responseType = config.responseType ?? 'json';

  if (!methods.includes(method)) {
    throw new EmbusError(`Unsupported method: ${String(method)}`);
  }
  if (!responseTypes.includes(responseType)) {
    throw new EmbusError(`Unsupported response type: ${String(responseType)}`);
  }
  if (config.payload != null && typeof config.payload !== 'object') {
    throw new EmbusError('Invalid payload: expected an object');
  }
  return { ...config, method, responseType, headers: new Headers(config.headers) };
}

/** 解析基础地址，并将 GET 和 HEAD 的请求数据追加为查询参数。 */
function parseHref(config: RequestConfig): string {
  let href = config.url;

  if (config.origin) {
    const origin = new URL(config.origin);

    if (!origin.pathname.endsWith('/')) {
      origin.pathname += '/';
    }
    href = new URL(href, origin).toString();
  }

  if (config.method !== 'GET' && config.method !== 'HEAD') {
    return href;
  }
  if (config.payload instanceof FormData) {
    throw new EmbusError(
      'FormData cannot be used as query parameters. Use an object or URLSearchParams.',
    );
  }

  const query = paramsToString(config.payload);

  if (!query) {
    return href;
  }
  const hashIndex = href.indexOf('#');
  const hash = hashIndex === -1 ? '' : href.slice(hashIndex);
  const base = hashIndex === -1 ? href : href.slice(0, hashIndex);

  return `${base}${base.includes('?') ? '&' : '?'}${query}${hash}`;
}

/** 根据 Content-Type 将非 GET 和 HEAD 请求的数据转换为请求体。 */
function parseBody(config: RequestConfig): void {
  const { body, method, payload } = config;

  // null 表示显式空请求体，仅 undefined 允许序列化 payload。
  if (method === 'GET' || method === 'HEAD' || body !== undefined || payload == null) {
    return;
  }
  const headers = new Headers(config.headers);
  const contentType = headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  const isFormData = payload instanceof FormData;

  if (isFormData && contentType && contentType !== 'multipart/form-data') {
    throw new EmbusError(`FormData payload requires multipart/form-data, received ${contentType}`);
  }
  if (isFormData || contentType === 'multipart/form-data') {
    config.body = isFormData ? payload : objectToFormData(payload);
    // 由 Fetch 生成正确的 FormData 边界。
    headers.delete('content-type');
  } else if (!contentType || /^application\/(?:json|[^\s/;]+\+json)$/.test(contentType)) {
    config.body = JSON.stringify(payload);

    if (!contentType) {
      headers.set('content-type', 'application/json');
    }
  } else {
    throw new EmbusError(
      `Unsupported payload content type: ${contentType}. Provide body directly.`,
    );
  }
  config.headers = headers;
}

/** 解析成功响应，并处理没有响应体的情况。 */
async function parseResponse(
  response: Response,
  method: Method,
  responseType: ResponseType,
): Promise<unknown> {
  if (method === 'HEAD' || response.status === 204 || response.status === 205) {
    return null;
  }
  if (responseType === 'json') {
    // response.json() 遇到空响应体会抛出错误，此处返回 null。
    const text = await response.text();
    return text.trim() ? JSON.parse(text) : null;
  }
  return response[responseType]();
}

export class Embus {
  private readonly options: RequestOptions;
  private readonly requestInterceptors: RequestInterceptor[] = [];
  private readonly responseInterceptors: ResponseInterceptor<unknown>[] = [];

  constructor(options: RequestOptions = {}) {
    this.options = { ...options, headers: new Headers(options.headers) };
  }

  /** 注册请求拦截器，按注册顺序执行。 */
  public useRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /** 注册响应拦截器，按注册顺序执行。 */
  public useResponseInterceptor<T = Result<unknown>>(interceptor: ResponseInterceptor<T>): void {
    this.responseInterceptors.push(interceptor as ResponseInterceptor<unknown>);
  }

  /** 创建配置和拦截器相互独立的可调用实例。 */
  public create(options?: RequestOptions): EmbusInstance {
    return createInstance(options);
  }

  public get<T = unknown, R = Result<T>>(
    url: string,
    payload?: object | null,
    options?: RequestOptions,
  ): Promise<R> {
    return this.request<T, R>(url, { ...options, method: 'GET', payload });
  }

  public delete<T = unknown, R = Result<T>>(
    url: string,
    payload?: object | null,
    options?: RequestOptions,
  ): Promise<R> {
    return this.request<T, R>(url, { ...options, method: 'DELETE', payload });
  }

  public head<R = Result<null>>(
    url: string,
    payload?: object | null,
    options?: RequestOptions,
  ): Promise<R> {
    return this.request<null, R>(url, { ...options, method: 'HEAD', payload });
  }

  public post<T = unknown, R = Result<T>>(
    url: string,
    payload?: object | null,
    options?: RequestOptions,
  ): Promise<R> {
    return this.request<T, R>(url, { ...options, method: 'POST', payload });
  }

  public put<T = unknown, R = Result<T>>(
    url: string,
    payload?: object | null,
    options?: RequestOptions,
  ): Promise<R> {
    return this.request<T, R>(url, { ...options, method: 'PUT', payload });
  }

  public patch<T = unknown, R = Result<T>>(
    url: string,
    payload?: object | null,
    options?: RequestOptions,
  ): Promise<R> {
    return this.request<T, R>(url, { ...options, method: 'PATCH', payload });
  }

  /** 使用完整配置对象，或 URL 与独立配置发送请求。 */
  public async request<T = unknown, R = Result<T>>(config: RequestConfig): Promise<R>;
  public async request<T = unknown, R = Result<T>>(
    url: string,
    config?: Omit<RequestConfig, 'url'>,
  ): Promise<R>;
  public async request(
    init: string | RequestConfig,
    config?: Omit<RequestConfig, 'url'>,
  ): Promise<unknown> {
    if (typeof init !== 'string' && (!init || typeof init !== 'object')) {
      throw new EmbusError('Invalid arguments');
    }
    const mergedConfig: RequestConfig =
      typeof init === 'string'
        ? { ...this.options, ...config, url: init }
        : { ...this.options, ...init };

    // 实例请求头作为默认值，单次请求覆盖同名请求头。
    const headers = new Headers(this.options.headers);

    for (const [key, value] of new Headers(mergedConfig.headers)) {
      headers.set(key, value);
    }
    let requestConfig = normalizeConfig({ ...mergedConfig, headers });

    for (const interceptor of this.requestInterceptors) {
      requestConfig = normalizeConfig(await interceptor(requestConfig));
    }
    parseBody(requestConfig);

    const href = parseHref(requestConfig);
    const response = await fetch(href, requestConfig);

    if (!response.ok) {
      throw new EmbusError(`${response.status} ${response.statusText}`, response);
    }
    let result: unknown = {
      data: await parseResponse(response, requestConfig.method, requestConfig.responseType),
      status: response.status,
      config: requestConfig,
      statusText: response.statusText,
      headers: response.headers,
    };

    for (const interceptor of this.responseInterceptors) {
      const transformed = await interceptor(result);

      if (transformed !== undefined) {
        result = transformed;
      }
    }
    return result;
  }
}

/** 既可直接调用，也提供 `Embus` 实例方法的客户端。 */
export interface EmbusInstance extends Pick<Embus, keyof Embus> {
  <T = unknown, R = Result<T>>(config: RequestConfig): Promise<R>;
  <T = unknown, R = Result<T>>(url: string, config?: Omit<RequestConfig, 'url'>): Promise<R>;
}

/** 创建独立的可调用客户端实例。 */
export function createInstance(options: RequestOptions = {}): EmbusInstance {
  const context = new Embus(options);
  // 将所有入口绑定到同一个上下文，共享配置和拦截器。
  const instance = context.request.bind(context) as EmbusInstance;

  instance.request = context.request.bind(context);
  instance.get = context.get.bind(context);
  instance.delete = context.delete.bind(context);
  instance.head = context.head.bind(context);
  instance.post = context.post.bind(context);
  instance.put = context.put.bind(context);
  instance.patch = context.patch.bind(context);
  instance.create = context.create.bind(context);
  instance.useRequestInterceptor = context.useRequestInterceptor.bind(context);
  instance.useResponseInterceptor = context.useResponseInterceptor.bind(context);

  return instance;
}

const instance: EmbusInstance = createInstance();

export default instance;
