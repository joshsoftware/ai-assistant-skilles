---
name: bfsi-i18n-key
description: Adds an i18n key consistently across every locale file (`en.json`, `hi.json`, and any others). Handles namespace placement, parameter validation, and detects accidental duplicates. Use when the user types /bfsi-i18n-key, asks to "add a translation", "add an i18n key", "add a label in en + hi", or "create a new locale string".
disable-model-invocation: true
argument-hint: <key.path> <english-value> [--hi <hindi-value>] [--params "a,b,c"]
allowed-tools: Read Edit Glob Grep
---

# BFSI i18n Key

Adds a translation key to every locale file the project ships, with placeholder values for locales the user can't fill in yet. Validates that the key isn't already present, that parameters are consistent across locales, and that the parent namespace exists.

## Arguments

- `$0` — dotted key path (e.g. `kyc.confirm.title`, `transactions.transfer.error.insufficient_funds`). **Required.**
- `$1` — English value (interpreted as the `en` locale). **Required.**
- `--hi <value>` — Hindi value. If omitted, the key is added to `hi.json` with the **English fallback prefixed `[hi:TODO] `** so a translator can find it.
- `--params "a,b,c"` — declared interpolation parameters (e.g. `--params "amount,recipient"` for `Transfer ₹{amount} to {recipient}`).

## What it does

Given `bfsi-i18n-key transfer.confirm.title "Transfer ₹{amount} to {recipient}" --params "amount,recipient"`:

In `src/i18n/translations/en.json`:

```json
{
  "transfer": {
    "confirm": {
      "title": "Transfer ₹{amount} to {recipient}"
    }
  }
}
```

In `src/i18n/translations/hi.json`:

```json
{
  "transfer": {
    "confirm": {
      "title": "[hi:TODO] Transfer ₹{amount} to {recipient}"
    }
  }
}
```

Other locale files (if present): same pattern with `[<locale>:TODO]` prefix.

## Workflow

### Step 1 — Locate the locale files

Glob `src/i18n/translations/*.json`. If none found, surface a clear error: "No locale files found; this project may not use react-i18next."

### Step 2 — Validate the key

- Key path must be lowercase, dot-separated, words `[a-z0-9_]+`.
- Parent namespace (everything before the last segment) must already exist in `en.json` OR the user passes `--create-namespace` (default: yes if missing, with a confirmation note).
- Key must NOT already exist in any locale — if it does, surface where and abort.

### Step 3 — Validate parameters

- Parse `{name}` placeholders from the English value.
- If `--params` is provided, it MUST match the parsed set exactly. Mismatch = abort with diff.
- For each non-English value provided (via `--hi <v>` or future locale flags), the same parameter set MUST be present (translation may reorder them, but cannot drop or add).

### Step 4 — Sort & write

After insertion, re-sort each locale's keys lexicographically per level so diffs stay clean. Preserve any leading comment block in the file.

### Step 5 — Verify

Run `npm test src/i18n` if test files exist (the templates ship a basic key-completeness test). Surface any failures.

### Step 6 — Suggest usage

End with a one-line suggestion of the call-site code:

```tsx
t('transfer.confirm.title', { amount, recipient });
```

…or, for keys without params:

```tsx
t('transfer.confirm.confirm_button');
```

## Conventions enforced

- **Every locale gets the key.** No dangling `en`-only strings. The `[hi:TODO]` prefix makes missing translations searchable: `grep -rE '\[hi:TODO\]' src/i18n/translations/`.
- **Parameter sets are identical across locales.** A `{amount}` in `en` must appear (possibly reordered) in `hi`. A translator dropping `{amount}` is a bug — the key validation catches it.
- **Keys are stable.** Once a key is added and used, it doesn't get renamed lightly. If a rename is needed, do it atomically across translations + call-sites in one PR.
- **No PII in keys.** Keys are content-addressed; never include user identifiers. `user.<id>.welcome` is wrong; `user.welcome` with a `{name}` param is right.
- **No HTML in values** unless the consumer uses `<Trans>` explicitly. `<Trans>` is rare; default to plain text + interpolation.

## When NOT to use

- **Test fixtures** — use inline strings or test-only locale stubs, never pollute the real locale files.
- **Backend-driven messages** — error messages from the API are translated server-side (or shown via reference codes — see `bfsi-error-message` skill); don't add a key for every possible API error.
- **Date/number formatting** — use Intl-aware formatters from `@<scope>/ui/formatters`, not a locale key per format.

## References

- `src/i18n/i18n.ts` — react-i18next setup (in template).
- `src/i18n/translations/en.json` / `hi.json` — locale files.
- WCAG 3.1.1 (Language of Page) — locale metadata baseline.
