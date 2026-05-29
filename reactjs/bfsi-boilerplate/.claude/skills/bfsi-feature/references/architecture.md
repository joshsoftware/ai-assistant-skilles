# BFSI Feature — Architecture rationale

## Why container-component split?

**Containers** own all side-effects: API calls, audit logging, mutations, navigation, form state. They have no JSX of their own — just compose a presentational component and pass it props.

**Components** receive props, render UI, emit events. No `useFetch`, no `useDispatch`, no `useNavigate`. They are pure and easy to test with React Testing Library.

For BFSI, this split matters because:

- **Audit clarity** — security review only needs to look at containers to see what data flows in/out
- **Easy mocking** — components test in isolation; you don't fight network in unit tests
- **Reusability** — same component renders in two contexts with different containers (e.g. customer-view vs admin-view)

## Why Zod everywhere?

We use Zod for THREE distinct purposes:

1. **API response validation** — every API response is parsed through a Zod schema before reaching components. Rejects malformed responses (XSS defence).
2. **Form validation** — same schema or a derived schema validates form inputs.
3. **Type generation** — `z.infer<typeof schema>` gives us TS types from a single source of truth.

This means: edit one Zod schema, and types + runtime checks update together. No drift.

## Why permission-gated routes?

`<ProtectedRoute permission="kyc.view">` does TWO checks:

1. **Authentication** — is there a valid session?
2. **Authorization** — does the current user's permission set include `"kyc.view"`?

Failing #1 → redirect to login. Failing #2 → render 403.

The permission string is checked against the current user's permission set fetched at login. We do NOT trust client-side permissions for security; the backend re-checks on every API call. The client check is a UX optimisation (don't show what they can't access) and an audit-log trigger.

## Sensitive field auto-wrap

The scaffolder auto-wraps fields whose names match `/^(pan|aadhaar|account|mobile|email|dob)$/i` with `<PIIMaskedDisplay>` in the table component. This means:

- The value is masked by default (`****1234` for account numbers, `ABCDE****F` for PAN, etc.)
- A reveal toggle fires an audit log event with reason
- Reveals expire after 30 seconds and re-mask

This is a default; you can opt out by editing the generated component. But by default, PII never appears unmasked in lists or tables.

## i18n namespace per feature

Each feature gets its own i18n namespace `<feature>.*`. This keeps translation files navigable (one team can own KYC translations, another Loans) and lets us lazy-load translation chunks per route.

Naming:

- `<feature>.title`
- `<feature>.list.empty`
- `<feature>.form.fields.<fieldName>.label`
- `<feature>.form.fields.<fieldName>.placeholder`
- `<feature>.errors.<errorCode>`
- `<feature>.actions.<actionName>`
