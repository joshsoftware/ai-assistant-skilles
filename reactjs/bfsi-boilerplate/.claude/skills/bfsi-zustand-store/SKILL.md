---
name: bfsi-zustand-store
description: Create a Zustand store the BFSI way. Covers when to reach for Zustand vs TanStack Query / useState / Context, where stores live (feature-local vs `src/stores/`), the canonical store + actions shape, selecting state without re-render storms (`useShallow`), centralised logout-clear, persist middleware with a strict PII allowlist, devtools setup, and testing. Use when the user mentions Zustand, "client state management", "where should this state live", "create a store", idle timer / MFA challenge / multi-step wizard state, or types /bfsi-zustand-store.
allowed-tools: Read Write Edit Glob Grep Bash
---

# BFSI Zustand Store

Zustand is this project's sanctioned tool for **client state** — UI / app state that lives only in the browser. **Server state** still belongs in TanStack Query. The two are complementary, not alternatives.

## When to reach for Zustand

Use this decision order:

1. **Does the state come from the server?** → Use TanStack Query (`useQuery` / `useMutation`). Stop.
2. **Is the state local to one component or a tight parent/child tree?** → Use `useState` / `useReducer` + props. Stop.
3. **Is the state read in ≥ 3 distant components, or shared across routes?** → Use Zustand.
4. **Is it config that almost never changes (theme, locale)?** → React Context is fine; Zustand is overkill.

Mirror these examples:

| Concern                                         | Lives in       | Why                                             |
| ----------------------------------------------- | -------------- | ----------------------------------------------- |
| Account balances, transaction list, KYC status  | TanStack Query | Server-owned data with caching needs            |
| Login form values                               | `useState`     | One component owns them                         |
| Idle-timer countdown, "sensitive route" flag    | Zustand        | Used by `<ProtectedRoute>`, headers, modals     |
| MFA challenge id + attempts-remaining           | Zustand        | Spans the challenge dialog + verify form + audit logger |
| Multi-step transaction wizard (step, draft)     | Zustand        | Survives navigation between wizard steps        |
| Toast/notification queue                        | Zustand        | Pushed from anywhere, rendered in one place     |
| Theme / locale                                  | Context        | Rarely-changing, app-wide                       |

## File map

Feature-owned state lives next to the feature; app-wide state lives in a shared folder.

```
src/features/<Feature>/
├── store.ts              ← feature-owned Zustand store
├── components/...
├── hooks/...
├── services.ts
└── ...

src/stores/               ← app-wide stores (create this folder when the first one lands)
├── idleTimer.ts
├── notifications.ts
└── index.ts              ← re-exports + the central `resetAllStores()` for logout
```

Promote a feature store to `src/stores/` when **three or more features** read it (rule of three).

## Creating a store — the canonical pattern

```ts
// src/features/mfa/store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface MfaChallengeState {
  challengeId: string | null;
  attemptsRemaining: number;
}

interface MfaChallengeActions {
  setChallenge: (id: string) => void;
  recordAttempt: () => void;
  reset: () => void;
}

const INITIAL_STATE: MfaChallengeState = {
  challengeId: null,
  attemptsRemaining: 3,
};

export const useMfaChallengeStore = create<MfaChallengeState & MfaChallengeActions>()(
  devtools(
    (set) => ({
      ...INITIAL_STATE,
      setChallenge: (id) => set({ challengeId: id, attemptsRemaining: 3 }),
      recordAttempt: () => set((s) => ({ attemptsRemaining: s.attemptsRemaining - 1 })),
      reset: () => set(INITIAL_STATE),
    }),
    { name: 'mfaChallenge', enabled: import.meta.env.DEV },
  ),
);
```

Conventions:

- **Hook name**: `use<Domain>Store` (`useMfaChallengeStore`, `useIdleTimerStore`).
- **State + actions in one type** — but declared as two interfaces so the file reads top-down (data → behaviour).
- **`INITIAL_STATE` constant** — so `reset` is a one-liner and tests can compare against it.
- **`devtools` middleware gated on `import.meta.env.DEV`** — never ships to prod (avoids leaking state to the Redux devtools panel in user browsers).
- **Single `set(INITIAL_STATE)` reset** — see the logout section below; every store needs `reset`.

## Selecting state without re-render storms

Always select narrowly. The default subscription re-renders the component on any state change.

```tsx
// ❌ subscribes to the whole store — re-renders on any change
const store = useMfaChallengeStore();

// ✅ subscribes to one field — re-renders only when challengeId changes
const challengeId = useMfaChallengeStore((s) => s.challengeId);

// ✅ subscribes to multiple fields — useShallow prevents re-render unless any of them changes
import { useShallow } from 'zustand/react/shallow';

const { challengeId, attemptsRemaining } = useMfaChallengeStore(
  useShallow((s) => ({ challengeId: s.challengeId, attemptsRemaining: s.attemptsRemaining })),
);

// ✅ actions don't change — read them directly, no subscription cost
const recordAttempt = useMfaChallengeStore((s) => s.recordAttempt);
```

Verify with the React Profiler: a Zustand-backed component should re-render only when its selected slice changes.

## BFSI safety rules

These are the rules that matter most. They're non-negotiable in this project.

### 1. **Never persist PII via the `persist` middleware (or anywhere in browser storage).**

`persist` writes to `localStorage` by default. PAN, Aadhaar, account number, mobile, OTP, card data — none of it goes here. Project convention #3 / #7 already forbid PII in `console.log` and `localStorage`; this is the same rule.

If you genuinely need persistence (theme, sidebar collapsed state, a non-PII draft):

```ts
import { persist, createJSONStorage } from 'zustand/middleware';

export const useUiPrefsStore = create<UiPrefs>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'ui-prefs',
      storage: createJSONStorage(() => localStorage),
      // ALLOWLIST — only these fields get persisted. Default would persist everything.
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
```

`partialize` is the safety latch. The reviewer agent should flag any `persist(...)` without `partialize`.

### 2. **Don't mirror server state into a Zustand store.**

If the data comes from `/api/...`, it belongs in TanStack Query. Mirroring creates two sources of truth and stale UI. The only exception is the *id* of a fetched record stashed for cross-component reference — never the record itself.

### 3. **Clear every store on logout** — see next section.

### 4. **No PII in `devtools` action names or `set` payloads that the devtools panel will display.**

`devtools` shows action payloads in the Redux devtools panel. If you `set({ pan: '...' })`, that PAN ends up in the panel. Use scrubbed names like `setKycSubmitted` rather than `setPan('ABCDE1234F')`.

## Logout: clearing every store

Each store exports a `reset` action; the logout flow calls every one.

```ts
// src/stores/index.ts
import { useMfaChallengeStore } from '@/features/mfa/store';
import { useIdleTimerStore } from './idleTimer';
import { useNotificationsStore } from './notifications';

/** Reset every Zustand store. Call from the logout flow. */
export function resetAllStores(): void {
  useMfaChallengeStore.getState().reset();
  useIdleTimerStore.getState().reset();
  useNotificationsStore.getState().reset();
}
```

```ts
// wherever logout() lives
import { clearAuthToken } from '@/lib/http';
import axiosInstance from '@/api/axiosInstance';
import { queryClient } from '@/api/queryClient';
import { resetAllStores } from '@/stores';
import { ROUTES } from '@/constants/routes';

export function logout(navigate: NavigateFunction): void {
  clearAuthToken(axiosInstance);
  queryClient.clear();
  resetAllStores();
  navigate(ROUTES.login, { replace: true });
}
```

Order matters: drop the token first (so no in-flight request authenticates), clear server caches, reset client state, then navigate. When you add a new store, **update `resetAllStores`** — there is no `// CONVENTION:` breadcrumb safety net here, the test below is the safety net.

## Middleware reference

All real exports — verified against `zustand@5.0.x`:

| Middleware                     | Import                                              | Use when                                                          |
| ------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------- |
| `devtools`                     | `'zustand/middleware'`                              | Always (gated on `import.meta.env.DEV`)                           |
| `persist` + `createJSONStorage`| `'zustand/middleware'`                              | Persisting non-PII UI prefs — REQUIRES `partialize`               |
| `subscribeWithSelector`        | `'zustand/middleware'`                              | Cross-store reactions (e.g. logout listener)                      |
| `immer`                        | `'zustand/middleware/immer'`                        | Deeply nested state that's annoying with spread syntax (rare)     |

Composition order: outermost wraps innermost. Typical: `devtools(persist((set) => ...))` — devtools labels the persisted actions.

## Testing

Zustand stores are easy to test because they're pure functions outside React.

```ts
// src/features/mfa/__tests__/store.test.ts
import { beforeEach, describe, expect, it } from 'vitest';

import { useMfaChallengeStore } from '../store';

beforeEach(() => {
  useMfaChallengeStore.getState().reset();
});

describe('useMfaChallengeStore', () => {
  it('starts with no challenge and 3 attempts', () => {
    expect(useMfaChallengeStore.getState()).toMatchObject({
      challengeId: null,
      attemptsRemaining: 3,
    });
  });

  it('records attempts down to zero', () => {
    useMfaChallengeStore.getState().setChallenge('ch-1');
    useMfaChallengeStore.getState().recordAttempt();
    useMfaChallengeStore.getState().recordAttempt();
    expect(useMfaChallengeStore.getState().attemptsRemaining).toBe(1);
  });

  it('reset returns to initial state', () => {
    useMfaChallengeStore.getState().setChallenge('ch-1');
    useMfaChallengeStore.getState().reset();
    expect(useMfaChallengeStore.getState().challengeId).toBeNull();
  });
});
```

For component tests that depend on store state, set the store directly before render:

```ts
useMfaChallengeStore.setState({ challengeId: 'ch-1', attemptsRemaining: 2 });
renderWithProviders(<VerifyMfaForm />);
```

**Always `reset()` in `beforeEach`** — stores are module-level singletons and leak between tests otherwise.

## A real example — idle timer store

Real BFSI use case: track idle activity for auto-logout on sensitive routes. The store holds the *state*; the idle timer from `@react-vault/core/auth` drives it.

```ts
// src/stores/idleTimer.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface IdleTimerState {
  isIdle: boolean;
  lastActivityAt: number;
  /** Current applicable timeout in ms (overridden per sensitive route). */
  timeoutMs: number;
}

interface IdleTimerActions {
  recordActivity: () => void;
  setIdle: (isIdle: boolean) => void;
  setTimeout: (ms: number) => void;
  reset: () => void;
}

const INITIAL_STATE: IdleTimerState = {
  isIdle: false,
  lastActivityAt: Date.now(),
  timeoutMs: 900_000, // 15 min default; sensitive routes override via setTimeout
};

export const useIdleTimerStore = create<IdleTimerState & IdleTimerActions>()(
  devtools(
    (set) => ({
      ...INITIAL_STATE,
      recordActivity: () => set({ isIdle: false, lastActivityAt: Date.now() }),
      setIdle: (isIdle) => set({ isIdle }),
      setTimeout: (ms) => set({ timeoutMs: ms }),
      reset: () => set(INITIAL_STATE),
    }),
    { name: 'idleTimer', enabled: import.meta.env.DEV },
  ),
);
```

Consumed in `<ProtectedRoute>` (sketch):

```tsx
const setTimeout = useIdleTimerStore((s) => s.setTimeout);
const setIdle = useIdleTimerStore((s) => s.setIdle);

useEffect(() => {
  setTimeout(idleTimeoutMs ?? env.VITE_IDLE_TIMEOUT_MS);
  const stop = startIdleTimer({
    timeoutMs: idleTimeoutMs ?? env.VITE_IDLE_TIMEOUT_MS,
    onIdle: () => { setIdle(true); logout(navigate); },
  });
  return stop;
}, [idleTimeoutMs, setTimeout, setIdle, navigate]);
```

## Conventions enforced

- ❌ NEVER store PII (PAN, Aadhaar, account, OTP, password, card) in any Zustand store.
- ❌ NEVER use `persist` without an explicit `partialize` allowlist.
- ❌ NEVER mirror server data — that's TanStack Query's job.
- ❌ NEVER ship `devtools` to production — always gate on `import.meta.env.DEV`.
- ❌ NEVER read `useFooStore()` without a selector in render code (subscribes to the entire store).
- ✅ One `use<Domain>Store` per file; `INITIAL_STATE` constant; `reset` action.
- ✅ Feature-local store at `src/features/<Feature>/store.ts`; app-wide at `src/stores/<name>.ts`.
- ✅ Every store is registered in `src/stores/index.ts` → `resetAllStores()`; logout calls it.
- ✅ `useShallow` for multi-field selections; single-field selectors otherwise.
- ✅ Each store has unit tests with `reset()` in `beforeEach`.

## Workflow — adding a store

1. Decide feature-local vs app-wide (rule of three for promotion).
2. Create `store.ts` with the canonical pattern above.
3. Add a `reset` action that returns to `INITIAL_STATE`.
4. If app-wide, register in `src/stores/index.ts` → `resetAllStores()`.
5. Write the three unit tests (initial state, primary action, reset).
6. Confirm only the necessary fields are subscribed at consumer sites (`useShallow` if > 1).

## References

- Zustand docs: <https://github.com/pmndrs/zustand>
- This skill is written for `zustand@5.0.x`. Imports used here (`zustand`, `zustand/middleware`, `zustand/react/shallow`) are stable across v5 minor versions. If you ever roll back to v4, the deprecated default-export `shallow` from `zustand/shallow` re-appears — irrelevant for new code.
