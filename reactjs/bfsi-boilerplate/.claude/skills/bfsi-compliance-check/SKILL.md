---
name: bfsi-compliance-check
description: Runs an OWASP Top 10 + RBI + PCI-DSS + IRDAI + SOC2 compliance checklist against the current branch's diff. Reports findings grouped by severity (critical, high, medium, low) with file:line references and remediation steps. Use when the user types /bfsi-compliance-check, asks to "run compliance check", "audit my changes for compliance", or "check this PR for security issues".
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash(git diff:*) Bash(git log:*)
---

# BFSI Compliance Check

Static compliance scan over the current branch's diff (`git diff origin/main...HEAD`).

## Checks performed

### Critical (must fix before merge)

1. **Hardcoded secrets** — API keys, tokens, passwords, connection strings in code/configs
   - Pattern: `api_key|secret|password|token|private_key` followed by `= ?['"][^'"]+['"]`
   - Action: extract to env var
2. **Card data in non-PCI iframe** — `<input>` capturing card number/CVV outside `<PCITokenizedCardInput>`
   - Pattern: `name="card_number"|name="cvv"|name="cvc"` not inside `PCITokenized*`
3. **PII in console.log / console.error** — `console.log(user.pan)`, etc.
   - Pattern: `console\.(log|info|warn|error).*\.(pan|aadhaar|account|password|cvv|otp)`
4. **localStorage with PII** — `localStorage.setItem(..., user.pan)`, etc.
   - Pattern: `localStorage\.setItem.*\.(pan|aadhaar|account|password)`
5. **Unencrypted IndexedDB** — direct `idb.put()` of objects containing PII fields
   - Suggest using `secureStorage` from `@react-vault/core/storage`
6. **Missing CSRF token on mutation** — `fetch('/api/...', { method: 'POST', ... })` without `X-CSRF-Token` (if not using cookie-less JWT)

### High (fix before next sprint)

7. **Weak crypto** — `md5`, `sha1`, `Math.random()` for security purposes, `crypto.createCipher` (deprecated)
8. **`dangerouslySetInnerHTML`** without sanitisation
9. **Missing `<ProtectedRoute>`** on a route that fetches user data
10. **Missing `permission` prop** on `<ProtectedRoute>` (defaults to authenticated-only)
11. **Untyped network shape** — service/hook returning `any` instead of a `types.ts` interface (responses are typed at compile time, not runtime-validated; do not require a response `.parse()`)
12. **`autocomplete="on"` on PII input field**
13. **Form submit without idempotency-key header**

### Medium (track for hardening)

15. **Inline event handlers in JSX** for sensitive actions (harder to audit)
16. **Untranslated user-facing strings** (no `t()` wrap)
17. **Missing `aria-label`** on PII reveal buttons
18. **Magic numbers** for amounts (use named constants)
19. **TODO/FIXME** comments mentioning security
20. **No tests** for files in `src/features/*/api.ts` or containers

### Low (best-practice nudges)

21. **`React.FC`** usage (prefer named function components for stack traces)
22. **Default exports** (prefer named exports for refactor safety)
23. **`as any`** type assertions
24. **Files over 400 lines**

## Workflow

### Step 1: Get the diff

```bash
git diff --name-only origin/main...HEAD
```

If no diff (or origin/main missing), fall back to `git diff HEAD~5...HEAD`.

### Step 2: For each category, run targeted greps

Use the patterns above. Be specific — minimise false positives. Each finding records: file, line, category, severity, the offending snippet, suggested fix.

### Step 3: Group + report

Output as markdown:

```
# Compliance Check Report

Branch: <name>  →  origin/main (N files changed)

## Critical (must fix): N findings
1. **Hardcoded secret** in src/api/auth.ts:42
```

const API_KEY = 'sk-abc123...'

```
Fix: replace with `import.meta.env.VITE_API_KEY` and add to `.env.local.sample`.

## High: N findings
...
```

### Step 4: Exit code

If any critical findings, end with: "❌ NOT MERGE-READY: N critical findings must be addressed."
If high but no critical: "⚠️ Mergeable but address N high findings before next sprint."
Otherwise: "✅ All checks passed."

## Note on scope

This is a **static** check based on patterns. It catches obvious issues but is not a substitute for:

- `bfsi-security-reviewer` agent (which reasons about flows)
- Backend security review
- Penetration testing
- Third-party SAST/DAST tools

Always run before requesting human PR review.
