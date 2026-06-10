---
name: bfsi-doctor
description: Health check for a BFSI project. Verifies env vars, dep versions, .claude config, hook registration, package consistency, and BFSI-specific gotchas.
---

# /bfsi-doctor

You are running a health check. Don't delegate — execute the checks directly.

## Checks

Run each check, report status (✅ / ⚠️ / ❌), and remediation for any failures. Within each section, checks are numbered from 1; cross-section references use `<Section> #<n>` (e.g. `Project config #1`).

### Environment

1. **Node version** — `node --version`. Should be ≥ 20.11.0.
2. **pnpm version** — `pnpm --version`. Should be ≥ 11.0.0.
3. **Git** — `git --version`. Any modern git.
4. **In a project root** — check for `package.json` in `$CLAUDE_PROJECT_DIR`.

### Project config

1. **BFSI toolkit is wired** — either as a plugin OR inlined. Pass if EITHER:

   - `.claude/settings.json` has `enabledPlugins` including `"toolkit@react-vault"` (plugin mode), OR
   - `.claude/agents/bfsi-pr-reviewer.md` exists alongside `.claude/skills/bfsi-feature/SKILL.md` and `.claude/hooks/scripts/block-destructive.sh` (inlined mode, set up by `create-app`).

   Fail only if neither path resolves. Both modes are valid; the CLI's `inlineToolkitInto()` deletes `enabledPlugins` at scaffold time so scaffolded projects are in inlined mode by default.

2. **`.env.local.sample` exists** with placeholders for VITE\_\* vars.
3. **`tsconfig.json`** extends `tsconfig.base.json` (or has equivalent strict settings).
4. **`.eslintrc.cjs`** present (or `eslint.config.js`).
5. **`.husky/pre-commit`** present and executable.
6. **`.github/workflows/ci.yml`** present.

### Dependencies

1. **Critical packages installed:**

   - `react`, `react-dom`
   - `@react-vault/core` (or link: ref to local workspace)
   - `@react-vault/ui`
   - `@tanstack/react-query`, `zustand`
   - `react-hook-form`, `zod`
   - `react-router-dom`
   - `react-i18next`
   - `tailwindcss`, `autoprefixer`, `postcss`
   - `vitest`, `@testing-library/react`

2. **No duplicate React** — `pnpm why react` should show one version.

### BFSI conventions

1. **`src/features/` exists** (or features live somewhere obvious).
2. **`src/routes/ProtectedRoute.tsx`** exists.
3. **i18n setup** — `src/i18n/i18n.ts` exists and `App.tsx` wraps in `I18nextProvider`.
4. **Sentry stub configured** — `VITE_SENTRY_DSN` placeholder present.

### Claude toolkit

1. **Hook events wired** — `.claude/settings.json` (inlined mode) or the plugin's `hooks.json` carries at least these events: `PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`, `PreCompact`, `PostCompact`, `SubagentStart`, `SubagentStop`. Fewer than 6 → fail.
2. **Toolkit reachable** — covered by `Project config #1`. Don't double-fail this if that check already failed; otherwise re-state pass/fail here for clarity in the section summary.
3. **At least 10 skills available** — count `.claude/skills/*/SKILL.md` (inlined mode) or list via `/plugin` (plugin mode). Toolkit ships 15 skills as of this writing; under 10 means an incomplete install.
4. **All agents referenced by `bfsi-pr-reviewer` exist** — read `.claude/agents/bfsi-pr-reviewer.md`, grep for `bfsi-*-reviewer` / `bfsi-*-scanner` / `bfsi-*-auditor` names, confirm each has a matching file in `.claude/agents/`. (Catches the orchestrator-dispatch-to-missing-agent class of bug.)
5. **All skills referenced by `bfsi-scaffold` exist** — same check for `.claude/commands/bfsi-scaffold.md`'s route table.

### Security

1. **No `.env` files committed** — `git ls-files | grep -E '\.env(\..*)?$' | grep -v 'sample\|example'` should be empty.
2. **No node_modules tracked** — `git ls-files | grep node_modules` should be empty.
3. **No PEM/key files tracked** — `git ls-files | grep -E '\.(pem|key|p12|pfx)$'` should be empty.

## Output

```markdown
# /bfsi-doctor health check

## Summary

{count_pass} ✅ {count_warn} ⚠️ {count_fail} ❌

## Failures (must fix)

{for each ❌, with remediation}

## Warnings (recommended fixes)

{for each ⚠️, with rationale}

## All green

{categories that fully passed}

## Next steps

{Top 3 actions ordered by urgency}
```

## Notes

- Be quiet if everything passes — a short "all green" is fine.
- For `⚠️` items, explain WHY they matter (not just the fact).
- For `❌` items, give the EXACT command or file edit to remediate.
- Don't apply fixes yourself; the user runs them.
