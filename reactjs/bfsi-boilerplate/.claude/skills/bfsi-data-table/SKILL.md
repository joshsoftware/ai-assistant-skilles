---
name: bfsi-data-table
description: Generates an access-controlled, audit-aware data table with column-level permission gates, PII-masked columns, server-side pagination, and a11y-friendly sort/filter. Use when the user types /bfsi-data-table, asks to "scaffold a table", "create a list view", "add a data table for transactions", or "build an admin grid".
disable-model-invocation: true
argument-hint: <TableName> [--feature <FeatureName>] [--columns "name:type,..."]
allowed-tools: Read Write Edit Glob Grep
---

# BFSI Data Table

Generates a typed, paginated table component for a feature. Columns are declared with explicit access rules — a `kyc.export` permission may be required to see the "Export" column, a `pii.view` permission to see the unmasked PAN, etc. Defaults are conservative: PII columns mask, permission-gated columns hide.

## Arguments

- `$0` — table name in PascalCase (e.g. `KycList`, `TransactionsTable`). **Required.**
- `--feature <FeatureName>` — owning feature module. If omitted, inferred from `$0`.
- `--columns "name:type,..."` — column manifest. Each column is `<key>:<kind>[:<permission>]`. Examples:
  - `id:string`
  - `pan:pii(pan)` — PII-masked column using `<PIIMaskedDisplay type="pan">`
  - `amount:currency`
  - `status:badge`
  - `actions:actions(kyc.update,kyc.approve)` — action column gated on permissions

## What it generates

```
src/features/<Feature>/
├── components/<TableName>.tsx     Pure presentational table
├── containers/<TableName>Container.tsx   Data + handlers
└── __tests__/<TableName>.test.tsx
```

The table itself uses the project's primitive Table from `@<scope>/ui` (if present) or shadcn's `Table` directly. Column definitions are typed; rows are typed via `z.infer<...>` from the feature's response schema.

## Workflow

### Step 1 — Validate inputs

Confirm `$0` is PascalCase. Confirm the target feature has an `api.ts` (the table needs a query hook to populate data).

### Step 2 — Parse column manifest

For each column, resolve:

| Kind                  | Cell renderer                                     | Default permission    |
| --------------------- | ------------------------------------------------- | --------------------- |
| `string`, `number`    | Plain text                                        | none                  |
| `currency`            | `<CurrencyDisplay>` from `@<scope>/ui/formatters` | none                  |
| `date`, `datetime`    | Intl-aware formatter                              | none                  |
| `pii(<type>)`         | `<PIIMaskedDisplay type="<type>">` with audit     | `<feature>.pii.view`  |
| `badge`               | Coloured pill, no colour-only encoding            | none                  |
| `actions(<perm>,...)` | Action menu, each item gated on a permission      | union of listed perms |

If a column's permission isn't satisfied, the column is **hidden entirely** (not just disabled) — defensive default.

### Step 3 — Generate the presentational component

The table is pure:

```tsx
interface Row {
  /* inferred from schema */
}

interface Props {
  rows: Row[];
  isLoading: boolean;
  pageInfo: { page: number; pageSize: number; total: number };
  onPageChange: (page: number) => void;
  onSort?: (column: keyof Row, direction: 'asc' | 'desc') => void;
  permissions: Set<string>; // resolved at container, passed in
}
```

No data-fetching, no audit calls, no navigation — those live in the container.

### Step 4 — Generate the container

```tsx
export function <TableName>Container() {
  const { data, isLoading } = use<Feature>List({ page, pageSize });
  const permissions = useUserPermissions();  // project-local
  return (
    <CanAccess permission="<feature>.view">
      <<TableName>
        rows={data?.items ?? []}
        isLoading={isLoading}
        pageInfo={{ page, pageSize, total: data?.total ?? 0 }}
        onPageChange={setPage}
        permissions={permissions}
      />
    </CanAccess>
  );
}
```

`<CanAccess>` is planned for `@<scope>/ui` v0.2. Until then, the skill emits a project-local `<CanAccess>` wrapper under `src/routes/CanAccess.tsx` if absent.

### Step 5 — Generate tests

Per the `bfsi-test-pattern` skill, generate:

- A test that verifies the table renders with empty / loading / loaded states
- A test that verifies a PII column is masked by default
- A test that verifies a permission-gated column is hidden when the permission is absent
- A test that verifies the page-change handler fires with the right argument

### Step 6 — i18n keys

Generate column headers + empty-state messages in `en.json` / `hi.json` via the `bfsi-i18n-key` skill: `<feature>.table.column.<key>`, `<feature>.table.empty`.

### Step 7 — Verify

Run `npm run typecheck` + the new tests.

## Conventions enforced

- **PII columns mask by default.** Reveal requires explicit click; click emits an audit event.
- **Permission gating hides, not disables.** Visible-but-disabled is a UX smell and an info-leak (telegraphs what exists).
- **Container holds data + permissions; presenter is pure.** Same pattern as `bfsi-feature`.
- **Pagination is server-side.** Client-side pagination of regulated data is a smell — it implies pulling more than the user is allowed to see.
- **No client-side row sorting for sensitive fields** — sorting reveals ordering. Sort server-side.

## a11y baseline

- `<table>` with `<th scope="col">` headers
- Sort buttons inside `<th>` with `aria-sort`
- Loading state: `aria-busy="true"` on the table
- Empty state: `role="status"` so screen readers announce it
- Pagination controls: keyboard-navigable, current page announced

## When NOT to use

- **Free-form data** — for unstructured data (logs, notes), use a list, not a table.
- **Few rows (<5)** — a description list (`<dl>`) is more accessible.
- **Highly interactive grids** (cell editing, drag-resize) — those need a heavier library (TanStack Table, AG Grid). This skill generates display tables.

## References

- `bfsi-pii-field` skill — for the PII column renderer pattern.
- `bfsi-test-pattern` skill — for the table tests.
- WCAG 2.1.1 (Keyboard) and 4.1.2 (Name, Role, Value) — table baseline.
