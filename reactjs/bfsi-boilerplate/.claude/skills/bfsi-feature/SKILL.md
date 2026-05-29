---
name: bfsi-feature
description: Scaffolds a new BFSI feature module with the full directory structure (services, hooks, schema, components, routes, tests, i18n keys) wired for TanStack Query. Use when the user types /bfsi-feature, asks to "scaffold a feature", "create a new feature module", "add a CRUD page", or "start a new BFSI module".
disable-model-invocation: true
argument-hint: <feature-name> [--no-i18n]
allowed-tools: Read Write Edit Glob Grep Bash(mkdir:*) Bash(node:*)
---

# BFSI Feature Scaffold

Generates a complete feature module under `src/features/<FeatureName>/` following the BFSI architecture: container-component split, TanStack Query API layer, Zod validation, accessible UI, i18n keys.

## Arguments

- `$0` — feature name in PascalCase (e.g. `KycVerification`, `LoanApplication`, `Transactions`). **Required.**
- `--no-i18n` — skip i18n key generation.

## What gets generated

```
src/features/<FeatureName>/
├── services.ts                     # Typed axios calls (POST/GET/...) per endpoint
├── schema.ts                       # Zod schemas (request, response, form)
├── types.ts                        # Inferred TS types from Zod
├── constants.ts                    # API URLs, cache tags
├── routes.tsx                      # Feature routes with <ProtectedRoute>
├── containers/
│   ├── <FeatureName>List.tsx       # Container: data + handlers
│   └── <FeatureName>Form.tsx       # Container: form state
├── components/
│   ├── <FeatureName>Table.tsx      # Presentational: receives props
│   ├── <FeatureName>FormFields.tsx # Presentational: form fields
│   └── <FeatureName>Actions.tsx    # Action buttons
├── hooks/
│   └── use<FeatureName>.ts         # Thin useQuery / useMutation wrappers
├── utils/
│   └── mappers.ts                  # snake_case ↔ camelCase, value mappers
├── __tests__/
│   ├── containers.test.tsx
│   ├── schema.test.ts
│   └── e2e.spec.ts                 # Playwright
└── index.ts                        # Barrel export
```

Plus updates to:

- `src/routes/index.tsx` — registers the new feature routes via `React.lazy()` (route-level code splitting; the file's existing `<Suspense>` boundary covers all routes). Drop the route under `<AppLayout>` (authenticated) or `<PublicLayout>` (public). See `bfsi-perf-react` and `src/layouts/` for the rationale.
- `src/constants/routes.ts` — adds the path to `ROUTES`.
- `src/constants/endPoints.ts` — adds the feature's API endpoint block (if any).
- `src/i18n/translations/en.json` — adds `<feature>.*` namespace.
- `src/i18n/translations/hi.json` — placeholder keys (translator fills in).

Feature pages **must not** add their own `<main>` element — the parent layout owns the page landmark.

## Workflow

### Step 1: Validate inputs

Confirm:

- `$0` is PascalCase (regex `^[A-Z][A-Za-z0-9]+$`).
- The feature directory does NOT already exist.
- A `package.json` exists at the project root.

If validation fails, exit and tell the user what to fix.

### Step 2: Run the scaffold script

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/bfsi-feature/scripts/scaffold.mjs $0
```

The script writes all files using the templates in `references/templates/`.

### Step 3: Verify

After generation:

1. Run `pnpm typecheck` and report any errors.
2. Run `pnpm lint` on the new files only.
3. Read the generated `routes.tsx` and confirm it's registered.

### Step 4: Summarise

Output a short summary to the user:

- N files created
- Routes registered: `/<feature>` and `/<feature>/:id`
- Next step suggestion: "Run `pnpm dev` and visit /<feature> to see the empty list. Then add fields to `schema.ts`."

## Conventions enforced

- **No `any` types.** All types flow from Zod schemas via `z.infer<>`.
- **No hardcoded strings.** All user-facing strings go through `t()` (or `<Trans>`).
- **Sensitive fields get `<PIIMaskedDisplay>` wrappers** by default if their names match `/^(pan|aadhaar|account|mobile|email|dob)$/i`.
- **All routes are `<ProtectedRoute>`** with an explicit `permission` prop.
- **All forms use `useForm` + `zodResolver`** (from `react-hook-form` and `@hookform/resolvers/zod`) wired into shadcn/ui's `<Form>` primitive. See the `bfsi-form` skill for the canonical wiring.

## Examples

### Create a KYC feature

```
/bfsi-feature KycVerification
```

Result: `src/features/KycVerification/` populated. PAN, Aadhaar, address fields auto-wrapped with PIIMaskedDisplay. Routes `/kyc-verification` and `/kyc-verification/:id` registered with `permission="kyc.view"`.

## References

- Full file templates: [`references/templates/`](references/templates/)
- BFSI architecture rationale: [`references/architecture.md`](references/architecture.md)
