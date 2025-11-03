type QueryValue = string | number | boolean | null | undefined;
export type FetchFunction = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  path: string;
  query?: Record<string, QueryValue | QueryValue[]>;
  body?: unknown;
  parseJson?: boolean;
  fetchImpl?: FetchFunction;
}

export interface ApiClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  fetchImpl?: FetchFunction;
}

interface ClientConfigState {
  baseUrl: string;
  defaultHeaders: Record<string, string>;
  fetchImpl?: FetchFunction;
}

const DEFAULT_BASE_URL = (import.meta.env?.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const DEFAULT_FETCH: FetchFunction | undefined = typeof fetch === 'function' ? fetch : undefined;

let authToken: string | null = null;
let clientConfig: ClientConfigState = {
  baseUrl: DEFAULT_BASE_URL,
  defaultHeaders: {
    Accept: 'application/json',
  },
  fetchImpl: DEFAULT_FETCH,
};

function buildQueryString(query?: ApiRequestOptions['query']) {
  if (!query) {
    return '';
  }

  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    const values = Array.isArray(value) ? value : [value];

    values.forEach((entry) => {
      if (entry === undefined || entry === null) {
        return;
      }
      searchParams.append(key, String(entry));
    });
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

function resolveUrl(path: string, query?: ApiRequestOptions['query']) {
  if (/^https?:\/\//i.test(path)) {
    return `${path}${buildQueryString(query)}`;
  }

  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = clientConfig.baseUrl;

  if (!baseUrl) {
    return `${trimmedPath}${buildQueryString(query)}`;
  }

  return `${baseUrl}${trimmedPath}${buildQueryString(query)}`;
}

function prepareBody(body: unknown, requestHeaders: Headers) {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (typeof body === 'string' || body instanceof Blob || body instanceof FormData) {
    return body;
  }

  if (!requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  return JSON.stringify(body);
}

export function configureApiClient(config: ApiClientConfig = {}) {
  const sanitizedBaseUrl = (config.baseUrl ?? clientConfig.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');

  clientConfig = {
    baseUrl: sanitizedBaseUrl,
    defaultHeaders: {
      ...clientConfig.defaultHeaders,
      ...config.defaultHeaders,
    },
    fetchImpl: config.fetchImpl ?? clientConfig.fetchImpl ?? DEFAULT_FETCH,
  };
}

export function setAuthToken(token: string | null) {
  authToken = token;
}

export async function apiRequest<T = unknown>({
  path,
  query,
  body,
  parseJson = true,
  headers,
  fetchImpl,
  ...init
}: ApiRequestOptions): Promise<T> {
  const url = resolveUrl(path, query);

  const requestHeaders = new Headers({
    ...clientConfig.defaultHeaders,
    ...headers,
  });

  if (authToken && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${authToken}`);
  }

  const preparedBody = prepareBody(body, requestHeaders);

  const fetchFn = fetchImpl ?? clientConfig.fetchImpl ?? DEFAULT_FETCH;

  if (!fetchFn) {
    throw new Error('Cannot perform API request because fetch is not available in this environment.');
  }

  const response = await fetchFn(url, {
    ...init,
    headers: requestHeaders,
    body: preparedBody,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const error = new Error(
      errorText
        ? `API request failed (${response.status} ${response.statusText}): ${errorText.slice(0, 200)}`
        : `API request failed (${response.status} ${response.statusText})`
    );
    throw error;
  }

  if (!parseJson) {
    return response as unknown as T;
  }

  const contentType = response.headers.get('Content-Type');

  if (contentType && contentType.toLowerCase().includes('application/json')) {
    return (await response.json()) as T;
  }

  const rawText = await response.text();
  return rawText as unknown as T;
}
