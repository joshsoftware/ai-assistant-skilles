---
name: bfsi-perf-virtualize-list
description: Wraps an existing list / table component with `@tanstack/react-virtual` so it only renders rows currently in the viewport. Preserves keys, accessibility, sticky headers, and the existing row component. Use when the user types /bfsi-perf-virtualize-list, asks to "virtualise this list", "this table is slow", "render 5000 rows faster", or scaffolds a feature whose API can return more than a few hundred items.
disable-model-invocation: true
argument-hint: <ComponentFile> [--row-height <px>] [--overscan <n>] [--axis y|both]
allowed-tools: Read Edit Glob Grep
---

# BFSI Perf — Virtualize List

Wraps a list / table with `@tanstack/react-virtual`. The library is the project's default virtualiser (small, hook-based, framework-agnostic). If the project doesn't already depend on it, the skill emits the install command rather than silently adding a dep.

## Arguments

- `$0` — path to the component file (e.g. `src/features/Transactions/components/TransactionsTable.tsx`). **Required.**
- `--row-height <px>` — fixed row height. If omitted, prompts for an estimate (50px is a reasonable default for a single-line row, 72px for a row with two lines of metadata).
- `--overscan <n>` — extra rows to render above/below the viewport. Default `5`. Higher = smoother fast scrolls + more DOM. Lower = leaner DOM + occasional blank flashes during flicks.
- `--axis y|both` — `y` virtualises rows only (the common case). `both` virtualises columns too (for wide grids with 30+ columns). Default `y`.

## What gets generated

Given a starting component like:

```tsx
export function TransactionsTable({ rows }: Props) {
  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Amount</th>
          <th>Counterparty</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <TransactionRow key={r.id} txn={r} />
        ))}
      </tbody>
    </table>
  );
}
```

The skill transforms it to:

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

export function TransactionsTable({ rows }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
    // CRITICAL: stable keys survive sort/filter
    getItemKey: (index) => rows[index].id,
  });

  return (
    <div
      ref={parentRef}
      className="relative h-[600px] overflow-auto"
      role="region"
      aria-label="Transactions"
    >
      <table className="w-full">
        <thead className="sticky top-0 z-10 bg-background">
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Counterparty</th>
          </tr>
        </thead>
        <tbody style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const txn = rows[virtualRow.index];
            return (
              <tr
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                aria-rowindex={virtualRow.index + 1}
              >
                <TransactionRow txn={txn} />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

## Workflow

### Step 1 — Read the target component

If the file uses something other than `<table>` (e.g. a `<ul>` of cards), adapt the wrapper element accordingly. If the component is generic over data type (uses a render-prop or `children`), surface the variant choice to the user before editing.

### Step 2 — Confirm `@tanstack/react-virtual` is installed

```bash
npm ls @tanstack/react-virtual
```

If absent, output the install command rather than running it: `npm install @tanstack/react-virtual`. Don't silently mutate `package.json`.

### Step 3 — Pick the row-height estimate

For a single-line table row: 36-48 px is typical.
For a card-style list item with title + subtitle: 72-96 px.
If rows have variable height (rich content, expandable details): use `measureElement` instead of `estimateSize`:

```tsx
const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 72, // starting estimate
  overscan: 5,
  getItemKey: (i) => rows[i].id,
  measureElement: (el) => el.getBoundingClientRect().height,
});
```

### Step 4 — Edit

Apply the transformation. Preserve:

- The row component (don't change `<TransactionRow>` — only how it's invoked)
- All ARIA attributes from the original
- Sticky header behaviour
- Any `data-testid` / `data-*` attributes

Add:

- `role="region"` + `aria-label` on the outer scroll container
- `aria-rowindex` on each rendered row (lets screen readers announce position)
- Fixed-height container (`h-[600px]` or use a CSS var so it can be parameterised)

### Step 5 — Verify

- `npm run typecheck` on the changed file.
- Open the page, scroll fast — no blank flashes; if there are, bump `overscan` or check `estimateSize`.
- Check screen-reader behaviour: each row should be announced with its position.
- Open React DevTools Profiler — record a scroll, the commit duration should be ~constant regardless of `rows.length`. If it scales with `rows.length`, the virtualiser isn't wired correctly.

### Step 6 — Tests

If a test exists for the component, add an assertion that only viewport rows are rendered:

```tsx
it('only renders viewport rows when given 5000 items', () => {
  const rows = Array.from({ length: 5000 }, (_, i) => makeFixture(i));
  render(<TransactionsTable rows={rows} />);
  // With overscan 5 and 600px container at 50px/row, ~17 rows visible + 10 overscan = ~27
  expect(screen.getAllByRole('row')).toHaveLength(expect.toBeWithin(20, 40));
});
```

(`toBeWithin` is a custom matcher — substitute your project's range assertion or use `.length).toBeGreaterThan(20)` + `.toBeLessThan(40)`.)

## Common pitfalls

- **Using array index as key** — breaks sort/filter (rows visually swap content). Always key by stable id.
- **`overscan: 0`** — saves DOM but causes blank flashes during inertial scrolls. Start at 5.
- **No fixed height on the scroll container** — virtualiser can't measure viewport, renders everything. The container needs `height` or `max-height` set in CSS.
- **Forgetting `transform: translateY`** — items render at the same position, only the top one visible. Look like the list is broken when it's actually all there.
- **`measureElement` for fixed-height rows** — extra work for no value. Only use it when rows actually vary.

## When NOT to virtualise

- **Fewer than ~60 rows** — un-virtualised is simpler, accessible by default, and not measurably slower.
- **Ctrl+F search is critical** — virtualised rows aren't in the DOM, so browser find won't see them. Provide an in-app search if you must virtualise this content type.
- **Print / PDF export** — printing virtualised content prints only the visible viewport. Provide an "unvirtualised print view" or render the full list off-screen for the print path.
- **Static / cached content** — `content-visibility: auto` is cheaper and doesn't break accessibility.

## Pairing with the data layer

Use TanStack Query's `useInfiniteQuery` paired with `useVirtualizer` + `IntersectionObserver` on the last visible row to trigger `fetchNextPage`. See `.claude/skills/perf-tuning/SKILL.md` for the wiring.

## References

- TanStack Virtual docs — https://tanstack.com/virtual/latest
- WAI-ARIA Authoring Practices, Listbox / Grid patterns — for accessible virtualised collections
- `bfsi-perf-react/SKILL.md` — for the broader perf methodology this fits into
