/**
 * Typed HTTP errors. Use these instead of raw `AxiosError` in app code.
 */

export type ApiErrorKind =
  | 'network' // no response, offline, connection refused
  | 'timeout' // request exceeded timeout
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'not_found' // 404
  | 'conflict' // 409
  | 'validation' // 422 — body should have field-level errors
  | 'rate_limited' // 429
  | 'server_error' // 5xx
  | 'cancelled' // user cancelled / abort signal
  | 'unknown';

export interface ApiErrorOptions {
  kind: ApiErrorKind;
  /** HTTP status if available. */
  status?: number;
  /** Server-generated ref code or our own short ref for support. */
  ref?: string;
  /** Field-level errors from 422. Map of field path → message. */
  fieldErrors?: Record<string, string>;
  /** Original error (not exposed via toJSON). */
  cause?: unknown;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly ref?: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(message: string, opts: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.kind = opts.kind;
    this.status = opts.status;
    this.ref = opts.ref;
    this.fieldErrors = opts.fieldErrors;
    if (opts.cause !== undefined) {
      (this as Error).cause = opts.cause;
    }
  }

  /**
   * User-safe representation. Does NOT include `cause` (stack/PII risk).
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      kind: this.kind,
      status: this.status,
      ref: this.ref,
      fieldErrors: this.fieldErrors,
    };
  }
}

export function fromStatus(status: number): ApiErrorKind {
  if (status === 401) {return 'unauthorized';}
  if (status === 403) {return 'forbidden';}
  if (status === 404) {return 'not_found';}
  if (status === 409) {return 'conflict';}
  if (status === 422) {return 'validation';}
  if (status === 429) {return 'rate_limited';}
  if (status >= 500 && status < 600) {return 'server_error';}
  return 'unknown';
}
