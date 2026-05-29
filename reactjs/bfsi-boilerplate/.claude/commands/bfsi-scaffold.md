---
name: bfsi-scaffold
description: Interactive feature / API / form scaffolding for BFSI projects. Routes to the right skill based on what the user wants to create.
argument-hint: [feature|api|form|route|table] [args]
---

# /bfsi-scaffold

You are dispatching the user to the right scaffolding skill.

## Workflow

If `$ARGUMENTS` starts with a known kind, route directly:

- `feature <Name>` → invoke skill `bfsi-feature` with `$Name`
- `api <Method> <Path>` → invoke skill `bfsi-api-endpoint`
- `form <Name>` → invoke skill `bfsi-form`
- `route <Path>` → invoke skill `bfsi-protected-route`
- `table <Name>` → invoke skill `bfsi-data-table`
- `pii <Field>` → invoke skill `bfsi-pii-field`
- `i18n <Key>` → invoke skill `bfsi-i18n-key`
- `confirm` → invoke skill `bfsi-confirm-modal`

If `$ARGUMENTS` is empty or doesn't match, ask the user which kind:

```
What would you like to scaffold?

  1. feature  — full feature module (api + containers + components + tests + i18n)
  2. api      — single TanStack Query endpoint (service + hook)
  3. form     — RHF + Zod form with BFSI defaults
  4. route    — protected route with permission check
  5. table    — access-controlled data table
  6. pii      — wrap a field with PIIMaskedDisplay
  7. i18n     — add an i18n key across all locales
  8. audit    — wrap an action with audit logging
  9. confirm  — confirmation modal (with optional MFA)

Type the kind plus any args (e.g. "feature KycVerification").
```

Then route based on the response.

## Notes

This command is a thin router. The actual scaffolding lives in the dedicated skills, which encapsulate the BFSI conventions for each artefact type.
