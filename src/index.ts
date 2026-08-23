import { objectToFormData, paramsToString } from './util';

/** Request configuration with all native `RequestInit` options. */
export interface RequestConfig extends RequestInit {
  /** An absolute URL or a URL relative to `origin`. */
  url: string;
  /** Base URL for relative request URLs. */
  origin?: string;
  method?: Method;
  /** Query parameters for GET and HEAD requests, or data to serialize for other methods. */
  payload?: object | null;
  /** How to parse the response body. Defaults to `json`. */
  responseType?: ResponseType;
}

/** Options accepted by instances and request method helpers. */
export type RequestOptions = Omit<RequestConfig, 'url' | 'method' | 'payload'>;
export type Method = 'GET' | 'DELETE' | 'HEAD' | 'POST' | 'PUT' | 'PATCH';
export type ResponseType = 'arrayBuffer' | 'blob' | 'json' | 'text' | 'formData';

export interface Result<T = unknown> {
  data: T;
  config: RequestConfig;
  status: number;
  statusText: string;
  headers: Response['headers'];
}

/** Error type for invalid configuration, HTTP status errors, and response parsing failures. */
export class EmbusError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'EmbusError';
  }
}

/** Reads or changes the final request configuration before the request is sent. */
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
/** Reads the current result. A returned value replaces it. */
export type ResponseInterceptor<T = Result<unknown>> = (result: T) => unknown | Promise<unknown>;

/** Applies defaults before and after request interceptors run. */
function applyDefaults(config: RequestConfig): void {
  config.method ??= 'GET';
  config.responseType ??= 'json';
}

/** Resolves the origin and appends GET and HEAD payloads as query parameters. */
function parseHref(config: RequestConfig): string {
  const href = config.origin
    ? new URL(
        config.url,
        config.origin.endsWith('/') ? config.origin : `${config.origin}/`,
      ).toString()
    : config.url;

  if (config.method !== 'GET' && config.method !== 'HEAD') {
    return href;
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

/** Converts non-query payloads to request bodies based on Content-Type. */
function parseBody(config: RequestConfig): void {
  const { body, method, payload } = config;

  // null is an explicit empty body. Only undefined allows payload serialization.
  if (method === 'GET' || method === 'HEAD' || body !== undefined || payload == null) {
    return;
  }
  const headers = new Headers(config.headers);
  const contentType = headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();

  if (!contentType || contentType === 'application/json' || contentType.endsWith('+json')) {
    config.body = JSON.stringify(payload);

    if (!contentType) {
      headers.set('content-type', 'application/json');
    }
  } else if (contentType === 'multipart/form-data') {
    config.body = objectToFormData(payload);
    // Let Fetch generate the correct FormData boundary.
    headers.delete('content-type');
  }
  config.headers = headers;
}

/** Parses a successful response and handles responses without a body. */
async function parseResponse(response: Response, config: RequestConfig): Promise<unknown> {
  if (config.method === 'HEAD' || response.status === 204 || response.status === 205) {
    return null;
  }
  switch (config.responseType) {
    case 'arrayBuffer':
      return response.arrayBuffer();
    case 'blob':
      return response.blob();
    case 'formData':
      return response.formData();
    case 'json': {
      // response.json() throws on an empty body. Embus returns null instead.
      const text = await response.text();
      return text.trim() ? JSON.parse(text) : null;
    }
    case 'text':
      return response.text();
    default:
      throw new TypeError(`Unsupported response type: ${String(config.responseType)}`);
  }
}

export class Embus {
  private readonly options: RequestOptions;
  private readonly requestInterceptors: RequestInterceptor[] = [];
  private readonly responseInterceptors: ResponseInterceptor<unknown>[] = [];

  constructor(options: RequestOptions = {}) {
    this.options = options;
  }

  /** Registers a request interceptor that runs in registration order. */
  public useRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /** Registers a response interceptor that runs in registration order. */
  public useResponseInterceptor<T = Result<unknown>>(interceptor: ResponseInterceptor<T>): void {
    this.responseInterceptors.push(interceptor as ResponseInterceptor<unknown>);
  }

  /** Creates a callable instance with isolated configuration and interceptors. */
  public create(options?: RequestOptions): EmbusInstance {
    return createInstance(options);
  }

  public get<T = unknown>(
    url: string,
    payload?: object | null,
    options?: RequestOptions,
  ): Promise<Result<T>> {
    return this.request<T>(url, { ...options, method: 'GET', payload });
  }

  public delete<T = unknown>(
    url: string,
    payload?: object | null,
    options?: RequestOptions,
  ): Promise<Result<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE', payload });
  }

  public head(
    url: string,
    payload?: object | null,
    options?: RequestOptions,
  ): Promise<Result<null>> {
    return this.request<null>(url, { ...options, method: 'HEAD', payload });
  }

  public post<T = unknown>(
    url: string,
    payload?: object | null,
    options?: RequestOptions,
  ): Promise<Result<T>> {
    return this.request<T>(url, { ...options, method: 'POST', payload });
  }

  public put<T = unknown>(
    url: string,
    payload?: object | null,
    options?: RequestOptions,
  ): Promise<Result<T>> {
    return this.request<T>(url, { ...options, method: 'PUT', payload });
  }

  public patch<T = unknown>(
    url: string,
    payload?: object | null,
    options?: RequestOptions,
  ): Promise<Result<T>> {
    return this.request<T>(url, { ...options, method: 'PATCH', payload });
  }

  /** Sends a request using a complete configuration object or a URL with separate options. */
  public async request<T = unknown>(config: RequestConfig): Promise<Result<T>>;
  public async request<T = unknown>(
    url: string,
    config?: Omit<RequestConfig, 'url'>,
  ): Promise<Result<T>>;
  public async request<T>(
    init: string | RequestConfig,
    config?: Omit<RequestConfig, 'url'>,
  ): Promise<Result<T>> {
    if (typeof init !== 'string' && (!init || typeof init !== 'object')) {
      throw new EmbusError('Invalid arguments');
    }
    const requestConfig: RequestConfig =
      typeof init === 'string'
        ? { ...this.options, ...config, url: init }
        : { ...this.options, ...init };

    // Instance headers provide defaults. Request headers override matching names.
    const headers = new Headers(this.options.headers);

    for (const [key, value] of new Headers(requestConfig.headers)) {
      headers.set(key, value);
    }
    requestConfig.headers = headers;

    if (typeof requestConfig.url !== 'string') {
      throw new EmbusError('Invalid URL');
    }
    applyDefaults(requestConfig);

    for (const interceptor of this.requestInterceptors) {
      Object.assign(requestConfig, await interceptor(requestConfig));
    }
    applyDefaults(requestConfig);
    parseBody(requestConfig);

    const href = parseHref(requestConfig);
    const response = await fetch(href, requestConfig);

    if (!response.ok) {
      throw new EmbusError(`${response.status} ${response.statusText}`, {
        cause: response,
      });
    }
    let data: unknown;

    try {
      data = await parseResponse(response, requestConfig);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new EmbusError(message, { cause: error });
    }
    let result: unknown = {
      data,
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
    return result as Result<T>;
  }
}

/** A client that is both callable and exposes the `Embus` instance methods. */
export interface EmbusInstance extends Embus {
  <T = unknown>(config: RequestConfig): Promise<Result<T>>;
  <T = unknown>(url: string, config?: Omit<RequestConfig, 'url'>): Promise<Result<T>>;
}

/** Creates an independent callable client instance. */
export function createInstance(options: RequestOptions = {}): EmbusInstance {
  const context = new Embus(options);
  // Bind every entry point to one context so they share configuration and interceptors.
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
