# Notification pattern

TanStack Query lets you dispatch notifications directly from mutation callbacks. No global slice or middleware needed.

## Simple — at the call site

```tsx
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { submitKyc } from '@/services/kyc';
import type { ApiError } from '@/lib/http';

const mutation = useMutation({
  mutationFn: submitKyc,
  onSuccess: () => toast.success('KYC submitted'),
  onError: (err: ApiError) => toast.error(safeMessage(err)),
});
```

## DRY — wrap mutation creation

When most mutations want the same toast behaviour:

```ts
// src/services/useToastedMutation.ts
import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiError } from '@/lib/http';

export function useToastedMutation<TData, TVars>(
  options: UseMutationOptions<TData, ApiError, TVars> & {
    successMessage?: string;
  },
) {
  return useMutation({
    ...options,
    onSuccess: (data, vars, ctx) => {
      if (options.successMessage) toast.success(options.successMessage);
      options.onSuccess?.(data, vars, ctx);
    },
    onError: (err, vars, ctx) => {
      toast.error(safeMessage(err));
      options.onError?.(err, vars, ctx);
    },
  });
}
```

Then use it everywhere:

```tsx
const submit = useToastedMutation({
  mutationFn: submitKyc,
  successMessage: 'KYC submitted',
  onSuccess: () => navigate('/kyc/success'),
});
```

## Global error handler

For a true catch-all, set a `QueryCache` / `MutationCache` error handler in the `QueryClient` config:

```ts
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // ONLY fire for unhandled errors — usually you want per-component handling
      // toast.error(safeMessage(error as ApiError));
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      // Skip if the mutation has its own onError
      if (mutation.options.onError) return;
      toast.error(safeMessage(error as ApiError));
    },
  }),
  // ... defaultOptions
});
```

The `MutationCache.onError` pattern is useful: every mutation that doesn't define its own `onError` gets the default toast.

## Avoid: toast spam

❌ Don't toast on every query error — components are often mounted in the background or with stale flags, and you'd toast for non-user-initiated fetches.

✅ DO toast on every mutation error — mutations are user-initiated, so an error means the user's action failed.

## Avoid: notifications for 401 / cancelled

The 401 path already redirects to login (handled by `createAxios.onUnauthorized`). Don't double-toast. Filter inside `safeMessage`:

```ts
function safeMessage(error: ApiError): string {
  if (error.kind === 'unauthorized') return ''; // empty = no toast (sonner handles)
  if (error.kind === 'cancelled') return '';
  return toSafeView(error, t).description;
}
```
