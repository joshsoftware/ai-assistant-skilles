# Axios + Auth — full code walkthrough

## `src/api/axiosInstance.ts`

```ts
import { createAxios } from '@/lib/http';
import { env } from '../env.js';

const axiosInstance = createAxios({
  baseURL: env.VITE_API_BASE_URL,
  timeoutMs: env.VITE_API_TIMEOUT_MS,
  authHeaderName: env.VITE_AUTH_HEADER_NAME,
  onUnauthorized: () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
});

export default axiosInstance;
```

Key points:

- `createAxios` attaches BFSI-grade interceptors: request-IDs, idempotency keys, error mapping to typed `ApiError`.
- `onUnauthorized` fires AFTER `clearAuthToken` has wiped the token off the instance.

There is NO separate `interceptor.ts` file — the response side is handled by `createAxios` (error mapping) and by mutation/query callbacks (notifications). No side-effect import needed.

## `src/api/http.ts`

```ts
import type { AxiosRequestConfig } from 'axios';
import axiosInstance from './axiosInstance.js';

export async function GET<TResponse, TParams = void>(
  url: string,
  params?: TParams,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  const { data } = await axiosInstance.get<TResponse>(url, { ...config, params });
  return data;
}

export async function POST<TResponse, TRequest = void>(
  url: string,
  payload?: TRequest,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  const { data } = await axiosInstance.post<TResponse>(url, payload, config);
  return data;
}

// PUT, PATCH, DELETE follow the same pattern
```

Key points:

- All helpers unwrap `response.data` — services return the body, not the AxiosResponse envelope.
- Generic `<TResponse, TRequest>` keeps the call-site type-safe without forcing the caller to cast.
- Optional `config` lets you pass `headers`, `responseType`, `signal` (AbortController), etc. per-call.

## Why services are the data-fetching primitive

Service functions ARE the data-fetching primitive — each one is a tiny async function that throws on failure. `useQuery`/`useMutation` calls them and handles the promise. There is no intermediate abstraction layer between the hook and axios.

## File upload pattern

```ts
export const uploadDocument = (file: File): Promise<IDocumentRecord> => {
  const form = new FormData();
  form.append('file', file);
  return POST<IDocumentRecord, FormData>('/docs/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
```

## File download pattern

```ts
export const downloadStatement = (id: string): Promise<Blob> =>
  GET<Blob, void>(`/statements/${id}`, undefined, { responseType: 'blob' });
```

Then in the component:

```tsx
const { data: blob } = useQuery({
  queryKey: ['statement', id],
  queryFn: () => downloadStatement(id),
  enabled: shouldDownload,
});

useEffect(() => {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `statement-${id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}, [blob, id]);
```

## Cancellation pattern

```ts
// In the component:
const controller = new AbortController();
const { data } = useQuery({
  queryKey: ['search', term],
  queryFn: () => GET<ISearchResult>('/search', { q: term }, { signal: controller.signal }),
});
// On unmount or term change:
useEffect(() => () => controller.abort(), []);
```

TanStack Query also auto-cancels stale in-flight queries when the queryKey changes — usually you don't need explicit AbortController.
