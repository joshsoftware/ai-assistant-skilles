---
name: bfsi-bootstrap
description: Generate the COMPLETE BFSI React boilerplate foundation from scratch inside a fresh Vite + React + TypeScript app — dependencies (npm), tooling config, folder structure, security/PII/HTTP/i18n primitives, routing, layouts, and the login reference feature. Use after create_react_project.sh / `npm create vite`, or when the user says "set up the boilerplate", "bootstrap this project", "initialize this project", "build the foundation", "scaffold the BFSI starter". Builds the FOUNDATION only — never business features (that is /bfsi-feature). Uses npm, not pnpm.
---

# BFSI Boilerplate Bootstrap

You are generating the **complete BFSI React boilerplate** inside a project that
currently contains only a bare `npm create vite` (react-ts) app plus this
`.claude/` toolkit. Nothing was cloned from a starter repo — you build the
foundation from this specification, leaning on the sibling skills for each
layer's detailed pattern.

This is the React analogue of Flutter's `project-bootstrap` skill: turn a bare
app into a production-ready, convention-locked foundation — **and stop there**.

## Ground rules

1. **npm, never pnpm.** Every command, every doc you write, every script in
   `package.json`. There is no workspace — this is a single npm package; do not
   create `pnpm-workspace.yaml` or `@<scope>/core` workspace packages. Shared
   code lives under `src/lib/*` and is imported via the `@/` path alias.
2. **Follow the sibling skills as the source of truth** for each layer (named
   per step). Prefer their patterns over inventing new ones. If one of them
   shows a pnpm command, substitute the npm equivalent.
3. **Foundation only.** See "Output discipline" — do NOT build dashboards, KYC,
   profile, or any business feature. The only feature you create is the `login`
   reference.
4. **Grep before you reference.** Never import a symbol you haven't confirmed
   exists (the `bfsi-no-fabrication` skill).

## Prerequisites (verify, then proceed)

- A bare Vite react-ts app exists (`index.html`, `src/main.tsx`, `vite.config.ts`).
- `.claude/` toolkit is present (run `/bfsi-doctor` later to confirm wiring).
- `npm` is available.

Ask the user for: the **human-readable project name** and the **API base URL**
(or confirm a placeholder for `.env.local`). Don't invent backend details.

---

## Step 1 — Install the BFSI dependency set (npm)

The vite template already ships react, react-dom, typescript, vite, eslint.
Add the rest, version-pinned:

```bash
npm install \
  react-router-dom@6.30.3 react-hook-form@7.76.1 @hookform/resolvers@3.3.4 \
  zod@3.23.6 react-i18next@14.1.1 i18next@23.11.3 axios@1.16.1 date-fns@3.6.0 \
  lucide-react@1.17.0 clsx@2.1.1 tailwind-merge@2.3.0 class-variance-authority@0.7.0 \
  @tanstack/react-query@5.100.14 @tanstack/react-query-devtools@5.100.14 zustand@5.0.14

npm install -D \
  @types/node@20.11.30 @vitejs/plugin-react-swc@4.3.1 \
  @testing-library/react@16.3.2 @testing-library/user-event@14.5.2 \
  @testing-library/jest-dom@6.9.1 @playwright/test@1.60.0 \
  @commitlint/cli@21.0.0 @commitlint/config-conventional@21.0.0 \
  @eslint/js@9.39.4 typescript-eslint@8.60.0 eslint-config-prettier@10.1.8 \
  eslint-plugin-jsx-a11y@6.10.2 eslint-plugin-react@7.37.5 \
  eslint-plugin-react-hooks@7.1.1 eslint-plugin-react-refresh@0.5.2 globals@17.6.0 \
  autoprefixer@10.4.19 postcss@8.4.38 tailwindcss@3.4.3 tailwindcss-animate@1.0.7 \
  husky@9.0.11 lint-staged@15.2.2 jsdom@24.0.0 prettier@3.2.5 \
  vitest@3.2.4 @vitest/coverage-v8@3.2.4 rollup-plugin-visualizer@5.12.0
```

Set `package.json` `name` to the project name and these scripts:

```json
"type": "module",
"scripts": {
  "dev": "vite",
  "build": "tsc --noEmit && vite build",
  "preview": "vite preview",
  "analyze": "vite build",
  "lint": "eslint . --report-unused-disable-directives --max-warnings 0",
  "lint:fix": "eslint . --fix",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "format": "prettier --write \"src/**/*.{ts,tsx,json,md,css}\"",
  "prepare": "husky"
}
```

Add a `lint-staged` block: `*.{ts,tsx,js,jsx}` → `prettier --write` + `eslint --fix`;
`*.{json,md,yml,yaml,css}` → `prettier --write`.

---

## Step 2 — Tooling config

Write these (use the real boilerplate's known-good settings):

- **`tsconfig.json`** — strict. `target`/`lib` ES2022, `module` ESNext,
  `moduleResolution` Bundler, `jsx` react-jsx, `noEmit`, **all** strict flags on
  (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`,
  `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`,
  `useUnknownInCatchVariables`, `forceConsistentCasingInFileNames`), and
  `paths: { "@/*": ["./src/*"] }`, `types: ["vite/client", "node"]`,
  `include: ["src", "tests"]`. Add `tsconfig.node.json` for the vite config.
- **`vite.config.ts`** — import `defineConfig` from `vitest/config`, plugin
  `@vitejs/plugin-react-swc`, alias `@` → `./src`, dev server `port 5173`
  `strictPort` `host localhost` with security headers (`X-Content-Type-Options:
  nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy: geolocation=(), camera=(), microphone=()`), build
  `target es2022`, `sourcemap`, manualChunks (react / forms / i18n), and a
  `test` block (`environment: jsdom`, `setupFiles: ['./tests/setup.ts']`,
  `globals: true`). Gate the `rollup-plugin-visualizer` on
  `process.env.npm_lifecycle_event === 'analyze'`.
- **`tailwind.config.ts`** + **`postcss.config.cjs`** (tailwindcss + autoprefixer),
  `tailwindcss-animate` plugin, content globs over `index.html` + `src/**`.
- **`eslint.config.js`** — flat config: `@eslint/js` recommended +
  `typescript-eslint` + react / react-hooks / jsx-a11y / react-refresh +
  `eslint-config-prettier`. Runs with `--max-warnings 0`.
- **`.prettierrc`**, **`commitlint.config.cjs`** (extends
  `@commitlint/config-conventional`, plus BFSI types — see Conventions),
  **`.gitignore`** (node_modules, dist, `.env.local`, coverage),
  **`tests/setup.ts`** (`@testing-library/jest-dom`), **`index.html`**.
- **`.env.local.sample`** — every `VITE_*` var the env schema validates (Step 4).
  Copy it to `.env.local` and tell the user to fill real values. Never rename
  `.env.local.sample` (a hook enforces this).

---

## Step 3 — Husky + lint-staged (npm)

```bash
npx husky init
```

- `.husky/pre-commit` → `npx lint-staged`
- `.husky/commit-msg` → `npx --no -- commitlint --edit "$1"`
- After `git init`, run `git config core.hooksPath .husky`.

The initial scaffold commit may use `--no-verify` (the tree is freshly
typechecked + tested); every commit after runs the hooks.

---

## Step 4 — Folder structure

Create this tree under `src/`:

```
src/
├── app/                    App.tsx, globals.css
├── api/                    axiosInstance.ts, http.ts, queryClient.ts
├── assets/                 logo + README.md (asset-location convention)
├── components/
│   ├── bfsi/               PIIMaskedDisplay.tsx + index.ts
│   ├── common/             FormInput.tsx, Image.tsx
│   └── ui/                 (shadcn-managed; added via `npx shadcn-ui@latest add`)
├── constants/              endPoints.ts, statusCodes.ts, routes.ts (+ regex/queryKeys as needed)
├── features/login/         services.ts, hooks/, types.ts, utils.ts, components/, __tests__/
├── i18n/                   i18n.ts, translations/en.json, translations/hi.json
├── layouts/                PublicLayout.tsx, AppLayout.tsx, index.ts
├── lib/
│   ├── encryption/         aesgcm, rsaoaep, pbkdf2, envelope, util, index
│   ├── http/               createAxios.ts, interceptors.ts, errors.ts, index.ts
│   ├── pii/                patterns.ts, maskers.ts, validators.ts, index.ts
│   └── utils/              cn.ts
├── routes/                 ProtectedRoute.tsx, index.tsx
├── shared/                 ErrorBoundary.tsx
├── env.ts
└── main.tsx
```

---

## Step 5 — Foundational modules (delegate to sibling skills)

Build these in order. Where a skill owns the pattern, **load and follow it**.

1. **`src/env.ts`** — Zod-validated env, throws at boot. Schema:
   `VITE_API_BASE_URL` (url), `VITE_API_TIMEOUT_MS` (coerce number, default
   30000), `VITE_AUTH_HEADER_NAME` (default 'Authorization'),
   `VITE_SENTRY_DSN` (optional), `VITE_IDLE_TIMEOUT_MS` (default 900000),
   `VITE_SENSITIVE_IDLE_TIMEOUT_MS` (default 300000),
   `VITE_FEATURE_FLAGS_PROVIDER` (enum local|growthbook|unleash, default local).
   Export `env` (parsed) and `type Env`.
2. **`src/lib/http/`** + **`src/api/axiosInstance.ts`** + **`src/api/http.ts`** —
   follow the **`axios-auth`** skill: single axios instance from `createAxios()`,
   in-memory token via `setAuthToken(axios, token)` (NEVER localStorage),
   response interceptor for notifications + 401 → login redirect, typed
   `GET/POST/PUT/PATCH/DELETE` helpers returning `response.data` as `TResponse`,
   generic order `<TRequest, TResponse>`.
3. **`src/api/queryClient.ts`** + **`src/main.tsx` providers** — follow the
   **`query-client-setup`** skill: QueryClient defaults, retry/refetch policy,
   devtools. `main.tsx` wraps the app in `QueryClientProvider` + i18n + router +
   `ErrorBoundary`.
4. **`src/lib/pii/`** + **`src/components/bfsi/PIIMaskedDisplay.tsx`** — PII
   patterns (PAN, Aadhaar, account), maskers, validators; `<PIIMaskedDisplay>`
   for rendering PII. Never render PAN/Aadhaar/account directly.
5. **`src/lib/encryption/`** — AES-GCM, RSA-OAEP, PBKDF2, envelope helpers over
   Web Crypto (the **`bfsi-encrypt-helper`** skill documents the API). Don't roll
   custom crypto elsewhere.
6. **`src/lib/utils/cn.ts`** — `clsx` + `tailwind-merge`.
7. **`src/constants/`** — follow **`constants-organization`**: `endPoints`
   (`Object.freeze`, base-URL prefix), `statusCodes`, `routes`. Add
   `queryKeys` / `regex` files when first needed.
8. **`src/i18n/`** — react-i18next setup, `en` + `hi`, one namespace per feature.
   All user-facing strings go through `t()`.
9. **`src/routes/ProtectedRoute.tsx`** + **`src/routes/index.tsx`** — every route
   is `<ProtectedRoute permission="...">`; code-split leaves via `React.lazy`.
10. **`src/layouts/`** — `PublicLayout` (login/public) + `AppLayout`
    (authenticated chrome + logout) composing via `<Outlet />`. Layouts are
    chrome only; permission stays at the leaf.
11. **`src/shared/ErrorBoundary.tsx`** — safe error UI (the **`bfsi-error-message`**
    skill: no stack traces / PII / SQL to the user or telemetry).
12. **`src/app/App.tsx`** + **`globals.css`**, **`src/assets/README.md`** (the
    **`bfsi-asset-location`** convention: binary assets live under `src/assets/`).

If app-wide client state is needed later, use the **`bfsi-zustand-store`** skill
(`src/stores/`) — don't add a store pre-emptively.

---

## Step 6 — The `login` reference feature

This is the **only** feature you create — it's the canonical pattern every later
feature is primed from. Follow **`tanstack-services`** (services + hooks),
**`bfsi-form`** (RHF + Zod login form), and **`testing-patterns`** (tests). Keep
the folder shape exact:

```
features/login/
├── services.ts        # loginService(p: ILoginRequest): Promise<ILoginResponse>
├── hooks/useLogin.ts   # useMutation wrapper; setAuthToken in onSuccess
├── types.ts            # ILoginRequest / ILoginResponse (TS interfaces)
├── utils.ts            # loginSchema (Zod); type via z.infer
├── index.tsx           # container: wires hook + form + navigation
├── components/LoginForm.tsx
└── __tests__/          # services, hook, form, utils tests
```

Token handling: call `setAuthToken(axiosInstance, token)` in the mutation's
`onSuccess`. The token lives in memory only.

---

## Step 7 — Project docs + verify

1. Generate a **`CLAUDE.md`** at the project root describing the stack, the npm
   commands (`npm run dev`, `npm test`, `npm run lint`, `npm run typecheck`,
   `npm run build`), the critical conventions, and where things live. **Use npm
   throughout — no pnpm.**
2. Run **`/bfsi-doctor`** and resolve anything it flags (hooks, skills, agents,
   `.claude/settings.json` `$schema`).
3. `git init`, set `core.hooksPath .husky`, and make the initial scaffold commit
   (Conventional Commits, BFSI type `chore` or `build`; `--no-verify` allowed for
   this first commit only).

---

## Conventions to bake in (DO NOT violate)

1. Tokens never in `localStorage` — in-memory via `setAuthToken`.
2. PII fields display via `<PIIMaskedDisplay>` — never raw PAN/Aadhaar/account.
3. No card data in HTML inputs.
4. All routes `<ProtectedRoute permission="...">` with explicit permission strings.
5. No `dangerouslySetInnerHTML` unless sanitised.
6. No `console.log` of PII (PAN, Aadhaar, account, password, OTP).
7. Network request/response shapes are **TypeScript interfaces** in `types.ts`
   (compile-time); **Zod** validates form input (`utils.ts`) + env (`env.ts`).
   Responses are NOT runtime-validated by default — don't silently add `.parse()`.
8. No `any`. All user-facing strings via `t()`.
9. Conventional Commits with BFSI types: `feat fix security compliance perf
   refactor docs style test build ci chore`. No `Co-Authored-By` trailer.

## Project priorities

Security → Scalability → Clean Architecture → Testability → Maintainability.

---

## Output discipline

Build the **foundation + the `login` reference feature only**.

Do NOT create: dashboard, profile, KYC, payments, or any other business feature;
extra routes/services/stores beyond what the foundation needs.

Feature generation belongs to `/bfsi-feature` and the scaffolding skills.

## After bootstrap

Tell the user:

> Foundation ready. Scaffold your first feature with `/bfsi-feature <FeatureName>`,
> set the canonical pattern, commit it, then build the rest of the batch in fresh
> sessions primed off that commit. Run `npm run dev` to start the app.
