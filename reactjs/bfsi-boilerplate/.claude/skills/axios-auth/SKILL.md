---
name: axios-auth
description: Configure the project's axios instance and set the auth token ONCE at login via setAuthToken() — not per-request. Used by TanStack Query service methods. Covers response interceptor for notifications + 401 redirect. Use when the user mentions axios, API client, set token, login flow, 401 handling, response interceptor, error notification.
---

# Axios + Auth Pattern (TanStack variant)

The HTTP layer is two files under `src/api/` plus the auth-token helper from `@/lib/http`. Tokens are set ONCE at login on the axios instance — not injected per-request via interceptor.

## File map

| File                       | Role                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `src/api/axiosInstance.ts` | Single shared `AxiosInstance` from `createAxios()`                                 |
| `src/api/http.ts`          | Typed `GET<TRes,TParams>` / `POST<TReq,TRes>` / `PUT` / `PATCH` / `DELETE` helpers |
| `@/lib/http`       | Exports `createAxios`, `setAuthToken`, `clearAuthToken`, `ApiError`                |

## Workflow

### Step 1 — Set token at login (the canonical place)

Inside your login service's success path:

```ts
import { useMutation } from '@tanstack/react-query';
import { setAuthToken } from '@/lib/http';
import axiosInstance from '@/api/axiosInstance';
import { loginService } from '@/services/auth';

const loginMutation = useMutation({
  mutationFn: loginService,
  onSuccess: (response) => {
    setAuthToken(axiosInstance, response.token);
    // navigate to dashboard, etc.
  },
});
```

`setAuthToken` writes to `instance.defaults.headers.common.Authorization`. Every subsequent request carries the header automatically.

### Step 2 — Clear on logout / 401

`createAxios()` wires this: when a response is 401, it auto-calls `clearAuthToken(instance)` then invokes the `onUnauthorized` callback (which redirects to `/login` in the scaffolded template).

Manual logout flow:

```ts
import { clearAuthToken } from '@/lib/http';
import axiosInstance from '@/api/axiosInstance';
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

function logout() {
  clearAuthToken(axiosInstance);
  queryClient.clear(); // wipe all cached server data
  navigate('/login');
}
```

`queryClient.clear()` matters on logout — without it, a re-login sees stale data for a flash before refetch.

### Step 3 — Use the typed HTTP helpers in services

```ts
// src/features/kyc/services.ts
import { GET, POST } from '@/api/http';
import { KYC_ENDPOINTS } from '@/constants/endPoints';
import type { IKycRequest, IKycResponse } from './types';

export const submitKyc = (payload: IKycRequest): Promise<IKycResponse> =>
  POST<IKycRequest, IKycResponse>(KYC_ENDPOINTS.SUBMIT, payload);

export const getKyc = (id: string): Promise<IKycResponse> =>
  GET<IKycResponse>(KYC_ENDPOINTS.DETAIL(id));
```

Generic order on write methods is `<TRequest, TResponse>` — request first, response second. Endpoints come from `@/constants/endPoints`, never inline. Services are pure async functions — no hooks, no React. That makes them trivially unit-testable.

## Conventions enforced

- ❌ NEVER inject token via a `request.use` interceptor — use `setAuthToken` at login.
- ❌ NEVER read token from `localStorage` on every request.
- ❌ NEVER hardcode `Authorization: Bearer ...` anywhere.
- ❌ NEVER use plain `axios.get(...)` in service files — use the typed `GET<TRes,TParams>` / `POST<TReq,TRes>` helpers.
- ✅ One axios instance per app — exported as the default from `axiosInstance.ts`.
- ✅ All services use typed helpers from `src/api/http.ts`.
- ✅ On logout: `clearAuthToken()` + `queryClient.clear()`.

## Quick reference checklist

When adding API auth:

- [ ] Login mutation calls `setAuthToken(axiosInstance, token)` in `onSuccess`
- [ ] Logout calls `clearAuthToken(axiosInstance)` AND `queryClient.clear()`
- [ ] Token never appears in `localStorage` (memory only)
- [ ] `onUnauthorized` callback in `axiosInstance.ts` redirects to `/login`

## References

- [`references/full-code-walkthrough.md`](references/full-code-walkthrough.md) — annotated walk through axiosInstance + http helpers
- [`references/error-shape.md`](references/error-shape.md) — `ApiError` contract + safe surfacing inside `useMutation`/`useQuery`
- [`references/notification-pattern.md`](references/notification-pattern.md) — toast notifications from mutation `onSuccess`/`onError` callbacks
