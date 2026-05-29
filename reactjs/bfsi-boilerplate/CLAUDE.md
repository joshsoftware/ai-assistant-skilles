# CLAUDE.md — `bfsi-boilerplate`

BFSI React project scaffolded from `create-app`. This file is what Claude reads at session start, per the [Claude Code spec](https://code.claude.com/docs/best-practices).

## Stack (so you don't have to read configs)

- **React 19** + **Vite 5** + **TypeScript strict**
- **Tailwind CSS** + **shadcn/ui** (components owned in `src/components/ui/`)
- **React Hook Form** + **Zod** for forms
- **react-router-dom v6** with `<ProtectedRoute permission="...">` guards
- **react-i18next** (`en`, `hi` defaults)
- Data layer: **TanStack Query v5** (server state) + **Zustand v5** (client state)
- Tests: **Vitest** + **Testing Library**; E2E **Playwright**

## Bash commands

```bash
pnpm dev                # vite dev server on :5173
pnpm build              # tsc --noEmit && vite build
pnpm test               # vitest run
pnpm test:watch         # vitest watch
pnpm test:e2e           # playwright
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint, --max-warnings 0
pnpm format             # prettier write
```

## Critical conventions (DO NOT violate)

1. **Tokens never in `localStorage`.** Use `setAuthToken(axios, token)` from `@<scope>/core/http` at login — it lives in memory.
2. **All API responses go through Zod `.parse()`.** No raw types. See the `tanstack-services` skill.
3. **PII fields display via `<PIIMaskedDisplay>`.** Never render PAN/Aadhaar/account-number directly.
4. **No card data in HTML inputs.** Use `<PCITokenizedCardInput>` (v0.2 — for now, flag any plain card input).
5. **All routes are `<ProtectedRoute permission="...">`** with explicit permission strings (route to feature-permission mapping in `src/routes/`).
6. **No `dangerouslySetInnerHTML`** unless explicitly sanitised. Pre-write hook will block it.
7. **No `console.log` of PII variables** (PAN, Aadhaar, account, password, OTP). Post-write hook scans for this.
8. **Conventional Commits with BFSI types**: `feat`, `fix`, `security`, `compliance`, `perf`, `refactor`, `docs`, `style`, `test`, `build`, `ci`, `chore`. NO `Co-Authored-By` trailer.

## Working discipline (how to collaborate here)

These are hard-won rules from real delivery on this starter. They override
default "just get it done" instincts.

1. **Grep before you reference.** Never import a function/hook/component/env
   var you haven't confirmed exists — read the package's `index.ts` (or the
   file) first. Inventing `useAuditedMutation` / `useFormWithZod` cost real
   rework. The `bfsi-no-fabrication` skill auto-loads to remind you.
2. **Verify the backend before building against it.** Before a feature batch
   that touches unfamiliar endpoints, run the `bfsi-verify-backend` skill —
   confirm auth scoping, role enforcement, and response/error envelopes from
   the backend source, not from endpoint names. A soft-gated UI over an
   unenforced backend is UX only; say so and file a backend ticket.
3. **Surface mismatches as a question — don't silently bypass a skill.** If a
   skill's mandate seems wrong for the case, ask. Don't quietly route around
   it.
4. **Ask before deleting a skill-mandated file.** `api/axiosInstance.ts`,
   `api/queryClient.ts`, `routes/ProtectedRoute.tsx`, `i18n/i18n.ts`,
   `env.ts`, `main.tsx`, `app/App.tsx`, `shared/ErrorBoundary.tsx` are
   assumed to exist. A hook blocks `rm`/`git rm`/`mv` on them; if removal is
   genuinely right, explain why and get an explicit override.
5. **No "in-case" code, no narration comments.** Don't add abstractions,
   fallbacks, or `// added for X` / `// removed Y` comments for hypothetical
   futures. Lean and current.
6. **Rule of three.** Extract a shared helper/skill on the THIRD duplicate,
   not the second. Until then, leave a `// CONVENTION:` breadcrumb at the
   first site; `/bfsi-grep-conventions` surfaces the ledger when it's time to
   codify.
7. **Constants are exhaustive.** When you add an endpoint/route/tag, add it to
   the centralised constants file — no partial updates that leave half the
   surface inline.
8. **Fresh session per batch; patterns live in commits.** Set the canonical
   pattern in one feature, commit it, then build the rest of the batch in a
   fresh session primed off those commits. The conversation is disposable; the
   commits are the source of truth.
9. **Verify the commit author after every commit.** Run
   `git log -1 --format='%ae | %ce'` and confirm both match your configured
   identity before pushing. A PostToolUse hook (`git-author-guard.sh`) checks
   this automatically after each `git commit` and surfaces a mismatch with the
   `git commit --amend --reset-author` fix — but the habit is still yours.

## Where things live

```
src/
├── app/                    App.tsx, providers, globals.css
├── assets/                 logo, images, fonts, icons (Vite-hashed imports)
├── components/             bfsi/ (PII primitives), common/ (FormInput, Image), ui/ (shadcn)
├── constants/              endPoints / statusCodes / routes (+ queryKeys / regex / app as needed)
├── features/<Feature>/     ALL feature code: services/hooks/types/utils/components/tests
├── i18n/                   react-i18next setup + translations/en.json + hi.json
├── layouts/                PublicLayout + AppLayout (shared chrome via <Outlet />)
├── lib/                    encryption, http, pii, utils
├── routes/                 ProtectedRoute, route config (layouts nest routes here)
├── shared/                 Cross-feature components (ErrorBoundary, NotFound)
├── env.ts                  Zod-validated env (throws at boot on bad config)
└── main.tsx                Entry point
```

Data + feature layout:

- `src/api/` — `axiosInstance`, `http` (typed GET/POST/PUT/PATCH/DELETE helpers), `queryClient` (TanStack defaults).
- `src/constants/` — `endPoints` + `statusCodes` + `routes` (add `queryKeys` / `regex` / `app` files when first needed).
- `src/features/<feature>/` — `services.ts` + `hooks/` + `types.ts` + `utils.ts` (Zod) + `components/`.
- `src/components/common/` — `FormInput`, `Image` + other RHF/perf helpers.
- `src/layouts/` — `PublicLayout` (login, public pages) + `AppLayout` (authenticated chrome + logout). Per-route permission stays at the leaf via `<ProtectedRoute>`; layouts are chrome only.
- `src/assets/` — brand assets (logo, fonts, icons). See `src/assets/README.md` for the convention vs `public/`.
- `src/stores/` (created when the first app-wide Zustand store lands) — see `bfsi-zustand-store`.
- **Reference feature**: `src/features/login/`.

## Claude skills available

Run `/skills` or open `.claude/skills/<name>/SKILL.md` directly. Reference skills auto-load when relevant; action skills are invoked with `/<name>`.

**Always available** (from the toolkit): `/bfsi-feature`, `/bfsi-form`, `/bfsi-pii-field`, `/bfsi-api-endpoint`, `/bfsi-compliance-check`, `/bfsi-commit`, `/bfsi-doctor`, `/bfsi-onboarding`, `/bfsi-review`, `/bfsi-grep-conventions`.

**Data-layer skills** (in `.claude/skills/`): `axios-auth`, `constants-organization`, `tanstack-services`, `query-client-setup`, `bfsi-zustand-store`, `perf-tuning`, `testing-patterns`.

## Auto-review on Stop

A Stop hook runs a review sub-agent after every coding turn. If it finds P0 (security/PII/secrets) or P1 (convention violations) issues in the uncommitted diff, it'll show you the list and ask:

1. **Fix all now** — Claude resolves every P0/P1 finding before stopping
2. **Fix selected ones** — checkbox list, you pick which
3. **Skip** — Claude stops; the findings list is yours to act on

No prompt fires when the diff is clean, doc-only, or contains only P2 (style/naming) findings. To turn it off entirely, delete the second entry under `Stop` in `.claude/settings.json`.

## Gotchas

- `.env.local` is gitignored. If app fails at boot with a Zod error, copy `.env.local.sample` → `.env.local` and fill in real values. **Don't rename `.env.local.sample` to `.env.example`** — a PreToolUse hook (`env-file-convention.sh`) blocks the drift because a prior rename silently dropped six BFSI env vars.
- `src/components/ui/` is shadcn-managed. Add components via `pnpm dlx shadcn-ui@latest add <component>` — don't hand-author there.
- The dev server enforces tight security headers (X-Frame-Options: DENY, etc.). If iframe embedding fails in dev, that's why.
- ESLint runs with `--max-warnings 0`. Warnings fail CI; fix them as they appear.
- **Husky is wired by the CLI**: the scaffold runs `git config core.hooksPath .husky` after `git init`, so every commit from #2 onwards runs `pnpm exec lint-staged` automatically. The initial scaffold commit uses `--no-verify` (the freshly-generated tree was already typechecked + tested by the CLI's verifier). If husky stops firing, check `git config core.hooksPath` — it should be `.husky`.
- **Skill-mandated files can't be deleted by `rm` / `git rm`**: a PreToolUse hook (`protect-skill-mandated.sh`) blocks deletion or rename of files the BFSI skills assume exist at canonical paths — `api/axiosInstance.ts`, `api/queryClient.ts`, `routes/ProtectedRoute.tsx`, `i18n/i18n.ts`, etc. Edits are fine; only deletions are blocked. If you truly need to remove one, surface the change in conversation first, explain why the mandate no longer applies, and ask for an explicit override.
- **Fabricated imports are blocked**: a PreToolUse hook (`no-fabrication-guard.sh`) blocks any `import { X } from '@<scope>/core'` (or `/ui`) where `X` is exported nowhere in the resolved package. It fails open when the package isn't installed, so it only fires on genuine fabrications. If it blocks you, the symbol doesn't exist — grep `node_modules/<scope>/<pkg>/` to find the real name (see the `bfsi-no-fabrication` skill).
- **Binary assets MUST live under `src/assets/`**: two gates enforce this. (1) A PreToolUse hook (`asset-location-guard.sh`) blocks Claude from writing images/fonts/icons (`.png .jpg .svg .webp .woff2 …`) to anywhere under `src/` other than `src/assets/`. (2) A lint-staged hook (`.husky/check-asset-location.mjs`) fails the commit if a developer manually saves an asset elsewhere under `src/`. Files in `public/` (favicon, robots.txt, manifest) are always allowed. The convention exists because re-brands are common in BFSI white-label work — `src/assets/` keeps swap-out a single-folder operation. See [`src/assets/README.md`](src/assets/README.md).

## When something fails

- Type error after `pnpm install` → `pnpm typecheck` to see all errors; the `@<scope>/core` and `@<scope>/ui` paths resolve via `link:` to the local workspace.
- 401 in dev → check `setAuthToken(axiosInstance, token)` is called in the login mutation's `onSuccess`.
- `/bfsi-doctor` fails on `.claude/settings.json $schema` → the correct URL is `https://json.schemastore.org/claude-code-settings.json`.
