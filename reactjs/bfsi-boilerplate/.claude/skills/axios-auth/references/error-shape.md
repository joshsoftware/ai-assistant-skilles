# Error shape contract (TanStack variant)

## `ApiError` (from `@/lib/http`)

```ts
class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly ref?: string;
  readonly fieldErrors?: Record<string, string>;
}

type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'rate_limited'
  | 'server_error'
  | 'cancelled'
  | 'unknown';
```

`createAxios` converts every axios error into `ApiError`. Services THROW it (since they return promises). TanStack Query catches and exposes via `useQuery({ error })` / `useMutation({ onError, error })`.

## Backend error envelope

```json
{
  "errors": [{ "detail": "Email is already taken" }]
}
```

Or for field-level (422):

```json
{
  "errors": {
    "email": ["is already taken"],
    "password": ["is too short"]
  }
}
```

`ApiError.fieldErrors` is populated for `kind === 'validation'`.

## Surfacing errors in components

```tsx
import { useMutation } from '@tanstack/react-query';
import type { ApiError } from '@/lib/http';
import { submitKyc } from '@/services/kyc';

const mutation = useMutation({
  mutationFn: submitKyc,
  onError: (error: ApiError) => {
    if (error.kind === 'validation' && error.fieldErrors) {
      // Set RHF field errors:
      for (const [field, msg] of Object.entries(error.fieldErrors)) {
        form.setError(field as keyof FormValues, { message: msg });
      }
    } else if (error.kind === 'unauthorized') {
      // Already handled by axios's onUnauthorized — nothing to do.
    } else {
      toast.error(safeMessage(error));
    }
  },
});
```

## NEVER expose to UI

- ❌ `error.message` from raw axios — leaks "Network Error" / stack info
- ❌ `error.response.data.errors` raw — may contain SQL fragments, DB IDs
- ❌ HTTP status codes as user copy ("Error 500")

Use `toSafeView(error, t)` from `@<scope>/core/compliance` to convert `ApiError.kind` into a user-facing toast title + description + ref code.

## Retry semantics

Default `queryClient` config (in `src/api/queryClient.ts`):

- Queries: retry up to 2x on 5xx and 408/429; never retry 4xx (except 408/429); no retry on network errors that aren't transient
- Mutations: NEVER auto-retry. Use idempotency-key + explicit user-triggered retry

This matters in BFSI: silently retrying a payment mutation on an ambiguous 5xx could double-charge.
