---
name: constants-organization
description: Where each kind of constant lives in the project and how to add a new one. Covers API endpoints (Object.freeze + base URL prefix), HTTP status codes, route paths, queryKey conventions, validation regex, and app-wide constants. Use when adding a new endpoint URL, status code, route path, queryKey, validation regex, or any other shared constant.
---

# Constants Organisation

Every shared constant lives under `src/constants/`. One folder, one home — don't scatter into `utils/`, feature folders, or component files.

## File map

```
src/constants/
├── endPoints.ts         Every API endpoint URL, grouped per service block
├── statusCodes.ts       HTTP status codes (STATUS_CODE.OK, .UNAUTHORIZED, ...)
├── routes.ts            Every router path (ROUTES.<feature>.<view>)
├── queryKeys.ts         TanStack queryKey factories (add once 2+ features share keys)
├── regex.ts             Reusable validation regex
└── app.ts               App-wide enums (storage keys, journey types, etc.)
```

Create each file only when you need it — `endPoints.ts`, `statusCodes.ts`, and `routes.ts` ship in the boilerplate; the others land when the first constant of that kind arrives.

## When to use which

| Adding …                     | Goes in                        | Naming                                                 |
| ---------------------------- | ------------------------------ | ------------------------------------------------------ |
| A backend endpoint URL       | `src/constants/endPoints.ts`   | `<FEATURE>_ENDPOINTS.<ACTION>` or `ENDPOINTS.<ACTION>` |
| An HTTP status code          | `src/constants/statusCodes.ts` | `STATUS_CODE.<NAME>`                                   |
| A frontend route path        | `src/constants/routes.ts`      | `ROUTES.<feature>.<view>`                              |
| A TanStack queryKey          | `src/constants/queryKeys.ts`   | `<feature>Keys.list()` / `<feature>Keys.detail(id)`    |
| A validation regex           | `src/constants/regex.ts`       | `<FIELD>_REGEX`                                        |
| A storage key                | `src/constants/app.ts`         | `<PURPOSE>_KEY`                                        |
| An enum value used > 1 place | `src/constants/app.ts`         | `<NAME>` (UPPER_SNAKE)                                 |

## Workflow — adding a new endpoint

1. Open `src/constants/endPoints.ts`.
2. Add to an existing frozen block, or declare a new one:

   ```ts
   const API_BASE_KYC = '/kyc/api/v1';

   export const KYC_ENDPOINTS = Object.freeze({
     LIST: `${API_BASE_KYC}/list`,
     DETAIL: (id: string) => `${API_BASE_KYC}/${id}`,
     SUBMIT: `${API_BASE_KYC}/submit`,
   });
   ```

3. Reference from the feature's service:

   ```ts
   import { KYC_ENDPOINTS } from '@/constants/endPoints';
   import { GET } from '@/api/http';

   export const getKycList = (): Promise<IKycListResponse> =>
     GET<IKycListResponse>(KYC_ENDPOINTS.LIST);
   ```

`Object.freeze()` makes the map immutable at runtime — accidental mutation
throws in dev. Static endpoints are strings; dynamic ones (with an `id`) are
functions returning a string.

## Workflow — adding a queryKey

queryKeys are arrays that identify cached data. For one-off cases, inline
them in the hook is fine. Once a key shape is shared across two features,
promote to a factory in `src/constants/queryKeys.ts`:

```ts
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
const { data } = useQuery({
  queryKey: kycKeys.list(filters),
  queryFn: () => getKycList(filters),
});

// Invalidation
queryClient.invalidateQueries({ queryKey: kycKeys.all }); // all KYC
queryClient.invalidateQueries({ queryKey: kycKeys.lists() }); // all lists
queryClient.invalidateQueries({ queryKey: kycKeys.detail(id) }); // one record
```

See [`references/query-key-factories.md`](references/query-key-factories.md) for the full pattern.

## Workflow — adding a route

1. Open `src/constants/routes.ts`.
2. Add the path:

   ```ts
   export const ROUTES = {
     kyc: { list: '/kyc', detail: '/kyc/:id', submit: '/kyc/submit' },
   } as const;
   ```

3. Wire it in `src/routes/index.tsx`. Page components are imported via
   `React.lazy()` for route-level code splitting; the existing `<Suspense>`
   boundary in that file covers all routes, so no extra wrapper is needed.
   See `bfsi-perf-react` for the rationale.

   ```tsx
   const KycList = lazy(() => import('../features/Kyc/index.js'));
   // ...
   <Route
     path={ROUTES.kyc.list}
     element={
       <ProtectedRoute permission="kyc.view">
         <KycList />
       </ProtectedRoute>
     }
   />
   ```

## Workflow — adding a validation regex

Centralise — never inline.

```ts
// src/constants/regex.ts
import { PII_PATTERNS } from '@/lib/pii';

export const PAN_REGEX = PII_PATTERNS.pan;
export const AADHAAR_REGEX = PII_PATTERNS.aadhaar;
export const MOBILE_REGEX = PII_PATTERNS.mobileIndia;
export const IFSC_REGEX = PII_PATTERNS.ifsc;
```

Use in Zod:

```ts
import { PAN_REGEX } from '@/constants/regex';
const schema = z.object({ pan: z.string().regex(PAN_REGEX, 'Invalid PAN') });
```

## Conventions enforced

- ❌ NEVER hardcode a URL string in a service — always reference `endPoints.ts`.
- ❌ NEVER inline a status-code magic number — use `STATUS_CODE.<NAME>`.
- ❌ NEVER inline a regex in component code or schema — always via `regex.ts`.
- ✅ Group endpoints by service/feature with a `const API_BASE_<X>` prefix.
- ✅ Use `Object.freeze()` on endpoint maps; `as const` on route maps.
- ✅ Functions for dynamic paths (`DETAIL: (id) => ...`), strings for static ones.

## References

- [`references/example-files.md`](references/example-files.md) — full templates for each constants file
- [`references/query-key-factories.md`](references/query-key-factories.md) — queryKey factory pattern + invalidation matrix
