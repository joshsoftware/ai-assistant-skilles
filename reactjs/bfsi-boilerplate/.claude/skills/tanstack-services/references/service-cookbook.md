# Service cookbook (TanStack)

Templates for common shapes. Copy + adapt. All examples use the feature-folder
layout (`src/features/<feature>/services.ts`) and the `<TRequest, TResponse>`
generic order on write methods.

## List

```ts
// services.ts
export const getUserList = (): Promise<IUserListResponse> =>
  GET<IUserListResponse>(USER_ENDPOINTS.LIST);
```

```ts
// hooks/useUser.ts
export const useUserList = () => useQuery({ queryKey: ['user', 'list'], queryFn: getUserList });
```

## Paginated list

```ts
// services.ts
export const getUserList = (params: {
  page: number;
  pageSize: number;
  status?: 'active' | 'inactive';
}): Promise<IUserListResponse> =>
  GET<IUserListResponse, typeof params>(USER_ENDPOINTS.LIST, params);
```

```tsx
const { data } = useQuery({
  queryKey: ['user', 'list', { page, pageSize, status }],
  queryFn: () => getUserList({ page, pageSize, status }),
  placeholderData: (prev) => prev, // smooth pagination
});
```

## Detail

```ts
// services.ts
export const getUserDetail = (id: string): Promise<IUserDetailResponse> =>
  GET<IUserDetailResponse>(USER_ENDPOINTS.DETAIL(id));
```

```ts
// hooks/useUser.ts
export const useUserDetail = (id: string) =>
  useQuery({
    queryKey: ['user', 'detail', id],
    queryFn: () => getUserDetail(id),
    enabled: Boolean(id),
  });
```

## Create

```ts
// services.ts
export const createUser = (payload: ICreateUserRequest): Promise<IUserDetailResponse> =>
  POST<ICreateUserRequest, IUserDetailResponse>(USER_ENDPOINTS.CREATE, payload);
```

```tsx
const queryClient = useQueryClient();
const { mutate } = useMutation({
  mutationFn: createUser,
  onSuccess: (response) => {
    queryClient.invalidateQueries({ queryKey: ['user', 'list'] });
    queryClient.setQueryData(['user', 'detail', response.data.id], response);
  },
});
```

## Update

Mutations that take both an id and a body wrap them in a single object so
`mutationFn` stays typed as `(args: {...}) => Promise<...>`.

```ts
// services.ts
export const updateUser = (args: {
  id: string;
  body: IUpdateUserRequest;
}): Promise<IUserDetailResponse> =>
  PUT<IUpdateUserRequest, IUserDetailResponse>(USER_ENDPOINTS.UPDATE(args.id), args.body);
```

```tsx
const { mutate } = useMutation({
  mutationFn: updateUser,
  onSuccess: (response, { id }) => {
    queryClient.invalidateQueries({ queryKey: ['user', 'list'] });
    queryClient.setQueryData(['user', 'detail', id], response);
  },
});
```

## Delete

```ts
// services.ts
export const deleteUser = (id: string): Promise<void> => DELETE<void>(USER_ENDPOINTS.DELETE(id));
```

```tsx
const { mutate } = useMutation({
  mutationFn: deleteUser,
  onSuccess: (_, id) => {
    queryClient.invalidateQueries({ queryKey: ['user', 'list'] });
    queryClient.removeQueries({ queryKey: ['user', 'detail', id] });
  },
});
```

## Polling (e.g. async job status)

```ts
// services.ts
export const getJobStatus = (jobId: string): Promise<IJobStatusResponse> =>
  GET<IJobStatusResponse>(JOB_ENDPOINTS.STATUS(jobId));
```

```tsx
const { data } = useQuery({
  queryKey: ['job', 'status', jobId],
  queryFn: () => getJobStatus(jobId),
  refetchInterval: (query) => {
    const status = query.state.data?.data?.status;
    return status === 'completed' || status === 'failed' ? false : 3000;
  },
});
```

## File upload

```ts
// services.ts
export const uploadDocument = (file: File): Promise<IDocumentResponse> => {
  const form = new FormData();
  form.append('file', file);
  return POST<FormData, IDocumentResponse>(DOCS_ENDPOINTS.UPLOAD, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
```

## File download

```ts
// services.ts
export const downloadStatement = (id: string): Promise<Blob> =>
  GET<Blob, void>(STATEMENT_ENDPOINTS.DOWNLOAD(id), undefined, { responseType: 'blob' });
```

## Parallel fetches in one query

```ts
// services.ts
export const getDashboardData = async (userId: string): Promise<IDashboardResponse> => {
  const [profile, accounts, recent] = await Promise.all([
    GET<IProfileResponse>(USER_ENDPOINTS.DETAIL(userId)),
    GET<IAccountListResponse>(ACCOUNT_ENDPOINTS.LIST_FOR_USER(userId)),
    GET<ITransactionListResponse>(TX_ENDPOINTS.RECENT_FOR_USER(userId)),
  ]);
  return { profile, accounts, recent };
};
```

The component gets one queryKey, one loading state, one error — even though
three HTTP calls run underneath.
