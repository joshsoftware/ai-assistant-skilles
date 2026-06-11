---
name: bfsi-onboarding
description: Onboards a new developer to a BFSI project scaffolded from this starter. Explains the project structure, key conventions, how features are organised, where security primitives live, and how the Claude toolkit assists day-to-day work. Use when the user is new to the codebase and asks "how does this project work", "where do I start", "give me an overview", "what's the architecture", or "how do I add a feature".
---

# BFSI Project Onboarding

You are explaining a BFSI React project to a developer who is new to it. Be concise but thorough. Adapt depth based on their background (ask once if unclear: "Are you new to React, or new to this specific BFSI starter?").

## The project at a glance

This project was scaffolded from `@react-vault/react-starter`. It's a **Vite + React + TypeScript SPA** with security, PII, and compliance primitives wired in by default.

Stack:

- **React 19** + **Vite 5** + **TypeScript strict**
- **Tailwind CSS** + **shadcn/ui** (components owned in `src/components/ui/`)
- **React Hook Form** + **Zod** for forms
- **TanStack Query** for server state + **Zustand** for client state
- **react-router-dom v6** with `<ProtectedRoute>` + `<CanAccess>` guards
- **react-i18next** for i18n (en + hi default)
- **Vitest** + **Testing Library** + **Playwright**

## Where things live

```
src/
├── app/                    # App.tsx, providers, root layout
├── features/<Feature>/     # ALL feature code lives here (api, containers, components, tests)
├── routes/                 # Route config, ProtectedRoute, CanAccess
├── shared/                 # Cross-feature components (ErrorBoundary, NotFound)
├── i18n/                   # react-i18next setup + translations
├── env.ts                  # Zod-validated env vars
└── main.tsx                # Entry point
```

Security & PII primitives come from two workspace packages (npm scope `@<scope>` — `@react-vault` by default, swappable for white-label deployments):

- `@<scope>/core` — `encryption/`, `pii/`, `http/`, `auth/`, `storage/`, `compliance/`. Sub-path imports for tree-shaking: `import { aesgcm } from '@/lib/encryption'`.
- `@<scope>/ui` — `PIIMaskedDisplay` (ships today). Planned in v0.2: `<PCITokenizedCardInput>`, `<BFSIErrorBoundary>`, `<ConfirmModal>`, `<SecureFormField>`. Until then, write project-local equivalents under `src/shared/` and flag plain card inputs in review.

## Day-to-day workflows

### Adding a new feature

Use `/bfsi-feature MyFeature` — generates the full directory.

### Adding an endpoint

Use `/bfsi-api-endpoint GET /my-resource --feature MyFeature` — adds typed endpoint.

### Adding a form

Use `/bfsi-form MyForm --fields "pan:string,amount:number"` — generates RHF + Zod form with BFSI defaults.

### Masking a PII field in display

Use `/bfsi-pii-field pan user.pan` — wraps with `<PIIMaskedDisplay>`.

### Before a PR

Run `/bfsi-compliance-check` — runs OWASP + RBI + PCI checklist over the diff.
Optionally run `/bfsi-review` — spawns full multi-agent review.

### Committing

Use `/bfsi-commit` — generates a Conventional Commits message.

## Critical conventions

1. **Container-component split**: containers hold side-effects (API calls, dispatch, navigation), components are pure JSX.
2. **Network shapes are TypeScript interfaces** (`types.ts`, compile-time). Zod validates form input (`utils.ts`) + env (`env.ts`) only — API responses are NOT runtime-validated by default.
3. **All routes are protected**: `<ProtectedRoute permission="...">`. Defaults to authenticated-only if `permission` omitted, but explicit is better.
4. **PII never enters localStorage**: use `secureStorage` from `@<scope>/core/storage` (memory-first, sessionStorage fallback, encrypted IndexedDB option).
5. **No card data in HTML inputs**: `<PCITokenizedCardInput>` is planned for `@<scope>/ui` v0.2. Until then, flag any plain card input in review and keep card capture off the SPA where possible (redirect to PCI-scoped iframe).
6. **No `any` types**: types flow from Zod schemas.
7. **All user-facing strings via `t()`**: never inline. Even error messages.
8. **Conventional Commits with BFSI types**: see `/bfsi-commit`. `security` and `compliance` are extra types beyond standard set.

## The Claude toolkit

The `.claude/` directory in this project carries the BFSI toolkit's agents, skills, commands, and hooks — inlined at scaffold time (so it works offline, no plugin install needed). Run `/hooks` to see registered hooks (file protection, secret scanner, formatter, PII scanner, etc.). Run `/agents` to see the BFSI agents. Run `/bfsi-doctor` to verify everything's wired up.

Hooks may block you from:

- Editing `.env*`, `*.pem`, `credentials.json`, `.git/` files
- Running `rm -rf`, `git push --force` on protected branches
- Writing files that contain secret patterns (API keys, tokens)
- Writing files that introduce PII patterns into logs

These are not personal — they protect every dev from a class of mistake that's expensive in BFSI.

## Getting unstuck

- Architecture questions → ask `bfsi-architect` agent (`@bfsi-architect how should I structure ...`)
- Security questions → ask `bfsi-security-reviewer`
- Performance questions → ask `bfsi-performance-reviewer`
- Test patterns → look at `bfsi-test-pattern` reference skill (it'll auto-load when you ask)
- Stuck on an error → look at `bfsi-error-message` reference skill

## What NOT to do (common pitfalls)

- ❌ Don't put PII in URL search params.
- ❌ Don't trust client-side permission checks alone — backend re-checks every API call.
- ❌ Don't use `localStorage` for tokens. Use the auth module's storage strategy.
- ❌ Don't use `dangerouslySetInnerHTML` without sanitisation.
- ❌ Don't write your own crypto — use `@/lib/encryption`.
- ❌ Don't commit to `main` directly — always via PR.
