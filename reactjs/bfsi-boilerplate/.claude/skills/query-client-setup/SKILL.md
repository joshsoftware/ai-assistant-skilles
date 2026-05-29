---
name: query-client-setup
description: Configure the TanStack QueryClient — defaults, retry policy, refetch behaviour, optional global error handlers, devtools. Use when setting up the QueryClient for the first time, adjusting retry / staleTime / refetch behaviour, adding a global error handler, or wiring devtools.
---

# QueryClient Setup

`src/api/queryClient.ts` exports a single `QueryClient` instance. The shipped boilerplate sets a small set of defaults that apply to **every** BFSI project — sensible caching, focus behaviour, and a strict retry policy. Per-query tuning still lives at the call-site whenever the data needs something different from the baseline. It's mounted via `<QueryClientProvider>` in `src/app/App.tsx`.

## File map

```
src/api/
├── axiosInstance.ts    single axios for all services
├── http.ts             typed GET/POST/PUT/PATCH/DELETE helpers
└── queryClient.ts      QueryClient with defaultOptions
src/app/
└── App.tsx             wraps in <QueryClientProvider client={queryClient}>
```

## Default config (what the scaffolder ships)

```ts
import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

const ONE_MINUTE_MS = 60_000;
const FIVE_MINUTES_MS = 5 * ONE_MINUTE_MS;

function retryPolicy(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (isAxiosError(error) && error.response) {
    const status = error.response.status;
    return status >= 500 && status < 600;
  }
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ONE_MINUTE_MS,
      gcTime: FIVE_MINUTES_MS,
      refetchOnWindowFocus: false,
      retry: retryPolicy,
    },
    mutations: {
      retry: false,
    },
  },
});
```

## Why each default earns its place

| Setting                       | Value            | Reason                                                                                                                                                          |
| ----------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `staleTime`                   | 60s              | Most BFSI screens (KYC summaries, profile, lists) don't change second-to-second. A 1-minute fresh window cuts background refetches without serving badly stale data. |
| `gcTime`                      | 5m               | Keep cached responses for 5 minutes after the last subscriber unmounts so route-back navigation is instant.                                                     |
| `refetchOnWindowFocus`        | `false`          | BFSI users tab away and back constantly (OTP from SMS, copy-paste from PDFs). Surprise refetches flicker numbers and can lose draft state.                       |
| `queries.retry`               | once on 5xx/network | Network blips deserve a retry; 4xx means the request itself is wrong (auth, validation) — retrying produces the same result and wastes the user's connection.   |
| `mutations.retry`             | `false`          | Mutations have side effects. The Idempotency-Key header is the safety net for accidental double-submit, not blind retry.                                         |

Each of these earned the global slot because the value is the same across BFSI features. Per-query overrides are still expected when the data needs something different:

```tsx
// audit-critical list — always refetch on mount, baseline is too lax
useQuery({
  queryKey: kycKeys.list(filters),
  queryFn: () => getKycList(filters),
  staleTime: 0,
});

// reference data — cache aggressively, baseline is too tight
useQuery({
  queryKey: ['ifscDirectory'],
  queryFn: getIfscDirectory,
  staleTime: 10 * 60_000,
  gcTime: 30 * 60_000,
});

// live ticker — bypass the cache entirely
useQuery({
  queryKey: ['liveBalance', accountId],
  queryFn: () => getLiveBalance(accountId),
  staleTime: 0,
  refetchInterval: 5_000,
  refetchOnWindowFocus: true,
});

// allow more retries for a specific flaky upstream
useQuery({
  queryKey: ['creditScore', userId],
  queryFn: () => getCreditScore(userId),
  retry: 3,
});
```

## Promoting a new value to a global default

Once **three or more** features agree on the same override (rule of three), promote it into `queryClient.ts`:

```ts
defaultOptions: {
  queries: {
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: retryPolicy,
    structuralSharing: false,   // example: promoted after three features needed it
  },
},
```

Until then, leave a `// CONVENTION:` breadcrumb at the first call-site so `/bfsi-grep-conventions` can surface the duplication when it's time to codify.

## Wiring into the app

`src/app/App.tsx` (variant overlay):

```tsx
import { type ReactElement } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { AppRoutes } from '../routes';
import { queryClient } from '../api/queryClient';

export function App(): ReactElement {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
```

Devtools render only in dev (gated by `import.meta.env.DEV`).

## Global error handlers (optional)

For a "catch all unhandled mutation errors" toast, use a `MutationCache`:

```ts
import { QueryClient, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import { toSafeView } from '@<scope>/core/compliance';
import type { ApiError } from '@/lib/http';
import i18n from '@/i18n/i18n';

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.options.onError) return; // skip if per-mutation handler set
      const view = toSafeView(error as ApiError, i18n.t);
      toast.error(view.title, { description: view.description });
    },
  }),
  defaultOptions: {
    /* ... */
  },
});
```

See [`references/global-handlers.md`](references/global-handlers.md) for QueryCache + MutationCache patterns.

## Conventions enforced

- ❌ NEVER create multiple `QueryClient` instances — there must be exactly one for the app.
- ❌ NEVER set `refetchOnWindowFocus: true` globally (BFSI default is off; opt in per query).
- ❌ NEVER enable `mutations.retry > 0` globally — mutations have side effects; the Idempotency-Key header is the safety net.
- ❌ NEVER retry on 4xx responses — caller errors don't fix themselves. The shipped `retryPolicy` enforces this.
- ❌ NEVER render `<ReactQueryDevtools>` in production builds — gate on `import.meta.env.DEV`.
- ✅ `<QueryClientProvider>` wraps the WHOLE app (above the router, below ErrorBoundary).
- ✅ Per-query overrides go in the `useQuery` call, not the QueryClient config.
- ✅ On logout: `queryClient.clear()` after `clearAuthToken()`.

## Logout sequence

```ts
import { clearAuthToken } from '@/lib/http';
import { queryClient } from '@/api/queryClient';
import axiosInstance from '@/api/axiosInstance';

export function logout() {
  clearAuthToken(axiosInstance); // drop the auth header
  queryClient.clear(); // wipe all cached server data
  navigate('/login');
}
```

`queryClient.clear()` removes all cached queries + in-flight fetches. Without it, a re-login on the same browser sees stale data for a flash before refetch.

## References

- [`references/global-handlers.md`](references/global-handlers.md) — QueryCache.onError + MutationCache.onError patterns
- [`references/devtools.md`](references/devtools.md) — using ReactQueryDevtools effectively
