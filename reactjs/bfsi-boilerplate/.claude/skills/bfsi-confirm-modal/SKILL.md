---
name: bfsi-confirm-modal
description: Adds a confirmation modal before a sensitive action, with optional MFA step (OTP / password re-entry / passkey). Wraps the existing handler so the action only fires after confirmation. Use when the user types /bfsi-confirm-modal, asks to "add a confirm modal", "require MFA before this action", "double-confirm this", or "guard this destructive action".
disable-model-invocation: true
argument-hint: <action-label> [--mfa] [--variant warning|destructive|info]
allowed-tools: Read Write Edit Grep
---

# BFSI Confirm Modal

Wraps a sensitive action with a confirmation step. For high-sensitivity actions (transfers, deletions, permission changes), adds an MFA gate.

`<ConfirmModal>` is planned for `@<scope>/ui` v0.2. Until then, this skill generates a **project-local** confirm modal under `src/shared/ConfirmModal/` and uses it from the target component. The skill is idempotent — if the project-local modal already exists, the skill only adds the call-site.

## Arguments

- `$0` — short, human-readable action label (e.g. `Transfer ₹{amount}`, `Delete {recipient.name}`, `Approve KYC for {user.name}`). **Required.**
- `--mfa` — require an MFA step (OTP / password re-entry) before confirming.
- `--variant warning|destructive|info` — visual variant. Defaults to `warning` for sensitive non-destructive, `destructive` for delete/revoke, `info` for read-only confirmations.

## What it does

Given:

```tsx
<Button onClick={handleTransfer}>Transfer</Button>
```

Replaces with:

```tsx
<ConfirmModal
  triggerLabel="Transfer"
  title={t('transfer.confirm.title')}
  description={t('transfer.confirm.description', { amount, recipient: recipient.name })}
  variant="destructive"
  requireMfa={true} // only with --mfa
  onConfirm={handleTransfer}
/>
```

The modal renders the trigger button as its own child (no double-button); on click, opens with the description, MFA input if requested, and Confirm/Cancel actions. `onConfirm` only fires after the MFA step succeeds (when requested).

## Workflow

### Step 1 — Check for the project-local modal

Look for `src/shared/ConfirmModal/ConfirmModal.tsx`. If it doesn't exist, generate it using the template at `references/confirm-modal.tpl.tsx` (creates the component, an MFA hook stub, and a basic Vitest test).

### Step 2 — Locate the target action

Grep the current file (or the user-specified file) for the button or handler.

### Step 3 — Determine variant

| Action kind          | Variant       |
| -------------------- | ------------- |
| Money transfer       | `destructive` |
| Delete a record      | `destructive` |
| Revoke a permission  | `destructive` |
| Approve a submission | `warning`     |
| Bulk update          | `warning`     |
| Export data          | `warning`     |
| Mark as read         | `info`        |

### Step 4 — Pick i18n keys

The modal's title/description come from i18n keys (BFSI screens are typically multilingual). If keys don't exist, propose them and invoke `bfsi-i18n-key` to add `<feature>.confirm.title`, `<feature>.confirm.description`, `<feature>.confirm.confirm_button`.

### Step 5 — Apply the wrap + verify

Edit the file. Run `npm run typecheck` and `npm test` on the changed file.

If `--mfa`, additionally verify:

- The MFA step uses a real challenge (OTP / passkey / re-auth), not a checkbox.
- The MFA token / OTP is sent to the backend per-action — never stored in client state beyond the modal's lifecycle.

## Accessibility requirements

- **Modal traps focus** while open; returns focus to the trigger button on close.
- **Escape closes** (treated as Cancel).
- **Title is `<h2>`** with `aria-labelledby`; description with `aria-describedby`.
- **Destructive actions** never autofocus the Confirm button — focus goes to Cancel.
- **Loading state** during MFA submit uses `aria-busy="true"`.

## Conventions enforced

- **Confirm modal is never the only safeguard.** Backend re-validates the action; the modal is UX defence-in-depth.
- **No PII in the description** — say "Transfer ₹{amount} to {recipient.maskedName}", not the full name + account number.
- **Destructive variant uses red** but is not the only indicator (icon + label too, for colour-blind users).
- **MFA-gated actions audit `mfa_verified: true`.**

## When NOT to use

- **Trivial actions** (toggle a setting, dismiss a notification) — modal fatigue trains users to click through.
- **Reads** — never confirm reading data.
- **Already-confirmed flows** — if the user already passed a confirmation in the parent step, don't double-confirm.

## References

- `references/confirm-modal.tpl.tsx` — project-local component template (generated on first use).
- RBI Annexure I §6.x (Authentication) — MFA on sensitive operations.
- PCI-DSS v4.0 §8.4.x / §8.5.x — MFA on admin/sensitive flows. (v3.2.1 §8.2.x — _which only covered unique IDs_ — was split: §8.2.x kept unique-ID, §8.3.x covers auth-factor strength, §8.4.x/§8.5.x cover MFA. See [`../../references/pci-dss-v4.0-frontend-relevant.md`](../../references/pci-dss-v4.0-frontend-relevant.md).)
- WCAG 2.1 — Modal dialog ARIA pattern.
