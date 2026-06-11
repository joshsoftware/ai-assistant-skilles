---
name: bfsi-route-constant
description: Promotes a frontend route path into `src/constants/routes.ts` under `ROUTES`, then rewires every inline string usage (Route path=, navigate(), <Navigate to=, anchor href=, window.location.href=, MemoryRouter initialEntries) to reference the constant. Use when the user types /bfsi-route-constant, asks to "add a route", "move /foo into ROUTES", "promote this path to ROUTES", "centralise route strings", or after they accept a route inline and you spot it.
disable-model-invocation: true
argument-hint: <route-key-path> <url-path> [--feature <FeatureName>]
allowed-tools: Read Write Edit Glob Grep Bash
---

# BFSI Route Constant

Promotes a UI route path to the centralised `ROUTES` map and updates every call-site that referenced the literal string. Frontend route paths must never live inline — `constants-organization` covers the *why*; this skill automates the *how*.

Pair with `/bfsi-protected-route` when the new path needs `<ProtectedRoute permission="...">`.

## When to use

- Adding a new top-level page (`/billing`, `/settings`).
- Adding a new view inside an existing feature (`/billing/invoice/:id`).
- Cleaning up an inline path the codebase has been referencing as a string.

## Inputs

| Argument | Example | Notes |
|----------|---------|-------|
| `<route-key-path>` | `billing.invoice` | Dot-path into `ROUTES`. Multi-view features get a nested object; top-level pages use a flat key (`home`, `login`). |
| `<url-path>` | `/billing/invoice/:id` | The actual react-router path. Params (`:id`) allowed. |
| `--feature <Name>` | `--feature Billing` | Optional. Narrows the rewire grep to that feature folder when you don't want to touch unrelated files. |

## What it does

1. **Insert into `ROUTES`** at the requested dot-path. Creates nested objects as needed. Refuses (and surfaces a conflict) if the key already exists with a different value.

2. **Grep `src/` for every inline usage** of the literal URL across:
   - `<Route path="...">`
   - `navigate('...')` / `<Navigate to="...">`
   - Anchor `href="..."`
   - `window.location.href = '...'`
   - `<MemoryRouter initialEntries={[...]}>`

3. **Rewire each match** to `ROUTES.<key>`, adding `import { ROUTES } from '@/constants/routes'` where needed.

4. **Verify** with `npm run typecheck`. If any usage can't be auto-rewired (computed paths, template strings with interpolation, third-party config), the skill surfaces a list for manual review rather than silently skipping.

## Example

```
/bfsi-route-constant billing.invoice /billing/invoice/:id --feature Billing
```

Result in [routes.ts](../../../src/constants/routes.ts):

```ts
export const ROUTES = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  billing: {
    invoice: '/billing/invoice/:id', // ← added
  },
  notFound: '*',
} as const;
```

Every prior literal `'/billing/invoice/...'` is replaced with `ROUTES.billing.invoice` (or the builder, for dynamic paths — see below).

## Dynamic paths

For `:id`-style paths, the skill emits BOTH the template (for `<Route path>`) and a builder (for `navigate()`):

```ts
billing: {
  invoice: '/billing/invoice/:id',
  invoiceFor: (id: string) => `/billing/invoice/${id}`,
},
```

Usage:

```tsx
<Route path={ROUTES.billing.invoice} ... />
navigate(ROUTES.billing.invoiceFor(invoiceId));
```

## Conventions enforced

- ❌ NEVER write a literal route path outside `routes.ts`.
- ❌ NEVER duplicate a path that already exists in `ROUTES` — the skill detects and reuses.
- ❌ NEVER list a UI route in `src/constants/endPoints.ts` — that file is for backend API URLs only. The UI route and the API endpoint may share a name but live in different files.
- ✅ Multi-view features → nested object; top-level pages → flat key.
- ✅ `as const` on the whole map so values are literal-typed.
- ✅ Dynamic paths ship both a template and a builder, side-by-side.

## Verification check

After running the skill, this should return ONLY `routes.ts`:

```bash
grep -rnE "(path|to|href|location\.href)\s*=\s*['\"]/" src/ --include='*.ts' --include='*.tsx' \
  | grep -v 'constants/routes'
```

A non-empty result means an inline path was missed — surface it and fix.

## Where this fits

- **Reference**: `constants-organization` — broader rules on where each kind of constant lives.
- **Action neighbours**: `bfsi-api-endpoint` (endpoint URLs in `endPoints.ts`), `bfsi-protected-route` (wraps a route in the auth guard).
- **Anti-pattern hook**: there is no dedicated PreToolUse hook for inline routes (yet). The Stop-hook review gate flags them as P1.
