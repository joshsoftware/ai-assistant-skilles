---
name: bfsi-pii-field
description: Wraps a data field with PII masking (click-to-reveal) using PIIMaskedDisplay from @react-vault/ui. Use when the user types /bfsi-pii-field, asks to "mask this PAN", "hide the account number", "add masking to Aadhaar", or "make this field a PII field".
disable-model-invocation: true
argument-hint: <field-type> <variable-or-prop>
allowed-tools: Read Edit Grep
---

# BFSI PII Field

Wraps a value display with `<PIIMaskedDisplay type="pan" value={...} />` from `@react-vault/ui`.

## Supported types

| Type             | Default mask       | Reveal duration |
| ---------------- | ------------------ | --------------- |
| `pan`            | `ABCDE****F`       | 30s             |
| `aadhaar`        | `XXXX XXXX 1234`   | 15s             |
| `account_number` | `****1234`         | 30s             |
| `mobile`         | `+91 ******1234`   | 30s             |
| `email`          | `j***@example.com` | 30s             |
| `card_last4`     | `**** 1234`        | 60s             |
| `name`           | initials only      | 60s             |
| `address`        | first line + `…`   | 60s             |
| `dob`            | masked, age shown  | never           |

## What it does

Given a JSX expression like:

```tsx
<td>{user.pan}</td>
```

Replaces it with:

```tsx
<td>
  <PIIMaskedDisplay type="pan" value={user.pan} />
</td>
```

This adds:

1. **Click-to-reveal** with an `onReveal` callback hook (wire your own telemetry if you want)
2. **Auto re-mask** after the type-specific duration
3. **Copy guard** — copying the masked text returns "\*\*\*\*" not the value
4. **a11y** — `aria-label="masked PAN, click to reveal"`, screen-reader-friendly

## Workflow

### Step 1: Locate the field

If the user gives a variable like `user.pan`, find the occurrences in the current file. If multiple, ask which one.

### Step 2: Determine the type

If not provided, infer from the variable name:

- contains `pan` → `pan`
- contains `aadhaar` / `uid` → `aadhaar`
- contains `account` / `acc_no` → `account_number`
- contains `mobile` / `phone` → `mobile`
- contains `email` → `email`
- contains `dob` / `birth` → `dob`
- otherwise → ask the user.

### Step 3: Add the import (if missing)

```tsx
import { PIIMaskedDisplay } from '@/components/bfsi';
```

### Step 4: Replace + verify

Edit the file. Run `npm run typecheck` on the changed file. Report success.

## When NOT to use

- **In a `<form>` input field.** Use `<SecureFormField>` instead — that handles paste guards and autocomplete prevention for input, not display.
- **In exported data.** Exports should use the same mask. Don't reveal in CSV without explicit user consent.
- **In server-rendered HTML.** Masking on the client only is insufficient for SSR contexts — the backend must also mask before sending. Flag this to the user if the file looks like SSR.
