# BFSI React Boilerplate

A production-grade React starter for **BFSI (Banking, Financial Services & Insurance)** applications. This repository is the canonical boilerplate for all BFSI front-end projects in our organisation — clone it, rename it, and start delivering features against the conventions that are already in place.

It bakes in:

- A secure-by-default stack (React 19 + Vite 5 + TypeScript strict).
- BFSI-specific guardrails: PII masking, in-memory tokens, Zod-validated boundaries, protected routes, encryption helpers.
- A complete **Claude Code** toolkit — skills, agents, and slash commands wired into `.claude/` — so AI-assisted work follows the same conventions as a human reviewer.
- Husky + lint-staged + commitlint with **Conventional Commits (BFSI types)**.
- Auto-review on every Claude turn that flags P0/P1 issues before they ship.

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Prerequisites](#prerequisites)
3. [Clone & run](#clone--run)
4. [Available scripts](#available-scripts)
5. [Project structure](#project-structure)
6. [Critical BFSI conventions](#critical-bfsi-conventions)
7. [Feature-folder pattern](#feature-folder-pattern)
8. [Layouts (`src/layouts/`)](#layouts-srclayouts)
9. [Auth, tokens, and 401 handling](#auth-tokens-and-401-handling)
10. [Client state with Zustand](#client-state-with-zustand)
11. [Environment variables](#environment-variables)
12. [Testing](#testing)
13. [Primitives showcase (`/dev/showcase`)](#primitives-showcase-devshowcase)
14. [Performance baseline](#performance-baseline)
15. [Claude Code toolkit](#claude-code-toolkit)
    - [Slash commands](#slash-commands)
    - [Skills](#skills)
    - [Sub-agents](#sub-agents)
16. [Hooks & guardrails](#hooks--guardrails)
17. [Commit & PR conventions](#commit--pr-conventions)
18. [Using this as a boilerplate](#using-this-as-a-boilerplate)
19. [Gotchas](#gotchas)

---

## Tech stack

| Layer            | Choice                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| Framework        | **React 19** + **Vite 5** + **TypeScript** (`strict`)                  |
| Styling          | **Tailwind CSS** + **shadcn/ui** (components owned in `src/components/ui/`) |
| Forms            | **React Hook Form** + **Zod** (`@hookform/resolvers/zod`)              |
| Routing          | **react-router-dom v6** with `<ProtectedRoute permission="...">`       |
| Server state     | **TanStack Query v5** (`@tanstack/react-query`)                        |
| Client state     | **Zustand v5** (UI-only, never server data)                            |
| HTTP             | **axios** with a single shared instance and in-memory token            |
| i18n             | **react-i18next** (`en`, `hi` defaults)                                |
| Tests (unit)     | **Vitest** + **Testing Library** + **jsdom**                           |
| Tests (E2E)      | **Playwright**                                                         |
| Lint / format    | **ESLint 9** (`--max-warnings 0`) + **Prettier**                       |
| Git hooks        | **Husky** + **lint-staged** + **commitlint**                           |

---

## Prerequisites

- **Node.js** ≥ 20.x (LTS)
- **pnpm** ≥ 9.x — `npm install -g pnpm` (this repo standardises on pnpm; do not mix with npm/yarn)
- **Git** ≥ 2.40
- A modern browser (Chromium-based recommended for Playwright)

> Windows: PowerShell 7 is supported. macOS / Linux: any POSIX shell. Examples below use generic syntax.

---

## Clone & run

```bash
# 1. Clone (replace <your-org> and <repo-name>)
git clone https://github.com/<your-org>/<repo-name>.git
cd <repo-name>

# 2. Install dependencies (pnpm only)
pnpm install

# 3. Set up env — the app will throw a Zod error at boot if this is missing
cp .env.local.sample .env.local
# then open .env.local and fill in real values

# 4. Start the dev server (http://localhost:5173)
pnpm dev
```

You should see the **login** reference feature at `/login`. Use it as the shape for every new feature you add.

In dev, the route `/dev/showcase` renders a live catalogue of every shipped BFSI primitive (`<PIIMaskedDisplay>`, `<FormInput>` + Zod, the regex catalogue). The route is gated on `import.meta.env.DEV` and is dead-code-eliminated from production builds.

---

## Available scripts

```bash
pnpm dev           # Vite dev server on :5173 (with security headers enforced)
pnpm build         # tsc --noEmit && vite build (production bundle)
pnpm preview       # Preview the production build locally
pnpm test          # Vitest — single run (CI mode)
pnpm test:watch    # Vitest — watch mode
pnpm test:e2e      # Playwright E2E tests
pnpm typecheck     # tsc --noEmit (no emit, just type-check)
pnpm lint          # ESLint (--max-warnings 0; warnings fail CI)
pnpm lint:fix      # ESLint with autofix
pnpm format        # Prettier write across src/**
pnpm analyze       # Bundle treemap → dist/stats.html (auto-opens)
```

---

## Project structure

```
.
├── .claude/                Claude Code config: agents, skills, commands, hooks
│   ├── agents/             Sub-agents (security, code, a11y, PII, perf reviewers)
│   ├── skills/             Reference + action skills (bfsi-feature, bfsi-form, …)
│   ├── commands/           Slash commands (/bfsi-review, /bfsi-scaffold, …)
│   └── settings.json       Permission rules + hook registration
├── .husky/                 Git hooks (pre-commit, commit-msg)
├── src/
│   ├── api/                axiosInstance, http helpers (GET/POST/…), queryClient
│   ├── app/                App.tsx (providers), globals.css
│   ├── assets/             logo, images, fonts, icons (Vite-hashed imports — see assets/README.md)
│   ├── components/
│   │   ├── bfsi/           PIIMaskedDisplay and other BFSI primitives
│   │   ├── common/         FormInput, Image (typed wrappers)
│   │   └── ui/             shadcn-managed; add via `pnpm dlx shadcn-ui add <c>`
│   ├── constants/          endPoints.ts, statusCodes.ts, routes.ts (add queryKeys/regex/app as needed)
│   ├── features/
│   │   └── login/          Reference feature — copy its shape for new features
│   │       ├── components/ LoginForm.tsx
│   │       ├── hooks/      useLogin.ts (thin useMutation wrapper)
│   │       ├── __tests__/  Vitest specs (services, hooks, components, schema)
│   │       ├── index.tsx
│   │       ├── services.ts Typed service functions
│   │       ├── types.ts    Request/response interfaces
│   │       └── utils.ts    Zod schema + form defaults
│   ├── i18n/               react-i18next setup + en/hi translations
│   ├── layouts/            PublicLayout, AppLayout (shared chrome via <Outlet />)
│   ├── lib/
│   │   ├── encryption/     AES-GCM, RSA-OAEP, PBKDF2, envelope helpers
│   │   ├── http/           createAxios, interceptors, error helpers
│   │   ├── pii/            patterns, validators, maskers
│   │   └── utils/          cn() and small utilities
│   ├── routes/             ProtectedRoute + route config (layouts nest routes here)
│   ├── shared/             Cross-feature components (ErrorBoundary, NotFound)
│   ├── test-utils/         render() helpers with providers
│   ├── env.ts              Zod-validated env (throws at boot on bad config)
│   └── main.tsx            Entry point
├── CLAUDE.md               Project context loaded by Claude Code at session start
├── README.md               This file
├── .env.local.sample       Template — copy to .env.local
├── commitlint.config.cjs   Conventional Commits with BFSI types
├── eslint.config.js        Flat config; --max-warnings 0
├── tailwind.config.ts
├── tsconfig.json           strict TypeScript
└── vite.config.ts
```

---

## Critical BFSI conventions

These are **non-negotiable** and enforced by hooks, lint rules, and review agents.

1. **Tokens never in `localStorage`.** Use `setAuthToken(axiosInstance, token)` from `@/lib/http` at login — the token lives in memory only.
2. **All API responses pass through `Zod .parse()`.** No raw types crossing the network boundary. See the `tanstack-services` skill.
3. **PII fields display via `<PIIMaskedDisplay>`.** Never render PAN / Aadhaar / account number / customer ID directly.
4. **No card data in HTML inputs.** Use a tokenised card input component; flag any plain `<input>` capturing PAN/CVV.
5. **Every route is a `<ProtectedRoute permission="...">`** with an explicit permission string. Public routes are the exception, not the default.
6. **No `dangerouslySetInnerHTML`** unless explicitly sanitised. A pre-write hook blocks it.
7. **No `console.log` of PII variables** (PAN, Aadhaar, account, password, OTP). A post-write hook scans for this.
8. **Conventional Commits with BFSI types** — `feat`, `fix`, **`security`**, **`compliance`**, `perf`, `refactor`, `docs`, `style`, `test`, `build`, `ci`, `chore`. No `Co-Authored-By` trailer.
9. **Grep before you reference.** Don't import a function/hook/component you haven't confirmed exists. The `bfsi-no-fabrication` skill (and a PreToolUse hook) enforces this.
10. **Constants are exhaustive.** Adding an endpoint/route/tag means updating the centralised constants file — no inline strings.

The full working-discipline list is in [`CLAUDE.md`](./CLAUDE.md).

---

## Feature-folder pattern

Every feature owns its services, hooks, types, schemas, components, and tests. `src/features/login/` is the working reference — copy its shape.

**`services.ts`** — typed async functions calling the HTTP helpers:

```ts
import { POST } from '@/api/http';
import { ENDPOINTS } from '@/constants/endPoints';
import type { ILoginRequest, ILoginResponse } from './types';

export const loginService = (payload: ILoginRequest): Promise<ILoginResponse> =>
  POST<ILoginRequest, ILoginResponse>(ENDPOINTS.LOGIN, payload);
```

Generic order is `<TRequest, TResponse>` — request first, response second. Reads like the call: "POST this, get this back".

**`hooks/useLogin.ts`** — thin `useMutation` wrapper, no baked-in side effects:

```ts
import { useMutation } from '@tanstack/react-query';
import { loginService } from '../services';

export const useLogin = () => useMutation({ mutationFn: loginService });
```

Don't bake `onSuccess` / `onError` into the hook — pass them at the call-site.

**`utils.ts`** — Zod schema + inferred type + defaults:

```ts
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().trim().min(1, 'Password is required'),
});

export type ILoginFormValues = z.infer<typeof loginSchema>;
export const LOGIN_FORM_DEFAULT_VALUES: ILoginFormValues = { username: '', password: '' };
```

Form value types are inferred from the schema — never hand-written.

**`components/LoginForm.tsx`** — RHF + `zodResolver` + `FormInput`:

```tsx
const form = useForm<ILoginFormValues>({
  resolver: zodResolver(loginSchema),
  defaultValues: LOGIN_FORM_DEFAULT_VALUES,
});
const { mutate, isPending } = useLogin();

<FormInput control={form.control} name="username" label="Username" isRequired />
<FormInput control={form.control} name="password" label="Password" isSensitive isRequired />
```

To scaffold a new feature against this pattern, run `/bfsi-feature` inside Claude Code.

---

## Layouts (`src/layouts/`)

Two layouts ship by default. Both use the React-Router-v6 parent/`<Outlet />` pattern — pages render only their content, the layout owns the `<main>` element and the shared chrome.

| Layout          | Used by                              | Chrome                                                                |
| --------------- | ------------------------------------ | --------------------------------------------------------------------- |
| `PublicLayout`  | Landing, Login, `/dev/showcase`      | Slim top bar with brand mark. No nav, no logout.                      |
| `AppLayout`     | Dashboard and future authenticated pages | Sticky header with brand + sign-out button (clears token + query cache, navigates to `/login`). |

Wiring lives in [src/routes/index.tsx](src/routes/index.tsx):

```tsx
<Routes>
  <Route element={<PublicLayout />}>
    <Route path={ROUTES.home} element={<Landing />} />
    <Route path={ROUTES.login} element={<LoginPage />} />
  </Route>

  <Route element={<AppLayout />}>
    <Route
      path={ROUTES.dashboard}
      element={
        <ProtectedRoute permission="dashboard.view">
          <Dashboard />
        </ProtectedRoute>
      }
    />
  </Route>
</Routes>
```

**Per-route permission stays at the leaf**, not the layout. `<ProtectedRoute permission="...">` continues to enumerate every guarded entry-point — grep-friendly for security review. Layouts are chrome only.

When adding a page:

1. Place the lazy import at the top of `routes/index.tsx`.
2. Drop the route under the right layout (`PublicLayout` vs `AppLayout`).
3. Add `<ProtectedRoute permission="<feature>.<action>">` if authenticated.
4. The page itself **must not** add its own `<main>` element — the layout owns it.

---

## Auth, tokens, and 401 handling

The shared axios instance has **no per-request token interceptor**. Set the token once on login success:

```ts
import { setAuthToken } from '@/lib/http';
import axiosInstance from '@/api/axiosInstance';

mutate(values, {
  onSuccess: (response) => {
    setAuthToken(axiosInstance, response.data.token);
    navigate('/dashboard', { replace: true });
  },
});
```

On a `401`, the instance's `onUnauthorized` callback clears the token and redirects to `/login`. See `src/lib/http/interceptors.ts` and the `axios-auth` skill for the full walkthrough.

---

## Client state with Zustand

**TanStack Query owns server state. Zustand owns client (UI) state.** They are complementary — never use Zustand to mirror data that came from the server.

For full setup details, conventions, and the testing pattern, run `/bfsi-zustand-store` inside Claude Code or open [`.claude/skills/bfsi-zustand-store/SKILL.md`](./.claude/skills/bfsi-zustand-store/SKILL.md). The condensed version is below.

### When to reach for Zustand (decision order)
1. **Server-owned data?** → TanStack Query (`useQuery` / `useMutation`). Stop.
2. **Local to one component / tight parent-child tree?** → `useState` / `useReducer`. Stop.
3. **Read in ≥ 3 distant components or shared across routes?** → Zustand.
4. **Config that almost never changes (theme, locale)?** → React Context.

Typical BFSI fits: idle-timer state, MFA challenge id + attempts, multi-step transaction wizard draft, toast/notification queue.

### File map

```
src/features/<Feature>/store.ts   ← feature-owned store (start here)
src/stores/                       ← app-wide stores (promote on the rule of three)
├── idleTimer.ts
├── notifications.ts
└── index.ts                      ← re-exports + resetAllStores() for logout
```

Promote a feature store to `src/stores/` when **three or more features** read it.

### Canonical store pattern

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

- Hook name `use<Domain>Store`; state and actions declared as two interfaces but combined in `create<…>`.
- `INITIAL_STATE` constant so `reset` is a one-liner and tests have a baseline.
- `devtools` is **always gated on `import.meta.env.DEV`** — never ships to production.
- Every store exports a `reset` action.

### Select narrowly (avoid re-render storms)

```tsx
// ❌ subscribes to the entire store
const store = useMfaChallengeStore();

// ✅ single-field selector
const challengeId = useMfaChallengeStore((s) => s.challengeId);

// ✅ multi-field selector with useShallow
import { useShallow } from 'zustand/react/shallow';
const { challengeId, attemptsRemaining } = useMfaChallengeStore(
  useShallow((s) => ({ challengeId: s.challengeId, attemptsRemaining: s.attemptsRemaining })),
);
```

### BFSI safety rules (non-negotiable)

1. **Never store PII** (PAN, Aadhaar, account, OTP, password, card data) in any Zustand store.
2. **Never use `persist` without an explicit `partialize` allowlist.** `persist` writes to `localStorage` by default; `partialize` is the safety latch that limits which fields get written.
3. **Never mirror server data** — that's TanStack Query's job.
4. **Never ship `devtools` to production** — gate on `import.meta.env.DEV`.
5. **No PII in `devtools` action names or `set` payloads** — they appear in the Redux devtools panel.

### Persist with an allowlist (only for non-PII UI prefs)

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
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }), // ← allowlist
    },
  ),
);
```

### Clear every store on logout

```ts
// src/stores/index.ts
export function resetAllStores(): void {
  useMfaChallengeStore.getState().reset();
  useIdleTimerStore.getState().reset();
  useNotificationsStore.getState().reset();
}

// wherever logout() lives
export function logout(navigate: NavigateFunction): void {
  clearAuthToken(axiosInstance);  // drop token first
  queryClient.clear();            // clear server caches
  resetAllStores();               // reset client state
  navigate(ROUTES.login, { replace: true });
}
```

Order matters: token → server caches → client state → navigation. **When you add a new store, register it in `resetAllStores()`** — there is no breadcrumb safety net, the test in `__tests__/store.test.ts` is.

### Workflow — adding a store

1. Decide feature-local vs app-wide (rule of three for promotion).
2. Create `store.ts` with the canonical pattern.
3. Add a `reset` action that returns to `INITIAL_STATE`.
4. If app-wide, register in `src/stores/index.ts` → `resetAllStores()`.
5. Write three unit tests (initial state, primary action, reset). `reset()` in `beforeEach` — stores are module-level singletons and leak between tests.
6. Confirm consumers use narrow selectors (`useShallow` if > 1 field).

---

## Environment variables

`src/env.ts` validates every `VITE_*` variable through Zod at boot. If anything is missing or wrong, the app **throws immediately** — fix `.env.local` before continuing.

Required keys (see `.env.local.sample` for the full list):

| Variable                        | Purpose                                |
| ------------------------------- | -------------------------------------- |
| `VITE_API_BASE_URL`             | API origin                             |
| `VITE_API_TIMEOUT_MS`           | axios timeout (ms)                     |
| `VITE_AUTH_HEADER_NAME`         | Header used to attach the bearer token |
| `VITE_SENTRY_DSN`               | Optional — leave empty to disable      |
| `VITE_IDLE_TIMEOUT_MS`          | Idle logout (ms)                       |
| `VITE_SENSITIVE_IDLE_TIMEOUT_MS`| Idle logout on transaction routes (ms) |
| `VITE_FEATURE_FLAGS_PROVIDER`   | `local` or your provider               |

> **Do not** rename `.env.local.sample` to `.env.example` — a PreToolUse hook (`env-file-convention.sh`) blocks it. A prior rename silently dropped six BFSI env vars.

---

## Testing

- **Unit / component**: `pnpm test` (Vitest + Testing Library + jsdom). Helpers live in `src/test-utils/`.
- **E2E**: `pnpm test:e2e` (Playwright).
- **Patterns**: see the `testing-patterns` and `bfsi-test-pattern` skills — they cover schema tests, service mocks, TanStack Query hook tests, RHF form tests, and BFSI-specific cases (PII masking, auth bypass, race conditions, a11y).

Reference tests are in `src/features/login/__tests__/`.

---

## Primitives showcase (`/dev/showcase`)

A live catalogue of every shared BFSI primitive the boilerplate ships. Lives at [src/features/showcase/](src/features/showcase/index.tsx).

- **Dev only** — the route is gated on `import.meta.env.DEV`, lazy-loaded, and dead-code-eliminated from production bundles.
- **Proof of life, never aspirational** — sections only exist for code that *already ships* and is used in a real feature. No placeholder previews of components that don't exist yet (that would violate [CLAUDE.md](CLAUDE.md) discipline #5: no in-case code).
- **Same-PR rule** — when you add a new shared primitive (`<ConfirmModal>`, `<DataTable>`, `<PCITokenizedCardInput>`, etc.), the **same PR** adds its showcase card. If the primitive is too dynamic to demo statically (e.g. a modal triggered from a real flow), the card is a trigger button + a minimal example.

Sections shipped today:

- `<PIIMaskedDisplay>` — every `MaskerType` rendered side-by-side, including disabled, null-value, and custom reveal-duration variants.
- `<FormInput>` + Zod + react-hook-form — PAN, mobile, email, password (sensitive) wired to a live schema; submit logs (password redacted) to the console.
- Regex catalogue — every constant from [src/constants/regex.ts](src/constants/regex.ts) with pattern source and example match.
- `<Image>` — default (lazy + async decode) vs `priority` (eager + sync decode + `fetchPriority="high"`).

---

## Performance baseline

The boilerplate ships sensible defaults so every cloned project starts from the same baseline. Per-feature tuning is documented in the `bfsi-perf-react`, `bfsi-perf-real-time`, `bfsi-perf-virtualize-list`, and `perf-tuning` skills.

| Optimisation             | Where it lives                                                              | Status                                                                                       |
| ------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Vendor code splitting** | [vite.config.ts](vite.config.ts) `rollupOptions.output.manualChunks`         | Splits `react`, `forms`, `i18n` into separate vendor chunks.                                 |
| **Route lazy loading**   | [src/routes/index.tsx](src/routes/index.tsx) — `React.lazy()` + `<Suspense>` | Every feature page ships as its own chunk; landing stays in the main bundle for fast paint. |
| **Query caching**        | [src/api/queryClient.ts](src/api/queryClient.ts)                            | `staleTime: 60s`, `gcTime: 5m`, `refetchOnWindowFocus: false`, retry once on 5xx/network only. |
| **Image CLS prevention** | [src/components/common/Image.tsx](src/components/common/Image.tsx)          | Mandatory `width`/`height`; defaults to `loading="lazy"` + `decoding="async"`.               |
| **Bundle analyzer**      | `pnpm analyze` → `dist/stats.html`                                          | `rollup-plugin-visualizer` gated on `npm_lifecycle_event === 'analyze'`; treemap + gzip/brotli sizes. |
| Memoisation              | Per-feature (skill: `bfsi-perf-react`)                                      | Not shipped — "measure first" is the discipline. Apply on profile evidence, not pre-emptively. |
| Virtualisation           | Per-feature (skill: `bfsi-perf-virtualize-list`)                            | Not shipped until a real long list lands. Skill recipe is ready to apply.                    |

Run `pnpm analyze` after a perf-sensitive change to inspect chunk sizes before merging.

---

## Claude Code toolkit

This project is set up as a first-class Claude Code workspace. The `.claude/` directory ships with skills, agents, slash commands, and hooks that encode every convention listed above.

> **New to the codebase?** Run `/bfsi-onboarding` for a guided tour, or `/bfsi-doctor` to verify your local setup is healthy.

### Slash commands

Run any of these from inside Claude Code (`/<command-name>`):

| Command                     | Purpose                                                                    |
| --------------------------- | -------------------------------------------------------------------------- |
| `/bfsi-onboarding`          | Guided tour for a new developer on the codebase                            |
| `/bfsi-doctor`              | Health check — env, deps, `.claude` config, hook registration              |
| `/bfsi-feature`             | Scaffold a new feature folder (services + hooks + schema + form + tests)   |
| `/bfsi-form`                | Generate an RHF + Zod form against the project's `FormInput` wrapper       |
| `/bfsi-pii-field`           | Render a PII field via `<PIIMaskedDisplay>` with the right pattern         |
| `/bfsi-api-endpoint`        | Add a new endpoint to `endPoints.ts` and wire a typed service              |
| `/bfsi-compliance-check`    | Map current branch to RBI / PCI / IRDAI / SOC2 / ISO 27001 controls        |
| `/bfsi-commit`              | Stage and commit using Conventional Commits with the right BFSI type       |
| `/bfsi-review`              | Run the full PR review pipeline (security + code + a11y + PII + perf)     |
| `/bfsi-grep-conventions`    | Surface all `// CONVENTION:` breadcrumbs ready to codify                   |
| `/bfsi-scaffold`            | Lower-level scaffolding for files the BFSI skills depend on                |

### Skills

Skills come in two flavours: **reference skills** auto-load when relevant, **action skills** are invoked explicitly. Open any `SKILL.md` for the full reference.

**Architecture & feature shape**

- `tanstack-services` — services + hooks layer (typed async + `useQuery`/`useMutation` wrappers)
- `query-client-setup` — QueryClient defaults, retries, devtools, global error handling
- `constants-organization` — where each kind of constant lives (endpoints, status codes, routes, queryKeys, regex)
- `bfsi-zustand-store` — when to reach for Zustand, store shape, persist with PII allowlist
- `axios-auth` — `setAuthToken()` once at login, response interceptor, 401 redirect

**Forms, UI & accessibility**

- `bfsi-design-system` — 30-60-10 colour rule, tokens, BFSI component specs, dark mode, motion
- `bfsi-form` — RHF + Zod + `FormInput` patterns and validation regex
- `bfsi-pii-field` — render PII safely with `<PIIMaskedDisplay>`
- `bfsi-data-table` — high-density table patterns
- `bfsi-confirm-modal` — destructive-action confirmation patterns
- `bfsi-i18n-key` — i18n key conventions and en/hi translations

**Security & compliance**

- `bfsi-encrypt-helper` — AES-GCM / RSA-OAEP / PBKDF2 / envelope encryption via `@/lib/encryption`
- `bfsi-error-message` — safe error messages (no stack traces / SQL / request IDs / PII in UI or telemetry)
- `bfsi-no-fabrication` — grep before importing; never reference an unconfirmed symbol
- `bfsi-verify-backend` — verify the backend's behaviour before scaffolding the frontend
- `bfsi-regulation-quote` — return verbatim text from cited regulation passages (RBI / PCI / IRDAI / OWASP)
- `bfsi-protected-route` — wrap routes with the project's `<ProtectedRoute>` + permission strings
- `bfsi-route-constant` — add routes to the central constants file

**Performance**

- `perf-tuning` — TanStack Query tuning (`staleTime` vs `gcTime`, `select`, structural sharing, optimistic updates)
- `bfsi-perf-react` — measurement-first methodology, memoisation, code-splitting, bundle analysis
- `bfsi-perf-real-time` — WebSocket / SSE / polling without render-storms (`useSyncExternalStore`, rAF batching)
- `bfsi-perf-virtualize-list` — list virtualisation for transactions, audit logs, KYC lists

**Testing**

- `testing-patterns` — Vitest + Testing Library wrappers for services, hooks, forms
- `bfsi-test-pattern` — BFSI-specific scenarios (auth bypass, injection, a11y, PII masking checks)

### Sub-agents

Specialised reviewers under `.claude/agents/`. The orchestrator (`bfsi-pr-reviewer`) is the default entry point — it spawns the others in parallel and synthesises a single report.

| Agent                          | Use                                                                 |
| ------------------------------ | ------------------------------------------------------------------- |
| `bfsi-pr-reviewer`             | **Orchestrator** — runs the full review pipeline in parallel        |
| `bfsi-architect`               | Design / sanity-check a feature before scaffolding                  |
| `bfsi-security-reviewer`       | OWASP Top 10 + BFSI specifics (CSRF, secrets, weak crypto, permissions) |
| `bfsi-code-reviewer`           | Readability, complexity, test coverage, type safety, fit            |
| `bfsi-accessibility-auditor`   | WCAG 2.1 AA — semantics, ARIA, focus, keyboard, contrast            |
| `bfsi-pii-scanner`             | Find PII in console logs, URLs, errors, localStorage, telemetry     |
| `bfsi-performance-reviewer`    | Virtualisation, real-time feeds, render hotspots, bundle deltas     |
| `bfsi-compliance-auditor`      | RBI / PCI-DSS / IRDAI / SOC2 / ISO 27001 control-by-control report  |

---

## Hooks & guardrails

The repo ships with PreToolUse, PostToolUse, and Stop hooks registered in `.claude/settings.json`. Highlights:

- **`no-fabrication-guard.sh`** — blocks `import { X } from '@<scope>/core'` (or `/ui`) where `X` is exported nowhere.
- **`protect-skill-mandated.sh`** — blocks `rm` / `git rm` / `mv` of skill-mandated files (`axiosInstance.ts`, `ProtectedRoute.tsx`, etc.). Edits are fine; deletions require an explicit override.
- **`env-file-convention.sh`** — blocks renaming `.env.local.sample` → `.env.example`.
- **`git-author-guard.sh`** — verifies commit author identity after every commit; surfaces a `git commit --amend --reset-author` fix on mismatch.
- **Auto-review on Stop** — after every coding turn, a review sub-agent scans the uncommitted diff. If it finds **P0 (security / PII / secrets)** or **P1 (convention violations)**, it shows the list and offers:
  1. **Fix all now** — Claude resolves every P0/P1 before stopping.
  2. **Fix selected** — checkbox list, you pick.
  3. **Skip** — Claude stops; the list is yours to act on.

P2 (style / naming) and doc-only diffs don't trigger the prompt. To disable, remove the second entry under `Stop` in `.claude/settings.json`.

---

## Commit & PR conventions

- **Conventional Commits** are enforced by `commitlint` + `husky/commit-msg`.
- Allowed types: `feat`, `fix`, `security`, `compliance`, `perf`, `refactor`, `docs`, `style`, `test`, `build`, `ci`, `chore`.
- **No `Co-Authored-By` trailer** — keep commits owned by the actual author.
- `pnpm exec lint-staged` runs on `pre-commit` from commit #2 onwards (the scaffold commit uses `--no-verify` because the CLI verifier already passed it).
- After every commit, verify identity: `git log -1 --format='%ae | %ce'`. The post-commit hook will flag mismatches.

Use `/bfsi-commit` to stage + commit with the right type chosen automatically.

---

## Using this as a boilerplate

When starting a new BFSI project from this repo:

1. **Clone, don't fork** (unless your org standard says otherwise):
   ```bash
   git clone --depth 1 https://github.com/<your-org>/bfsi-boilerplate.git my-new-app
   cd my-new-app
   rm -rf .git && git init
   ```
2. **Rename** the project in `package.json` (`name`) and update `CLAUDE.md` with project-specific context (stack details that differ, where the backend lives, ticket tracker links).
3. **Set the upstream remote**:
   ```bash
   git remote add origin https://github.com/<your-org>/<new-repo>.git
   ```
4. **Replace `.env.local.sample`** with the variables your new backend actually needs — keep the Zod schema in `src/env.ts` in sync.
5. **Replace the `login` feature** with your real auth flow, but **keep the folder shape** (`services.ts` / `hooks/` / `types.ts` / `utils.ts` / `components/` / `__tests__/`).
6. **Run `/bfsi-doctor`** to confirm hooks, skills, and agents are all wired up locally.
7. **First feature**: use `/bfsi-feature` to scaffold it. Set the canonical pattern, commit it, then build the rest of the batch in fresh sessions primed off those commits (per the working discipline in `CLAUDE.md`).

> Treat the conventions in `CLAUDE.md` and `.claude/` as the contract. Updates to the boilerplate should be PR'd back here so every BFSI project benefits.

---

## Gotchas

- `.env.local` is gitignored. If the app fails at boot with a Zod error, copy `.env.local.sample` → `.env.local` and fill in real values.
- `src/components/ui/` is shadcn-managed. Add components via `pnpm dlx shadcn-ui@latest add <component>` — don't hand-author there.
- Dev server enforces tight security headers (`X-Frame-Options: DENY`, etc.). If iframe embedding fails in dev, that's why.
- ESLint runs with `--max-warnings 0`. Warnings fail CI — fix them as they appear.
- **Husky** is wired with `git config core.hooksPath .husky`. If hooks stop firing, check that config first.
- **Fabricated imports are blocked** by `no-fabrication-guard.sh`. If you see it fail, the symbol doesn't exist — grep `node_modules/<scope>/<pkg>/` to find the real name (or read `src/lib/<area>/index.ts`).
- **Skill-mandated files can't be deleted by `rm` / `git rm`.** Edits are fine; deletions require an explicit override (surface it in conversation first).

---

## License

Internal — for use within the organisation. See your team lead for distribution policy.
