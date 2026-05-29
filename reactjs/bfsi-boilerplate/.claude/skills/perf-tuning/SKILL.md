---
name: perf-tuning
description: TanStack Query performance tuning for the TanStack variant — `staleTime` vs `gcTime` (formerly `cacheTime`), `select` for derived data without re-rendering siblings, structural sharing, query-key normalisation, `useInfiniteQuery` virtualisation, optimistic updates, Suspense mode, persisters, and per-query refetch policies. Use when adding a perf-sensitive query, debugging unexpected refetches, tuning the QueryClient defaults, pairing with list virtualisation, or wiring optimistic mutations.
---

# TanStack Query Performance Tuning

Pairs with the toolkit-wide [`bfsi-perf-react`](../../../../../packages/claude-toolkit/skills/bfsi-perf-react/SKILL.md) reference. This skill is TanStack-Query-specific (works for v5; v4 noted where relevant).

## `staleTime` vs `gcTime` — the most-misunderstood pair

| Field       | Default | Means                                                                                    |
| ----------- | ------- | ---------------------------------------------------------------------------------------- |
| `staleTime` | 0       | How long the data is considered FRESH. Within this window, no refetch is triggered.      |
| `gcTime`    | 5 min   | How long inactive (no subscribers) cached data sits in memory before garbage collection. |

The default `staleTime: 0` means **every mount triggers a refetch**. Almost always wrong for BFSI screens. Defaults that work:

```ts
// src/api/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30s — most data is fine to show stale for half a minute
      gcTime: 5 * 60 * 1000, // 5 min — RAM is cheap; refetch is expensive
      refetchOnWindowFocus: false, // explicit per-query opt-in
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 0, // mutations should be idempotent and not retried by the client
    },
  },
});
```

Per-query overrides:

| Data type         | `staleTime` | `refetchOnWindowFocus` | `refetchInterval` |
| ----------------- | ----------- | ---------------------- | ----------------- |
| Reference data    | `Infinity`  | false                  | false             |
| Transaction list  | 30_000      | true                   | false             |
| Account balance   | 5_000       | true                   | 30_000            |
| User profile      | 5 \* 60_000 | false                  | false             |
| Audit log (admin) | 0           | true                   | 10_000            |

## `select` — derived data WITHOUT re-rendering siblings

`select` runs the transformation, and TanStack Query subscribes the component to the SELECTED slice. If two components call the same query but `select` different fields, each only re-renders when _its_ slice changes.

```tsx
// Component only re-renders if balance.amount changes; ignores updates to balance.currency etc.
const { data: amount } = useBalance({ select: (b) => b.amount });

// Co-located component subscribes to currency only.
const { data: currency } = useBalance({ select: (b) => b.currency });
```

Patterns:

- **Inline `select` for one-off transforms** — fine for cheap projections.
- **Stable `select` reference for memoisable ones** — define outside the component or wrap in `useCallback`:

```tsx
const selectAmount = useCallback((b: Balance) => b.amount, []);
const { data: amount } = useBalance({ select: selectAmount });
```

Without a stable reference, every render gives `select` a new function → cache key drift → re-running the transform.

- **Compose with `createSelector` for heavy transforms** — TanStack Query doesn't ship a memoised-selector helper of its own; Reselect's `createSelector` works fine.

## Structural sharing — what's already happening

TanStack Query does structural sharing by default. If two fetches return objects that deep-equal in some fields, those field references are preserved. Effect:

- A component reading `data.items[0]` doesn't re-render if `items[0]` is structurally unchanged between fetches.
- BUT this only works if your `transformResponse` / `select` doesn't construct new objects unnecessarily. If your `select` does `data.items.map(...)`, even a "no change" call creates a new array → re-render.

Fix: only project when you must, and prefer index access (`data.items`) over copy (`[...data.items]`).

## Query-key conventions

The query key is the cache key. Inconsistent keys = cache misses = unexpected refetches.

```ts
// ❌ inline, unstable order, hard to invalidate
useQuery({ queryKey: ['user', userId, { tab: 'profile' }] });

// ✅ factory file
// src/constants/queryKeys.ts
export const queryKeys = {
  user: {
    all: () => ['user'] as const,
    detail: (id: string) => ['user', id] as const,
    tab: (id: string, tab: string) => ['user', id, 'tab', tab] as const,
  },
  transactions: {
    all: () => ['transactions'] as const,
    list: (q: TxnQuery) => ['transactions', 'list', q] as const,
    detail: (id: string) => ['transactions', 'detail', id] as const,
  },
};

useQuery({ queryKey: queryKeys.user.detail(userId) });
queryClient.invalidateQueries({ queryKey: queryKeys.user.all() });
```

Why the factory:

- **Hierarchical invalidation works**: `invalidateQueries({ queryKey: ['user'] })` invalidates every `user/*` query.
- **Refactor safety**: renaming a key updates every caller, not 30 inline strings.
- **Type-safety**: factory functions return `as const` tuples; TypeScript tracks them.

Promote to the factory once two callers share a key shape; inline is fine for one-off.

## `useInfiniteQuery` + virtualisation

For transaction-history / activity-feed views:

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: queryKeys.transactions.list(filter),
  queryFn: ({ pageParam }) => fetchTransactions({ ...filter, cursor: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  initialPageParam: undefined,
  staleTime: 60_000,
});

const allRows = data?.pages.flatMap((p) => p.items) ?? [];

const parentRef = useRef<HTMLDivElement>(null);
const rowVirtualizer = useVirtualizer({
  count: hasNextPage ? allRows.length + 1 : allRows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
  overscan: 5,
});

// Trigger next page when the placeholder last row scrolls into view
useEffect(() => {
  const items = rowVirtualizer.getVirtualItems();
  const last = items[items.length - 1];
  if (!last) return;
  if (last.index >= allRows.length - 1 && hasNextPage && !isFetchingNextPage) {
    fetchNextPage();
  }
}, [
  rowVirtualizer.getVirtualItems(),
  hasNextPage,
  isFetchingNextPage,
  allRows.length,
  fetchNextPage,
]);
```

Notes:

- `data.pages` is an array of page objects; flatten to get rows.
- Render an extra "phantom" row when `hasNextPage` is true, to give the virtualiser a target to intersect.
- See the toolkit skill [`bfsi-perf-virtualize-list`](../../../../../packages/claude-toolkit/skills/bfsi-perf-virtualize-list/SKILL.md) for the virtualisation wiring details.

## Optimistic updates

```tsx
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: toggleNotificationPref,
  onMutate: async ({ id, enabled }) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all() });
    const previous = queryClient.getQueryData(queryKeys.notifications.list());
    queryClient.setQueryData(queryKeys.notifications.list(), (old: Notif[]) =>
      old.map((n) => (n.id === id ? { ...n, enabled } : n)),
    );
    return { previous };
  },
  onError: (_err, _vars, ctx) => {
    if (ctx?.previous) queryClient.setQueryData(queryKeys.notifications.list(), ctx.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
  },
});
```

## Suspense mode (v5)

`useSuspenseQuery` removes the `if (isLoading) return <Spinner />` boilerplate by integrating with React Suspense:

```tsx
const { data } = useSuspenseQuery({
  queryKey: queryKeys.user.detail(id),
  queryFn: () => fetchUser(id),
});
// data is guaranteed defined here; Suspense handles the fallback above
```

Wrap the route in `<Suspense fallback={<RouteFallback />}>`. Errors flow to the nearest `<ErrorBoundary>`.

Caveat: Suspense suspends the parent. Don't suspense-fetch BOTH the layout and the panel — the layout will flash. Pattern: fetch layout data with regular `useQuery`, fetch panel data with `useSuspenseQuery`.

## Refetch policies

- `refetchOnWindowFocus: false` — default it to false globally; opt-in per query (balance, activity feed).
- `refetchOnMount: 'always'` — for data where staleness can mislead.
- `refetchOnReconnect: true` — almost always true.
- `refetchInterval`: be explicit; never < 5_000 ms for normal screens.
- `refetchIntervalInBackground: false` — default; keep it off unless you have a strong reason (e.g. monitoring dashboard on a wall display).

## Network mode

```ts
const { data } = useQuery({
  queryKey,
  queryFn,
  networkMode: 'online', // default — pause fetches when offline
});
```

`'online'` (default) is right for BFSI — most app paths require connectivity. `'offlineFirst'` is for read-only data you've persisted (see Persister below) where stale-from-cache is acceptable.

## Persister (offline / fast-boot)

```ts
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

persistQueryClient({
  queryClient,
  persister: createSyncStoragePersister({ storage: window.sessionStorage }),
  maxAge: 5 * 60 * 1000,
  buster: 'v1', // bump when query shapes change to invalidate persisted cache
  dehydrateOptions: {
    shouldDehydrateQuery: (q) => q.queryKey[0] !== 'auth', // never persist auth-scoped data
  },
});
```

BFSI rules:

- **`sessionStorage`, not `localStorage`** — cleared on tab close, respects auth lifetime.
- **Whitelist what's safe to persist** — reference data (currencies, branches) is fine; transactions / balances are not.
- **`buster`** is non-negotiable. Bump when a query's response shape changes; otherwise hydrated stale shapes break rendering.

## Bundle considerations

- TanStack Query v5 core: ~12 KB gzipped — fine.
- DevTools: dev-only; verify they're not in the production bundle (`if (process.env.NODE_ENV === 'development')` import).
- `@tanstack/query-broadcast-client-experimental` for cross-tab sync — only ship if you need it.

## Measuring

- TanStack Query DevTools (dev only) — every query, its state, refetch count, stale time. Press the icon, click a query, see its history.
- React DevTools Profiler — confirm `select`-subscribed components don't re-render on irrelevant fields.
- Network tab — confirm dedup is working: 10 components reading the same query = 1 request.
- `queryClient.getQueryCache().getAll().length` in DevTools console — alarming if growing without bound.

## When to break a rule

- **`refetchOnWindowFocus: true` globally** — for monitoring dashboards where freshness > network cost.
- **`staleTime: 0`** for endpoints where staleness can be wrong (compliance: regulator status, KYC verification result).
- **Polling instead of WebSocket** — when WebSocket isn't available (firewalls, simpler infra). Polling at 10s is fine for "good enough" real-time.

## References

- TanStack Query docs — https://tanstack.com/query/latest/docs
- Persister — https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient
- `bfsi-perf-react` (toolkit-wide) — for the surrounding methodology
- `bfsi-perf-real-time` (toolkit-wide) — for WebSocket / SSE patterns
- Existing variant skill `tanstack-services` — for the service-layer basics
- Existing variant skill `query-client-setup` — for QueryClient configuration
