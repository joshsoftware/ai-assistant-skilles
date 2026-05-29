---
name: bfsi-no-fabrication
description: Never reference a function, hook, component, or export you haven't confirmed exists — grep the source first. Auto-loads whenever you're about to import from @react-vault/core, @react-vault/ui, or any workspace/local package, plan code around a hook or helper, or write an import statement. Use when about to reference an API, "does X exist", "import from", or planning an implementation that depends on a symbol.
---

# BFSI No Fabrication

**Before you reference any symbol — a function, hook, component, type, env var,
or module export — confirm it exists by reading the source.** Do not infer an
API from its name, from a skill's prose, or from "this is the kind of thing
that should exist."

This rule exists because the most expensive mistakes in real BFSI delivery were
fabrications: a `useAuditedMutation` hook planned across an entire phase that
didn't exist in the package, and a `useFormWithZod` import that a skill itself
referenced but the package never exported. Both forced rework and eroded trust.

## The verification loop

When you're about to use `import { X } from '<pkg>'` or call `Y()`:

1. **Locate the source of truth.**

   - Workspace package: `packages/<pkg>/src/index.ts` (and the sub-path module
     it re-exports from, e.g. `packages/core/src/http/index.ts`).
   - Node dependency: `node_modules/<pkg>/dist/*.d.ts` or the package's
     `package.json` `exports`.
   - Local file: the file itself.

2. **Grep for the export.**

   ```bash
   grep -rn "export .*\bX\b" packages/<pkg>/src/
   # or for a default export / named re-export:
   grep -rn "\bX\b" packages/<pkg>/src/index.ts
   ```

3. **Branch on the result:**
   - **Found** → use it. Note the exact import path.
   - **Not found** → STOP. Do not invent it. Either:
     - find the real equivalent (grep for similar names), or
     - surface the gap to the user as a question: "`X` doesn't exist in
       `<pkg>` — did you mean `Z`, or should I build it?"

## What counts as a symbol to verify

- Functions / hooks: `useAuditedMutation`, `setAuthToken`, `mask`, …
- Components: `<PIIMaskedDisplay>`, `<ConfirmModal>`, …
- Types / interfaces imported from a package.
- Env vars: confirm against `src/env.ts`'s zod schema before reading
  `import.meta.env.VITE_*`.
- Skill / agent / command names you cite in prose: confirm the directory or
  file exists before telling the user to run `/bfsi-foo` or dispatch an agent.

## Red flags — you are about to fabricate

| Thought                             | Reality                                                          |
| ----------------------------------- | ---------------------------------------------------------------- |
| "There's probably a hook for this"  | Grep. If it's not there, it's not there.                         |
| "The skill says to use `useFooBar`" | Skills can be wrong. Confirm against the package, not the prose. |
| "This is the standard name for it"  | Standard elsewhere ≠ exported here.                              |
| "I used it earlier so it exists"    | You may have planned it, not verified it. Re-grep.               |
| "The name matches the pattern"      | Naming is a hypothesis, not proof.                               |

## When the user is about to act on your recommendation

If you're recommending a symbol (not just discussing history), verify _now_ —
before the user writes code against your word. "The package should export X"
is not the same as "X is exported."

## Relationship to other skills

- `bfsi-verify-backend` is the same discipline applied to a backend API.
- The `no-fabrication-import-guard` hook (when present) enforces this at
  Write/Edit time, but the hook is a safety net — the habit is the real fix.
