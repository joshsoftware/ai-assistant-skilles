---
name: bfsi-form
description: Creates a React Hook Form + Zod form with BFSI-secure defaults (no autocomplete on PII fields, paste prevention on sensitive inputs, error masking). Use when the user types /bfsi-form, asks to "create a form", "add a form to this page", "build a KYC form", or "scaffold a transfer form".
disable-model-invocation: true
argument-hint: <FormName> [--fields "name:type,..."]
allowed-tools: Read Write Edit Glob Grep
---

# BFSI Form Scaffold

Generates a `react-hook-form` + `zod` form with BFSI-secure defaults wired into shadcn/ui's `<Form>` primitives.

## What it adds

```
<TargetFile>.tsx
└── <FormName>Form               # Container component
    ├── useForm() + zodResolver(schema)   # react-hook-form + @hookform/resolvers/zod
    ├── onSubmit handler         # async, errors surfaced via toast
    ├── PIIMaskedDisplay         # auto-wrap for fields matching PII pattern
    └── BFSI defaults:
        ├── autocomplete="off" on PII fields
        ├── onPaste guards on sensitive inputs
        ├── inputMode + pattern for known formats (PAN, Aadhaar, mobile)
        ├── error messages from i18n keys (never raw)
        └── submit disabled while !isDirty || !isValid || isSubmitting
```

### Wiring

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

const form = useForm<<FormName>Schema>({
  resolver: zodResolver(<formName>Schema),
  defaultValues: { /* ... */ },
  mode: 'onBlur',
});
```

Wrap the JSX in shadcn/ui's `<Form>` primitive so the `<FormField>` / `<FormMessage>` integration with `react-hook-form` is automatic. Don't reach for any custom `useFormWithZod` wrapper — `useForm` + `zodResolver` is the supported pattern.

## Workflow

### Step 1: Determine field set

If `--fields` is provided, parse it (`name:type` comma-separated, e.g. `pan:string,amount:number,date:date`).
Otherwise, ask the user (via prompt in chat) which fields they need.

### Step 2: Build the Zod schema

For each field, choose a base from BFSI presets:

- `pan` → `z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, t('error.pan_invalid'))`
- `aadhaar` → `z.string().regex(/^\d{12}$/).refine(verhoeff)`
- `mobile` → `z.string().regex(/^[6-9]\d{9}$/)`
- `email` → `z.string().email()`
- `amount` → `z.number().positive().multipleOf(0.01)`
- `account_number` → `z.string().regex(/^\d{9,18}$/)`
- `ifsc` → `z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/)`
- `date` → `z.coerce.date()`

If a field name doesn't match a preset, fall back to `z.string().min(1)` and flag it for review.

### Step 3: Generate the form component

Use the template at `references/templates/form.tsx.tpl`. Wire `useForm` from
`react-hook-form` with `zodResolver` from `@hookform/resolvers/zod`, and
compose the JSX from shadcn/ui's `<Form>` primitive (already installed at
`src/components/ui/form.tsx` via `npx shadcn-ui@latest add form`).

Import the project's `@react-vault/ui` (for `PIIMaskedDisplay`) and
`@react-vault/core` (for shared types / regex) as needed.

### Step 4: Add i18n keys

Add label/placeholder/error keys to the project's translation files (en.json + hi.json placeholder).

### Step 5: Verify

Run `npm run typecheck` on the new file. If imports fail:

- `react-hook-form` / `@hookform/resolvers/zod` missing →
  `npm install react-hook-form zod @hookform/resolvers`
- `@/components/ui/form` missing →
  `npx shadcn-ui@latest add form`
- `@react-vault/ui` missing → check that the workspace dep is wired in
  the project's `package.json`.

## Conventions

- **Never** capture card numbers or CVVs in a regular form. Use `<PCITokenizedCardInput>` from `@react-vault/ui` which embeds a PCI-compliant iframe.
- **Never** persist form drafts of PII fields to localStorage. Use `sessionStorage` with the `secureStorage` wrapper from `@react-vault/core/storage`.
- **Submit handler returns a Promise.** Errors thrown inside it are caught by the form and surfaced via toast.

## References

- Templates: [`references/templates/`](references/templates/)
- Validation regex catalogue: [`references/validation-regex.md`](references/validation-regex.md)
- shadcn/ui Form primer: https://ui.shadcn.com/docs/components/form
