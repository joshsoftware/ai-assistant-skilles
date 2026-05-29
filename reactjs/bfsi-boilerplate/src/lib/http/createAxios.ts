/**
 * Configurable axios factory. Apps create one (or more) instances by
 * composing the interceptors they need.
 *
 * Auth model: tokens are set ONCE on the instance via {@link setAuthToken} at
 * login time, not injected per-request. This is the BFSI starter's set-at-login
 * pattern — cheaper than reading from localStorage on every call. Call
 * {@link clearAuthToken} on logout / 401.
 */
import axios, { type AxiosInstance } from 'axios';
import {
  attachCamelToSnake,
  attachErrorMapping,
  attachRequestIds,
  attachSnakeToCamel,
} from './interceptors.js';

export interface CreateAxiosOptions {
  baseURL: string;
  timeoutMs?: number;
  /** Header name for the auth token. Default `Authorization` (sends `Bearer <token>`). */
  authHeaderName?: string;
  /** Callback for 401 responses (typically: clear auth + redirect to login). */
  onUnauthorized?: () => void;
  /**
   * Whether backend uses snake_case. If true, response keys are converted to
   * camelCase and request bodies converted to snake_case.
   */
  snakeCaseBackend?: boolean;
  /** Disable auto idempotency-key + correlation-id headers if you handle them yourself. */
  disableRequestIds?: boolean;
}

export function createAxios(opts: CreateAxiosOptions): AxiosInstance {
  const instance = axios.create({
    baseURL: opts.baseURL,
    timeout: opts.timeoutMs ?? 30_000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Stash the auth header name on the instance for set/clear helpers.
  (instance as AxiosInstance & { __authHeaderName?: string }).__authHeaderName =
    opts.authHeaderName ?? 'Authorization';

  if (!opts.disableRequestIds) {
    attachRequestIds(instance);
  }

  if (opts.snakeCaseBackend) {
    attachSnakeToCamel(instance);
    attachCamelToSnake(instance);
  }

  attachErrorMapping(instance, {
    onUnauthorized: () => {
      clearAuthToken(instance);
      opts.onUnauthorized?.();
    },
  });

  return instance;
}

/**
 * Set the auth token on an axios instance — call once at login.
 *
 * If the header name is `Authorization`, the value is automatically prefixed
 * with `Bearer `. For any other header name (e.g. `X-Auth-Token`), the value
 * is set verbatim.
 */
export function setAuthToken(instance: AxiosInstance, token: string): void {
  const headerName =
    (instance as AxiosInstance & { __authHeaderName?: string }).__authHeaderName ?? 'Authorization';
  const value = headerName === 'Authorization' ? `Bearer ${token}` : token;
  instance.defaults.headers.common[headerName] = value;
}

/**
 * Remove the auth token from an axios instance — call on logout / 401.
 */
export function clearAuthToken(instance: AxiosInstance): void {
  const headerName =
    (instance as AxiosInstance & { __authHeaderName?: string }).__authHeaderName ?? 'Authorization';
  delete instance.defaults.headers.common[headerName];
}
