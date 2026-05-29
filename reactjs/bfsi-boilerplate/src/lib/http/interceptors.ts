/**
 * Composable axios interceptors. Each function takes an instance and attaches
 * itself. App code chooses which to add.
 *
 * Note: auth-header injection is NOT here. Tokens are set once on the instance
 * via setAuthToken() in createAxios.ts (BFSI pattern — set-at-login, never
 * read from localStorage on every request).
 */
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiError, fromStatus } from './errors.js';

/**
 * Generate a UUID-v4 for X-Request-Id / Idempotency-Key headers.
 * Prefers crypto.randomUUID when available; falls back to a manual
 * v4 layout from crypto.getRandomValues, then Math.random as a last resort.
 */
function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push(bytes[i]!.toString(16).padStart(2, '0'));
  }
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

/**
 * Request interceptor: add a correlation ID and idempotency key.
 * Idempotency key applied only to mutating methods.
 */
export function attachRequestIds(instance: AxiosInstance): void {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    config.headers.set('X-Request-Id', generateEventId());
    const method = (config.method ?? 'get').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      if (!config.headers.has('Idempotency-Key')) {
        config.headers.set('Idempotency-Key', generateEventId());
      }
    }
    return config;
  });
}

/**
 * Response transformer: convert snake_case keys to camelCase.
 * Applied if your backend uses snake_case (e.g. Rails/Python).
 */
export function attachSnakeToCamel(instance: AxiosInstance): void {
  instance.interceptors.response.use((response) => {
    response.data = deepSnakeToCamel(response.data);
    return response;
  });
}

/**
 * Request transformer: convert camelCase request bodies to snake_case.
 */
export function attachCamelToSnake(instance: AxiosInstance): void {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      config.data = deepCamelToSnake(config.data);
    }
    return config;
  });
}

/**
 * Response interceptor: convert raw axios errors into typed `ApiError`.
 */
export function attachErrorMapping(
  instance: AxiosInstance,
  opts: { onUnauthorized?: () => void } = {},
): void {
  instance.interceptors.response.use(
    (r) => r,
    (err: unknown) => {
      const apiErr = mapError(err);
      if (apiErr.kind === 'unauthorized') {
        opts.onUnauthorized?.();
      }
      return Promise.reject(apiErr);
    },
  );
}

function mapError(err: unknown): ApiError {
  if (err instanceof ApiError) {
    return err;
  }
  // We don't import AxiosError type directly because we don't want a hard runtime dep
  // on axios internals — duck-type instead.
  const e = err as {
    response?: { status?: number; data?: unknown };
    code?: string;
    message?: string;
  };

  if (e?.code === 'ECONNABORTED' || e?.code === 'ERR_CANCELED') {
    return new ApiError('Request cancelled', { kind: 'cancelled', cause: err });
  }
  if (!e?.response) {
    return new ApiError('Network error', { kind: 'network', cause: err });
  }
  const status = e.response.status ?? 0;
  const kind = fromStatus(status);
  const data = e.response.data as
    | {
        ref?: string;
        field_errors?: Record<string, string>;
        errors?: Record<string, string>;
        message?: string;
      }
    | undefined;

  return new ApiError(data?.message ?? `HTTP ${status}`, {
    kind,
    status,
    ref: data?.ref,
    fieldErrors: data?.field_errors ?? data?.errors,
    cause: err,
  });
}

// --- key transformation helpers ---

function camelToSnakeKey(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function snakeToCamelKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function deepSnakeToCamel(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(deepSnakeToCamel);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[snakeToCamelKey(k)] = deepSnakeToCamel(v);
    }
    return out;
  }
  return value;
}

function deepCamelToSnake(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(deepCamelToSnake);
  }
  if (
    value &&
    typeof value === 'object' &&
    !(value instanceof Date) &&
    !(value instanceof FormData)
  ) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[camelToSnakeKey(k)] = deepCamelToSnake(v);
    }
    return out;
  }
  return value;
}
