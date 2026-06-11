---
name: bfsi-protected-route
description: Wraps a route definition with `<ProtectedRoute permission="...">` (and optionally `<CanAccess>` for inline gating). Infers permission from path or feature name; verifies the route is registered in `src/routes/`. Use when the user types /bfsi-protected-route, asks to "protect this route", "add a permission to /foo", "guard the admin page", or "make this route role-gated".
disable-model-invocation: true
argument-hint: <route-path> [--permission <key>] [--feature <FeatureName>]
allowed-tools: Read Edit Glob Grep
---

# BFSI Protected Route

Wraps a route with `<ProtectedRoute permission="...">` from the project-local `src/routes/`. Every non-public route must carry an explicit permission string — defaulting to authenticated-only is a smell that the dev should choose between "any signed-in user" and a specific permission.

## Arguments

- `$0` — route path (e.g. `/kyc`, `/admin/audit-export`). **Required.**
- `--permission <key>` — explicit permission string (e.g. `kyc.view`, `audit.export`). If omitted, inferred from path.
- `--feature <FeatureName>` — feature module that owns the route. If omitted, inferred.

## What it does

Given a route element in `src/routes/index.tsx` or a feature's `routes.tsx`:

```tsx
const KycList = lazy(() => import('../features/Kyc/index.js'));
// ...
<Route path="/kyc-verification" element={<KycList />} />
```

Replaces with:

```tsx
<Route
  path="/kyc-verification"
  element={
    <ProtectedRoute permission="kyc.view">
      <KycList />
    </ProtectedRoute>
  }
/>
```

> Page components are imported via `React.lazy()` per the boilerplate's
> route-level code-splitting convention — see `bfsi-perf-react`. The
> `<Suspense>` boundary already wraps `<Routes>` in
> [src/routes/index.tsx](../../../src/routes/index.tsx), so no extra
> `<Suspense>` is needed at the wrap site.

> Authenticated routes live inside `<AppLayout>` (shared chrome); public
> routes inside `<PublicLayout>`. The layouts are **chrome only** — per-route
> permission still belongs at the leaf via `<ProtectedRoute permission="...">`
> so a reviewer can grep every guarded entry-point. See
> [src/layouts/](../../../src/layouts/).

And, if `<CanAccess>` is needed for inline conditional UI inside the page:

```tsx
<CanAccess permission="kyc.export">
  <ExportButton />
</CanAccess>
```

## Workflow

### Step 1 — Locate the route

Grep `src/routes/` and any `src/features/*/routes.tsx` for the path. If multiple matches, ask the user which file to modify.

### Step 2 — Resolve the permission key

If `--permission` was provided, use it. Otherwise infer from path segments:

| Path prefix             | Default permission                                 |
| ----------------------- | -------------------------------------------------- |
| `/admin/*`              | `admin.<segment>` (e.g. `admin.users`)             |
| `/kyc*`                 | `kyc.view` (for list/detail), `kyc.submit` (forms) |
| `/transactions*`        | `transactions.view`                                |
| `/audit*`               | `audit.view`                                       |
| `/profile`, `/settings` | `self.profile` (always-on for authenticated users) |
| anything else           | ask the user; do NOT guess                         |

Naming convention: `<feature>.<action>` — lowercase, dot-separated. Consistent with `src/routes/permissions.ts` if it exists.

### Step 3 — Verify the import

Confirm `ProtectedRoute` (and `CanAccess` if used) is imported in the target file. If not, add:

```tsx
import { ProtectedRoute } from '@/routes/ProtectedRoute';
// import { CanAccess } from '@/routes/CanAccess'; // if needed
```

### Step 4 — Apply the wrap + verify

Edit the route element. Run `npm run typecheck` on the changed file.

### Step 5 — Register the permission

If the project has a permissions catalog (`src/routes/permissions.ts` or `src/constants/permissions.ts`), add the new key if missing. If no catalog exists, surface a suggestion: "Consider creating `src/constants/permissions.ts` so permissions aren't string-typed across the codebase."

## Conventions enforced

- **Every non-public route is `<ProtectedRoute>`.** No exceptions for "we'll add it later."
- **Every `<ProtectedRoute>` has an explicit `permission` prop.** Authenticated-only routes still get a permission (e.g. `self.profile`) so an audit reviewer can grep every guarded entry-point.
- **Permission strings are lowercase, dot-separated** (`kyc.view`, not `KYC_VIEW`).
- **Backend re-checks the same permission** — client-side `<ProtectedRoute>` is a UX guard, not the security boundary. Mention this to the user if they're new to the pattern.

## When NOT to use

- **Truly public routes** (login, marketing, public verification status) — these stay un-wrapped, but should still live under a `<PublicRoute>` wrapper if the project has one (signals intent).
- **Layout routes** with no rendered page (use the child elements' guards).

## References

- `src/routes/ProtectedRoute.tsx` — the project-local guard component (shipped in template).
- `src/routes/permissions.ts` (if present) — central permission catalog.
- RBI Annexure I §8 (User Access Control / Management) — the regulatory backstop for this convention. Full text: [`../../references/rbi-annexure-i.md`](../../references/rbi-annexure-i.md). (Note: §3 in Annex I is _Environmental Controls_, not logical access.)
