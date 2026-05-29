# Optimistic updates (TanStack)

Use sparingly. Optimistic updates risk showing stale state to the user; only use when success rate is very high AND latency is meaningful to the user.

## When to use

✅ Good fit:

- Toggling a boolean (favourited, archived, read/unread)
- Reordering a list (drag-and-drop)
- Inline editing of a single field

❌ Bad fit:

- Financial transactions (NEVER show success before backend confirms)
- KYC submissions (regulatory + may be rejected by ML)
- Anything where failure is plausible

## Pattern — `onMutate` + rollback

```tsx
const queryClient = useQueryClient();

const toggleFavorite = useMutation({
  mutationFn: async (args: { id: string; isFavorite: boolean }) => {
    return PATCH<IKycRecord, { isFavorite: boolean }>(KYC_URLS.FAVORITE(args.id), {
      isFavorite: args.isFavorite,
    });
  },
  onMutate: async ({ id, isFavorite }) => {
    // Cancel any outgoing refetches so they don't overwrite our optimistic update
    await queryClient.cancelQueries({ queryKey: kycKeys.detail(id) });

    // Snapshot the previous value
    const previous = queryClient.getQueryData<IKycRecord>(kycKeys.detail(id));

    // Optimistic update
    if (previous) {
      queryClient.setQueryData<IKycRecord>(kycKeys.detail(id), {
        ...previous,
        isFavorite,
      });
    }

    // Return rollback context
    return { previous };
  },
  onError: (_err, { id }, context) => {
    if (context?.previous) {
      queryClient.setQueryData(kycKeys.detail(id), context.previous);
    }
  },
  onSettled: (_data, _err, { id }) => {
    // Always refetch to reconcile with server truth
    queryClient.invalidateQueries({ queryKey: kycKeys.detail(id) });
  },
});
```

## Rules

1. ALWAYS `cancelQueries` first — otherwise an in-flight fetch overwrites the optimistic update on settle.
2. ALWAYS snapshot the previous value before patching — needed for rollback.
3. ALWAYS rollback in `onError` using the context returned by `onMutate`.
4. ALWAYS reconcile in `onSettled` (invalidate or refetch).
5. NEVER toast "success" optimistically — wait for `onSuccess`.
6. NEVER optimistically create new entries that need a server-assigned ID — wait for `onSuccess` to know the real ID.

## Optimistic across multiple queries

If a mutation should optimistically update both detail AND a list:

```ts
onMutate: async ({ id, isFavorite }) => {
  await queryClient.cancelQueries({ queryKey: kycKeys.detail(id) });
  await queryClient.cancelQueries({ queryKey: kycKeys.lists() });

  const previousDetail = queryClient.getQueryData<IKycRecord>(kycKeys.detail(id));
  const previousLists = queryClient.getQueriesData<IKycListResponse>({ queryKey: kycKeys.lists() });

  // Patch detail
  if (previousDetail) {
    queryClient.setQueryData<IKycRecord>(kycKeys.detail(id), {
      ...previousDetail,
      isFavorite,
    });
  }

  // Patch every cached list page
  for (const [key, list] of previousLists) {
    if (!list) continue;
    queryClient.setQueryData<IKycListResponse>(key, {
      ...list,
      items: list.items.map((item) =>
        item.id === id ? { ...item, isFavorite } : item,
      ),
    });
  }

  return { previousDetail, previousLists };
},
```
