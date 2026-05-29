# queryKey factory pattern

QueryKeys are TanStack Query's primary cache identifier. They MUST be:

- Stable: same logical query → same key shape
- Discoverable: cache invalidation should be easy to write
- Type-safe: keys derived from a factory, not hand-typed

## Anti-pattern: inline arrays

```tsx
// ❌ Don't do this:
useQuery({ queryKey: ['kyc', id], queryFn: () => getKyc(id) });

// ❌ Or this:
queryClient.invalidateQueries({ queryKey: ['kyc'] });
```

Problems:

- Renaming the feature requires grep across the whole codebase
- Easy to typo the queryKey, causing silent cache misses
- Filter shapes embedded in keys aren't reused

## Pattern: factory objects

```ts
// src/constants/queryKeys.ts
export const kycKeys = {
  all: ['kyc'] as const,
  lists: () => [...kycKeys.all, 'list'] as const,
  list: (filters?: KycFilters) => [...kycKeys.lists(), filters] as const,
  details: () => [...kycKeys.all, 'detail'] as const,
  detail: (id: string) => [...kycKeys.details(), id] as const,
};
```

Usage:

```tsx
useQuery({
  queryKey: kycKeys.detail(id),
  queryFn: () => getKyc(id),
});
```

## Invalidation matrix

| Goal                                  | Code                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| Invalidate everything for the feature | `queryClient.invalidateQueries({ queryKey: kycKeys.all })`                         |
| Invalidate all lists (any filter)     | `queryClient.invalidateQueries({ queryKey: kycKeys.lists() })`                     |
| Invalidate one specific list          | `queryClient.invalidateQueries({ queryKey: kycKeys.list({ status: 'pending' }) })` |
| Invalidate all details                | `queryClient.invalidateQueries({ queryKey: kycKeys.details() })`                   |
| Invalidate one record                 | `queryClient.invalidateQueries({ queryKey: kycKeys.detail(id) })`                  |

TanStack Query matches by **prefix** — `kycKeys.all` invalidates everything that starts with `['kyc']`.

## Pattern: after a mutation

```tsx
const queryClient = useQueryClient();

const submit = useMutation({
  mutationFn: submitKyc,
  onSuccess: (newRecord) => {
    // Drop the lists cache so the next list query refetches
    queryClient.invalidateQueries({ queryKey: kycKeys.lists() });
    // Optionally pre-fill the detail cache so navigating to it is instant
    queryClient.setQueryData(kycKeys.detail(newRecord.id), newRecord);
  },
});
```

## Pattern: cross-feature invalidation

```tsx
const submit = useMutation({
  mutationFn: submitKyc,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: kycKeys.all });
    queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) }); // KYC changes affect user profile
  },
});
```

For complex graphs, consider a small middleware-like wrapper:

```ts
// src/services/invalidations.ts
export const invalidationsAfter = {
  kycSubmit: (qc: QueryClient, userId: string) => {
    qc.invalidateQueries({ queryKey: kycKeys.all });
    qc.invalidateQueries({ queryKey: userKeys.detail(userId) });
  },
  // ... other cross-feature invalidation recipes
};

// Then in components:
const submit = useMutation({
  mutationFn: submitKyc,
  onSuccess: () => invalidationsAfter.kycSubmit(queryClient, currentUserId),
});
```

## Anti-pattern: keys in the wrong order

The order matters — TanStack Query treats the array as a prefix. Always put the most general element first:

```ts
// ✅ Good
list: (filters) => ['kyc', 'list', filters] as const;

// ❌ Bad — can't invalidate "all kyc" without listing every filter
list: (filters) => [filters, 'kyc', 'list'] as const;
```

## Logout: nuke the cache

```ts
import { kycKeys } from '@/constants/queryKeys';

function logout() {
  // ... clear auth
  queryClient.clear(); // wipes EVERYTHING (preferred on logout)
  // alternative — selective:
  // queryClient.removeQueries({ queryKey: kycKeys.all });
}
```
