---
name: tanstack-services
description: Create a feature's service + hooks layer — typed async functions calling the HTTP helpers, then thin useQuery/useMutation wrappers in a hooks file. Pair with Zod schemas in utils.ts and interfaces in types.ts. Use when adding a new feature, adding a new endpoint to an existing feature, or wiring API request/response handling.
---

# TanStack Services + Hooks (feature-folder pattern)

Every feature lives in `src/features/<feature>/` and owns its own services, hooks, types, schemas, and components. Services are plain async functions. Hooks are thin TanStack wrappers. This mirrors the layout used in production banking apps (e.g. stp-portal).

## File map per feature

```
src/features/<feature>/
├── components/<FeatureForm>.tsx     UI built on react-hook-form + FormInput
├── hooks/use<Feature>.ts            useMutation / useQuery wrappers
├── index.tsx                        page entry — the route renders this
├── services.ts                      typed async functions wrapping POST/GET/PUT/...
├── types.ts                         I-prefixed request/response interfaces
└── utils.ts                         Zod schemas, defaults, helpers
```

Endpoints + status codes are shared, not per-feature:

```
src/constants/
├── endPoints.ts                     Object.freeze({...}) per service block
└── statusCodes.ts                   STATUS_CODE.OK / .UNAUTHORIZED / ...
```

## The five files a new feature needs

### 1. `types.ts` — request/response shapes

```ts
export interface ILoginRequest {
  username: string;
  password: string;
}

export interface ILoginResponseData {
  token: string;
  userAttributes: { userId: string; name: string; email: string; roles: string[] };
}

export interface ILoginResponse {
  statusCode: number;
  status: 'success' | 'failure';
  message: string;
  data: ILoginResponseData;
}
```

The envelope (`statusCode / status / message / data`) is the project convention; flatten if your backend doesn't use it, but stay consistent across features.

### 2. `utils.ts` — Zod schema + form defaults

Schemas live next to the feature. Form value types are **inferred** from the schema — never hand-written.

```ts
import { z } from 'zod';

export const MIN_USERNAME_LENGTH = 3;

export const loginSchema = z.object({
  username: z
    .string()
    .min(MIN_USERNAME_LENGTH, `Username must be at least ${MIN_USERNAME_LENGTH} characters`),
  password: z.string().trim().min(1, 'Password is required'),
});

export type ILoginFormValues = z.infer<typeof loginSchema>;

export const LOGIN_FORM_DEFAULT_VALUES: ILoginFormValues = {
  username: '',
  password: '',
};
```

Conditional / cross-field validation uses Zod's `.refine()` / `.superRefine()` (the Zod equivalent of Yup's `.when()`).

### 3. `services.ts` — typed async functions

```ts
import { POST } from '@/api/http';
import { ENDPOINTS } from '@/constants/endPoints';
import type { ILoginRequest, ILoginResponse } from './types';

export const loginService = (payload: ILoginRequest): Promise<ILoginResponse> =>
  POST<ILoginRequest, ILoginResponse>(ENDPOINTS.LOGIN, payload);

export const logoutService = (): Promise<void> => POST<void, void>(ENDPOINTS.LOGOUT);
```

Generic order is `<TRequest, TResponse>` — request first, response second. Reads like the call: "POST this payload, get this back".

### 4. `hooks/use<Feature>.ts` — thin TanStack wrappers

```ts
import { useMutation } from '@tanstack/react-query';
import { loginService, logoutService } from '../services';

export const useLogin = () => useMutation({ mutationFn: loginService });
export const useLogout = () => useMutation({ mutationFn: logoutService });
```

Don't bake `onSuccess` / `onError` into the hook — let the caller decide per call-site so the same hook works in different flows.

For queries:

```ts
import { useQuery } from '@tanstack/react-query';
import { getUserDetail } from '../services';

export const useUserDetail = (id: string) =>
  useQuery({
    queryKey: ['user', 'detail', id],
    queryFn: () => getUserDetail(id),
    enabled: Boolean(id),
  });
```

Promote queryKeys to `src/constants/queryKeys.ts` once two features share a key shape — until then inline is fine.

### 5. `components/<FeatureForm>.tsx` — RHF + Zod + the hook

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormInput } from '@/components/common/FormInput';
import { useLogin } from '../hooks/useLogin';
import { LOGIN_FORM_DEFAULT_VALUES, loginSchema, type ILoginFormValues } from '../utils';

export function LoginForm({ onLoggedIn }: { onLoggedIn: (r: ILoginResponse) => void }) {
  const { mutate, isPending, error } = useLogin();
  const form = useForm<ILoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: LOGIN_FORM_DEFAULT_VALUES,
  });

  const onSubmit = (values: ILoginFormValues) => mutate(values, { onSuccess: onLoggedIn });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormInput control={form.control} name="username" label="Username" isRequired />
      <FormInput control={form.control} name="password" label="Password" isSensitive isRequired />
      {error && <p role="alert">{(error as { message?: string }).message ?? 'Login failed.'}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
```

`FormInput` is the generic wrapper at `src/components/common/FormInput.tsx` — uses RHF's `Controller`, types `name` via `Path<T>`, renders error from `fieldState`.

## Reference feature

The scaffolded project ships a working example at `src/features/login/`. Open those six files when adding a new feature — copy the shape, don't reinvent it.

## Conventions enforced

- ❌ NEVER use `axios.<method>` directly in service files — use `GET<TRes, TParams>` / `POST<TReq, TRes>` from `@/api/http`.
- ❌ NEVER inline a URL string — reference `@/constants/endPoints`.
- ❌ NEVER hand-write a form-value type — infer from the Zod schema with `z.infer<typeof ...>`.
- ❌ NEVER put React hooks in `services.ts` — services are pure async functions.
- ❌ NEVER bake `onSuccess` / `onError` into the hook — pass them at the call-site.
- ✅ One `services.ts` per feature; one `hooks/use<Feature>.ts` per feature.
- ✅ Request interfaces prefixed `I` (`ILoginRequest`); responses likewise.
- ✅ Generic order on write methods: `POST<TRequest, TResponse>(...)`.
- ✅ Zod schema lives in the feature's `utils.ts`; default form values exported alongside.

## When to break each rule

The conventions above cover ~95% of cases. The other 5%:

- **Multiple service files per feature** if the feature genuinely splits across two backends (e.g. customer search + biometrics) — name them `services/customer.ts`, `services/biometric.ts` and re-export from `services/index.ts`.
- **A queryKey factory in `src/constants/queryKeys.ts`** once a key is referenced from 2+ features. Inline keys are fine for one-feature usage.
- **Skip the envelope** for endpoints that return a plain primitive or array — type the service's return as that primitive directly.

## References

- [`references/service-cookbook.md`](references/service-cookbook.md) — list, paginated, detail, create, update, delete, polling, file upload/download
- [`references/optimistic-update.md`](references/optimistic-update.md) — optimistic mutations with cache patches
