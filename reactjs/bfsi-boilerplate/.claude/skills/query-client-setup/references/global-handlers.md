# Global QueryCache / MutationCache handlers

For cross-cutting concerns (every-error toast, every-success notification), use the cache-level callbacks instead of repeating `onError` in every component.

## When to use cache-level vs per-call

| Concern                          | Where                                     | Why                                                                     |
| -------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| Default error toast              | `MutationCache.onError`                   | DRY — every component without its own onError gets it                   |
| Per-mutation success message     | `useToastedMutation` wrapper              | Success copy is per-call — too specific for cache-level                 |
| Global "session expired" handler | `axios.onUnauthorized` (in `createAxios`) | 401 is handled before the error reaches React; no cache callback needed |
| Logging all query failures       | `QueryCache.onError`                      | Observability — fire-and-forget telemetry                               |
| Per-query field error mapping    | Per-mutation `onError`                    | Field errors are component-specific (which RHF form to set them on)     |

## MutationCache pattern

```ts
import { QueryClient, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import { toSafeView } from '@<scope>/core/compliance';
import type { ApiError } from '@/lib/http';
import i18n from '@/i18n/i18n';

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      // Skip if mutation defined its own onError
      if (mutation.options.onError) return;

      const apiErr = error as ApiError;
      // Skip 401 (handled by axios.onUnauthorized)
      if (apiErr.kind === 'unauthorized') return;

      const view = toSafeView(apiErr, i18n.t);
      toast.error(view.title, { description: view.description });
    },
    onSuccess: (_data, _vars, _ctx, mutation) => {
      const successMessage = (mutation.options as { successMessage?: string }).successMessage;
      if (successMessage) toast.success(successMessage);
    },
  }),
  // ... defaultOptions
});
```

Note: `mutation.options.onError` being set means the component has opted-in to handle the error itself. Skip the global toast to avoid double-toasting.

## QueryCache pattern (rarer)

```ts
import { QueryCache } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';

queryCache: new QueryCache({
  onError: (error, query) => {
    // Don't toast on query errors (they may fire in background)
    // Just log to telemetry
    Sentry.captureException(error, {
      tags: { queryKey: JSON.stringify(query.queryKey) },
    });
  },
}),
```

Don't surface query errors to UI via global toast — they fire in background and may be for unmounted components. Let the component handle its own error state via `{ error, isError } = useQuery(...)`.

## Anti-patterns

❌ `MutationCache.onError` that always fires even when the component has its own:

```ts
// WRONG — double-toasts
onError: (error) => {
  toast.error(safeMessage(error));    // fires even if component handled it
},
```

❌ `QueryCache.onError` that toasts:

```ts
// WRONG — toasts for background refetches the user didn't trigger
onError: (error) => toast.error(safeMessage(error)),
```

❌ Per-mutation `onError` that re-throws (TanStack catches and routes via cache):

```ts
// WRONG — onError shouldn't throw
useMutation({
  onError: (err) => {
    throw err;
  }, // breaks rollback chain
});
```
