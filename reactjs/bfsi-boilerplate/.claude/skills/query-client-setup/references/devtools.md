# Using ReactQueryDevtools effectively

The devtools panel is the single most useful tool for debugging TanStack Query behaviour. Render it conditionally so it never reaches production bundles.

## Setup

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  {/* app */}
  {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
</QueryClientProvider>;
```

`@tanstack/react-query-devtools` is in `devDependencies` and Vite tree-shakes it out of the production bundle as long as the import is gated behind `import.meta.env.DEV`. Confirm with `npm run build && grep -r 'ReactQueryDevtools' dist/`.

## Debugging workflow

When something feels wrong with caching/refetching:

1. **Open devtools** (icon in bottom-right corner).
2. **Find the queryKey** — search the list for your feature (e.g. `kyc`).
3. **Inspect the state**:
   - `fetchStatus: idle/fetching/paused` — is it actually fetching?
   - `status: pending/success/error` — what's the last result?
   - `data` — the parsed response (or `undefined`)
   - `error` — the ApiError instance
4. **Check observers** — which components are subscribed? If 0, the query won't refetch on stale.
5. **Manual invalidate** — click "Invalidate" to force-refetch and see if the issue is invalidation logic vs the network call.
6. **Time travel** — switch query state to "Fresh" or "Stale" to test edge cases.

## Common issues + how the devtools reveal them

| Symptom                               | What devtools shows                                  | Fix                                                            |
| ------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| List doesn't refetch after a mutation | List query is "Fresh" not "Stale" after the mutation | Missing `invalidateQueries` in mutation's `onSuccess`          |
| Query won't fire                      | `fetchStatus: paused`, `enabled: false`              | Some upstream variable is undefined; check the `enabled:` flag |
| Two components show different data    | They have different queryKey shapes                  | Normalise queryKey via a factory                               |
| Cache size grows forever              | Many entries with `observers: 0`                     | `gcTime` too long; lower it                                    |
| Mutation seems to retry               | Multiple "pending" entries                           | Check `mutations.retry` is `false`                             |

## Don't ship devtools to prod

Risk: devtools expose query payloads, including PII. Even though they only render `import.meta.env.DEV`, double-check:

```bash
npm run build
grep -r 'ReactQueryDevtools' dist/        # should be empty
grep -r 'TanStack Query' dist/             # should be empty
```

If you see hits, the gating is wrong — ReactQueryDevtools is in the production bundle.

## Alternative for staging

If you need devtools-like inspection in staging (not full prod), add a feature flag:

```tsx
{
  (import.meta.env.DEV || env.VITE_ENABLE_QUERY_DEVTOOLS === 'true') && (
    <ReactQueryDevtools initialIsOpen={false} />
  );
}
```

NEVER set `VITE_ENABLE_QUERY_DEVTOOLS=true` in production — it ships the devtools.
