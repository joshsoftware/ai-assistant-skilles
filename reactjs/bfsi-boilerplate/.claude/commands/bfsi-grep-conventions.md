---
name: bfsi-grep-conventions
description: Surface every `// CONVENTION:` breadcrumb in the codebase and group them so the recurring ones can be codified into skills. Use when the user types /bfsi-grep-conventions, asks "what conventions have we deferred", "what should we codify", or before a skills-codification pass.
---

# /bfsi-grep-conventions

You are surfacing the codebase's deferred-codification ledger. During feature
work, the team leaves `// CONVENTION:` comments at the first site that adopts a
pattern in lieu of a dedicated skill (see the `bfsi-convention-breadcrumb`
practice). This command collects them so patterns that have recurred enough are
turned into real skills.

Don't delegate — run the grep and analyse directly.

## Step 1 — Collect

Run, from the project root:

```bash
grep -rn "// CONVENTION:" src/ 2>/dev/null || true
```

Also check common non-`src` locations if the project keeps code elsewhere
(e.g. `app/`, `packages/*/src/`). If nothing is found, report "No
`// CONVENTION:` breadcrumbs found — nothing deferred" and stop.

## Step 2 — Group

Group the hits by the _pattern_ they describe, not by file. Two breadcrumbs
that say the same thing in different files are one candidate. For each group,
record:

- **Convention** — the one-line rule, quoted from the comment.
- **Occurrences** — `file:line` for each site (count them).
- **Closest existing skill** — does a skill already half-cover this? If so,
  the fix may be extending that skill rather than creating a new one.

## Step 3 — Rank for codification

Apply the **rule of three**: a pattern that appears in **3+ files** is ready to
codify into a skill; 2 is a watch-item; 1 is fine to leave inline.

Output a table:

```
| Convention | Occurrences | Files | Codify? |
|------------|-------------|-------|---------|
| <quoted rule> | 4 | a.ts:12, b.tsx:30, ... | ✅ ready — propose skill `bfsi-<name>` |
| <quoted rule> | 2 | c.ts:9, d.ts:40 | ⏳ watch — revisit at 3rd occurrence |
| <quoted rule> | 1 | e.ts:5 | — leave inline |
```

## Step 4 — Propose, don't write

For each "✅ ready" row, propose a one-paragraph skill spec (name, trigger
description, what the canonical example would be sourced from). Do NOT create
the skill files in this command — that's a separate, deliberate codification
pass the user runs when ready. This command only surfaces and ranks.

## Notes

- This is read-only. No edits, no deletes.
- If the project has zero breadcrumbs, that's either a very new project or a
  sign the team isn't leaving them — gently remind the user that the
  `bfsi-convention-breadcrumb` practice keeps this ledger useful.
