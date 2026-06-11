---
name: testing-patterns
description: Write Vitest + React Testing Library unit tests for a feature's schema, services, hooks, and components in the TanStack variant. Covers test-utils helpers (createWrapper, renderWithProviders), mocking axios + services, and waiting for TanStack mutation/query state. Use when adding tests for a new feature, a service, a custom hook, a form, or any component that reads from TanStack Query.
---

# Testing Patterns (TanStack variant)

The scaffolded project ships Vitest + React Testing Library wired into [vite.config.ts](../../../vite.config.ts). Tests are organized in `__tests__` folders that mirror the source structure (`src/` layout mirrors in `__tests__/` layout). Run with `npm test` (CI) or `npm run test:watch` (dev).

## File map

```
src/
├── test-utils/
│   └── render.tsx          createTestQueryClient, createWrapper, renderWithProviders
└── features/<feature>/
    ├── __tests__/
    │   ├── components/
    │   │   └── <X>.test.tsx          component tests with renderWithProviders
    │   ├── hooks/
    │   │   └── use<Feature>.test.tsx  hook tests with createWrapper
    │   ├── services.test.ts           service-layer tests with mocked axios
    │   └── utils.test.ts              Zod schema validation tests
    ├── components/
    │   └── <X>.tsx                    source components
    ├── hooks/
    │   └── use<Feature>.ts            source hooks
    ├── types.ts                       TypeScript interfaces/types
    ├── utils.ts                       Zod schemas & utilities
    ├── services.ts                    API service functions
    └── index.tsx                      feature exports
```

## The four kinds of test (one per layer)

Pick the layer you're testing and copy the matching pattern. **A feature is well-tested when every layer has tests** — schema, service, hook, component.

### 1. Schema (`__tests__/utils.test.ts`) — fastest, no React

```ts
import { describe, expect, it } from 'vitest';
import { loginSchema } from '../../utils';

it('rejects short usernames', () => {
  const r = loginSchema.safeParse({ username: 'a', password: 'sekrit' });
  expect(r.success).toBe(false);
  if (!r.success) {
    expect(r.error.issues[0]?.path).toEqual(['username']);
  }
});
```

Use `safeParse` rather than `parse` so failures don't throw — you assert against the issues array. Cover happy path, each branch of `.refine()`, and any boundary conditions (min/max lengths).

### 2. Service (`__tests__/services.test.ts`) — mock the axios instance once

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import axiosInstance from '@/api/axiosInstance';
import { ENDPOINTS } from '@/constants/endPoints';
import { loginService } from '../../services';

const mockedPost = vi.mocked(axiosInstance.post);
beforeEach(() => vi.clearAllMocks());

it('POSTs to ENDPOINTS.LOGIN and returns the envelope', async () => {
  mockedPost.mockResolvedValueOnce({
    data: {
      /* envelope */
    },
  });
  const result = await loginService({ username: 'amar.j', password: 'sekrit' });
  expect(mockedPost).toHaveBeenCalledWith(
    ENDPOINTS.LOGIN,
    { username: 'amar.j', password: 'sekrit' },
    undefined,
  );
  expect(result).toBeDefined();
});
```

Key points:

- Mock at the top of the file (`vi.mock` is hoisted).
- The HTTP helpers unwrap `response.data`, so resolve with `{ data: <envelope> }` to match what axios returns.
- `vi.mocked(...)` keeps full type inference on the mocked methods.
- One assertion per behaviour: assert on the call shape AND the returned value.

### 3. Hook (`__tests__/hooks/useLogin.test.tsx`) — `renderHook` + `createWrapper`

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services', () => ({
  loginService: vi.fn(),
  logoutService: vi.fn(),
}));

import { createWrapper } from '@/test-utils/render';
import { loginService } from '../../services';
import { useLogin } from '../../hooks/useLogin';

const mockedLogin = vi.mocked(loginService);
beforeEach(() => vi.clearAllMocks());

it('exposes the response on success', async () => {
  mockedLogin.mockResolvedValueOnce(/* response */);
  const { wrapper } = createWrapper();

  const { result } = renderHook(() => useLogin(), { wrapper });
  result.current.mutate({ username: 'amar.j', password: 'sekrit' });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual(/* response */);
});
```

Key points:

- Mock `../services` so the hook test stays a unit test (it tests the TanStack wiring, not the network).
- `createWrapper()` returns a fresh `QueryClient` per call — no cross-test leakage.
- Always `await waitFor(...)` against terminal state (`isSuccess`/`isError`) before asserting on `data`/`error`. Mutations are async.

### 4. Component (`__tests__/components/LoginForm.test.tsx`) — `renderWithProviders` + user-event

```tsx
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services', () => ({
  loginService: vi.fn(),
  logoutService: vi.fn(),
}));

import { renderWithProviders } from '@/test-utils/render';
import { loginService } from '../../services';
import { LoginForm } from '../../components/LoginForm';

const mockedLogin = vi.mocked(loginService);
beforeEach(() => vi.clearAllMocks());

it('submits valid credentials', async () => {
  mockedLogin.mockResolvedValueOnce(/* response */);
  const onLoggedIn = vi.fn();
  const user = userEvent.setup();

  renderWithProviders(<LoginForm onLoggedIn={onLoggedIn} />);

  await user.type(screen.getByLabelText(/username/i), 'amar.j');
  await user.type(screen.getByLabelText(/password/i), 'sekrit');
  await user.click(screen.getByRole('button', { name: /sign in/i }));

  await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith(/* response */));
});
```

Key points:

- `renderWithProviders` wraps in `QueryClientProvider` + `MemoryRouter` — use it for any component that reads from TanStack Query or uses `useNavigate` / `useLocation` / `Link`.
- Use `userEvent.setup()` once per test, not at the file level — the v14 API requires a fresh user per test.
- Query by accessible role/label (`getByLabelText`, `getByRole`) over `getByTestId`. The form is accessible iff the tests can find it that way.
- Use `findByText` (not `findByRole('alert')`) for error assertions — `FormInput` renders empty `role="alert"` placeholders for layout, so role-based queries match multiple nodes.

## What to test (and what not to)

| Layer             | Test these                                                                    | Don't test these                                             |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Schema (utils.ts) | Happy path, each branch of refine/superRefine, boundary lengths               | Zod's own behaviour                                          |
| Service           | Endpoint + payload shape, returned envelope, error propagation                | Axios internals, network                                     |
| Hook              | TanStack wiring (success/error states), service is called with the right args | The service's own logic — that's the service test's job      |
| Component         | User can submit, errors show, callbacks fire                                  | Component implementation details (className, internal state) |

## Conventions enforced

- ❌ NEVER let one test depend on another's order — every test starts from `beforeEach(() => vi.clearAllMocks())` and a fresh `QueryClient`.
- ❌ NEVER call a real axios instance in unit tests — mock `@/api/axiosInstance` or the service module.
- ❌ NEVER assert on internal state (CSS class names, private refs). Assert on what a user can see/do.
- ❌ NEVER mix `act(...)` with `userEvent` calls — `userEvent` wraps `act` internally; double-wrapping is a flake source.
- ✅ One `beforeEach(() => vi.clearAllMocks())` per `describe`.
- ✅ Always `waitFor` on terminal state before reading `data`/`error` from a mutation/query.
- ✅ Use `findBy*` for elements that appear after async work; `getBy*` for elements present at render.
- ✅ Mock the layer immediately below the unit under test, never deeper. Service test mocks axios; hook test mocks the service; component test mocks the service (not the hook).

## Reference tests

The scaffolded project ships working examples at `src/features/login/__tests__/`:

- [`utils.test.ts`](../../../src/features/login/__tests__/utils.test.ts) — schema
- [`services.test.ts`](../../../src/features/login/__tests__/services.test.ts) — service with axios mock
- [`hooks/useLogin.test.tsx`](../../../src/features/login/__tests__/hooks/useLogin.test.tsx) — hook with `createWrapper`
- [`components/LoginForm.test.tsx`](../../../src/features/login/__tests__/components/LoginForm.test.tsx) — component with `renderWithProviders`

Copy the shape when testing a new feature.
