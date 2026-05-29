---
name: bfsi-perf-react
description: Reference for React performance optimisation in a BFSI app — measurement-first methodology, memoisation rules, list virtualisation, code-splitting, bundle analysis, re-render cascades, heavy-component lazy-loading, and BFSI-specific concerns (audit log tables, PII reveal not re-triggering parent renders, OTP focus preservation). Auto-loads when the user asks about performance, slow rendering, jank, large lists, bundle size, memoisation, React.memo / useMemo / useCallback, profiling, Lighthouse / web-vitals, or before shipping a high-volume screen.
---

# BFSI React Performance — Reference

Performance work in BFSI is rarely "the framework is slow"; it's almost always (1) too much data on screen at once, (2) re-render cascades from a chatty data source, or (3) heavy dependencies that didn't need to be in the main bundle. This reference covers the patterns the toolkit's `bfsi-performance-reviewer` agent looks for, and gives concrete fixes you can apply.

Pairs with the data-layer perf skill: `.claude/skills/perf-tuning/SKILL.md` (TanStack Query tuning — `staleTime`, `gcTime`, `select`, `useInfiniteQuery`, optimistic updates).

## The rule that overrides everything else

**Measure first, then change one thing.** Without a measurement you don't know whether your fix helped, hurt, or did nothing. Fixes that "feel" faster without a number behind them are how perf debt accumulates.

Recommended tools, in order of reach:

1. **React DevTools Profiler** — flamegraph, "why did this render", commit duration. Free, in-browser. Use this first.
2. **Chrome DevTools Performance tab** — main-thread JS time, layout/paint, long tasks. Use this when the React profiler points outside React.
3. **`web-vitals` library** — wire `onCLS`, `onLCP`, `onINP`, `onTTFB` to your audit pipeline. Real-user metrics beat synthetic ones for prioritisation.
4. **Lighthouse** — synthetic baseline + bundle/asset audit. Run in CI on PRs that touch hot routes.
5. **`vite-bundle-visualizer`** (or `rollup-plugin-visualizer`) — see what's actually in your chunks. Run before assuming a dep is small.
6. **React Scan** (when available) — highlights what re-rendered. Useful for hunting re-render cascades.

If you're "measuring" by F5 + how it feels, write a number down first.

## Memoisation: when YES and when NO

Default to NOT memoising. Memo costs real CPU (shallow equality check on every parent render) and obscures the code. Only memoise when:

| Condition                                                                                                | Memoise?                                                 |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Pure component renders a heavy subtree (charts, virtualised lists, complex JSX)                          | yes                                                      |
| Component sits inside a parent that re-renders often (e.g. transaction-list row inside a polling parent) | yes                                                      |
| Component takes only primitive props that change rarely                                                  | maybe                                                    |
| Component takes inline `() => {}` or `{x: 1}` from parent                                                | NO (parent's inlines defeat memo — fix the inline first) |
| Component is small (single `<div>` with a label)                                                         | NO                                                       |
| You haven't profiled it                                                                                  | NO                                                       |

### `useMemo` / `useCallback` rules

- **`useCallback`** for handlers passed to `React.memo`-wrapped children or to virtualised-list row renderers. Otherwise: don't bother.
- **`useMemo`** for expensive derivations (sorts, filters of >100 items, schema validation, currency conversion across rows). Cheap arithmetic doesn't need it.
- **Dep arrays**: every reference in the body of the callback/memo must appear in deps OR be intentionally stale (then justify in a comment). Lint with `react-hooks/exhaustive-deps`.

### Common anti-patterns

```tsx
// ❌ Memoising a primitive
const memoTotal = useMemo(() => a + b, [a, b]);  // pointless

// ❌ Memoising with unstable deps (defeats memo)
const memoRow = useMemo(() => <Row data={data} />, [{ ...data }]); // new object every render

// ❌ useCallback on a handler that isn't passed to a memo child
const handleClick = useCallback(() => doThing(), []); // no value — costs more than it saves

// ✅ Stable handler for a memo'd list row
const TransactionRow = React.memo(({ txn, onTagClick }) => /* ... */);
const handleTagClick = useCallback((tag) => setActiveTag(tag), []);
```

## List virtualisation

BFSI screens routinely render thousands of rows: transactions, audit events, KYC submissions, statement lines. Without virtualisation, the browser holds every row in the DOM, scroll is janky, and every state update re-renders the world.

Use the `bfsi-perf-virtualize-list` action skill to wrap a list with `@tanstack/react-virtual`. Manual checklist:

- Rows must have a **stable, unique key** that survives sort/filter (an `id`, not array index).
- Estimate a row's height accurately — `estimateSize` too small causes overscroll bounce; too large wastes DOM.
- Set `overscan` to 5–10 rows. Higher overscan smooths fast scrolls at the cost of DOM size.
- **Don't virtualise above 60 rows unless you have evidence the un-virtualised version is slow.** Virtualisation breaks Ctrl+F text search and complicates screen-reader navigation.
- For tables, use `@tanstack/react-virtual` per-row + sticky `<thead>`. The horizontal scroll axis usually doesn't need virtualisation unless columns are also dynamic.
- For "infinite scroll" feeds (audit log, notifications), pair virtualisation with `IntersectionObserver` to trigger the next page.

Alternatives:

- **`react-window`** — older, simpler API. Still good for vanilla lists.
- **MUI DataGrid Pro / AG Grid** — when you need filtering, grouping, cell editing, column resize. Both virtualise rows AND columns internally. Worth the licence cost for power-user dashboards (e.g. ops console for fraud analysts).
- **CSS `content-visibility: auto`** — cheap "browser virtualisation". Good for static blocks (statement PDFs, transcripts). Doesn't fix re-renders, only paint.

## Re-render cascades

The expensive case in React isn't "this component renders"; it's "this component re-renders 200 children every time anything changes". Hunt this in the Profiler's "Ranked" view (sort by render time).

### Symptoms

- Typing in an input lags by a few hundred milliseconds.
- A polling query refresh visibly stutters the page.
- Scrolling a virtualised list re-renders rows that didn't change.

### Fixes (in order of impact)

1. **Lift state DOWN, not up.** A `selectedTab` that lives in the page-level container re-renders the whole page on tab change. Move it into the tab strip component.
2. **Split contexts.** A single `AuthContext` with `{ user, token, permissions, lastActivity }` re-renders everything that consumes it whenever any field changes. Split into `UserContext`, `TokenContext`, `PermissionsContext`. Components subscribe only to what they read.
3. **Memoise expensive children**, NOT the parent. Wrapping the parent doesn't help; wrapping the slow child does.
4. **Stable handlers** via `useCallback` (only when passing to memo children).
5. **Stop spreading props.** `<Foo {...props}>` then mutating a sub-key breaks referential equality everywhere downstream.
6. **Use `useSyncExternalStore`** for high-frequency external data (WebSocket tickers, browser events). See `bfsi-perf-real-time`.

## Code splitting

Every route should be a `lazy()` boundary:

```tsx
const Dashboard = lazy(() => import('@/features/Dashboard'));
const KycList = lazy(() => import('@/features/Kyc'));
const TransactionDetail = lazy(() => import('@/features/Transactions/Detail'));

// Wrap once at the route boundary:
<Suspense fallback={<RouteFallback />}>
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route path="/kyc" element={<KycList />} />
    {/* ... */}
  </Routes>
</Suspense>;
```

Additional split candidates (one chunk each):

- **Admin / settings routes** — different audience than customer routes. No point shipping admin to customers.
- **Charts** (Recharts / D3 / Chart.js) — heavy and only used on dashboards/reports.
- **PDF generation** (`jspdf`, `pdfmake`) — only used on statement download.
- **Date pickers** (`react-day-picker`, `react-datepicker`) — only on forms with date fields. For form fields that only need YYYY-MM-DD, prefer `<input type="date">` (native, zero JS).
- **Editor libraries** (`react-quill`, `@tiptap/react`) — only on KYC document upload note fields.

Don't split too granularly. Each chunk = one network request. On a 4G connection, 30 chunks is slower than 5 chunks.

## Bundle size

Hard floor: **the first paint route should be ≤ 200 KB gzipped JS** for an authenticated SPA. Marketing / login page should be ≤ 100 KB.

Common bloat sources:

- **`lodash`** wholesale (`import _ from 'lodash'`) — 71 KB gzipped. Switch to `lodash-es` + per-fn imports (`import debounce from 'lodash-es/debounce'`) or `radash` / native equivalents.
- **`moment`** — 75 KB gzipped, deprecated. Switch to `date-fns` (tree-shakeable) or `dayjs` (2 KB).
- **`@mui/icons-material`** wholesale — barrel re-export of 6000+ icons. Use per-icon imports (`import HomeIcon from '@mui/icons-material/Home'`) or switch to `lucide-react` (tree-shakeable).
- **Two date libs / two HTTP libs / two state libs** — pick one. Run `pnpm why <pkg>` to find the offender.
- **Polyfills** for browsers you don't target. Set `build.target` in `vite.config.ts` to the lowest browser you support; Vite drops polyfills above that.

Run `pnpm dlx vite-bundle-visualizer` (or your project's `pnpm build --analyze` if wired) before merging anything that adds a top-level dep > 50 KB minified.

## Heavy components

| Component                                 | Default cost                        | Cheap-er fix                                                |
| ----------------------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| Recharts area / line                      | 60 KB + render                      | Lazy-import; render only when visible                       |
| MUI `<TextField>`                         | Heavy due to global style injection | Plain `<input>` + your own styles for grid/form-array cells |
| Custom rich-text editor                   | 100+ KB                             | `<textarea>` for non-rich content                           |
| Country / currency dropdown of 200+ items | Pop-render                          | `<Combobox>` with virtualised options                       |
| Date picker calendar                      | 30+ KB                              | `<input type="date">` for the simple case                   |

Heavy components also pay render cost. A grid of 40 MUI `TextField`s per row × 50 rows = 2000 mounts, which is jank on submit. Replace with plain inputs + custom styling; restore MUI only on focus if you need its label/floating behaviour.

## Profile-first methodology

For any "this is slow" report:

1. **Reproduce in dev with realistic data volume.** Generate a fixture with 5000 transactions if that's what prod has.
2. **Profile with React DevTools first.** Identify the slow commit. Note the commit duration and which component is dominating.
3. **Re-profile with Chrome DevTools Performance tab** if React isn't the bottleneck. Look for long tasks (yellow), forced reflows (red triangles), main-thread blocking.
4. **Change ONE thing.** Don't memo + virtualise + lazy-load in the same commit; you won't know which one helped.
5. **Re-measure.** If the number didn't move, revert.
6. **Commit with the before/after number in the message.** `perf(transactions): virtualise list — first commit 480 ms → 95 ms (5000 rows)`.

## BFSI-specific perf concerns

- **Audit log table** — append-only, can grow to hundreds of thousands of rows. ALWAYS virtualise; tail-load newest first; paginate older.
- **Transaction list** — same; newest-first; older on scroll.
- **Live balance feed** — subscribe ONCE at app shell, expose via a small context; do not re-subscribe per component (each subscription = one WebSocket connection).
- **OTP screens** — avoid re-renders that reset input focus. Bug pattern: parent state update on every digit blurs the active input. Use uncontrolled inputs + `ref.current.focus()` for the next field.
- **PII reveal** — clicking "reveal PAN" should fire ONE audit event and ONE render. A bug pattern: parent re-renders (because audit-state changed) and the audit fires again, in a loop. Test with the audit-client spy and assert call count = 1.
- **Form arrays** (transaction split, beneficiary list) — RHF `useFieldArray` is efficient if you key by `field.id`, NOT by array index. Index keys cause every row to re-render on insert/remove.
- **Currency formatter** in a virtualised list — memoise the `Intl.NumberFormat` instance at module scope. Constructing one per render per row = thousands of objects/sec.

## When NOT to optimise

- **Before measuring.** Premature optimisation is a real cost.
- **For developer convenience.** "Wrapping everything in `useCallback` for safety" is anti-pattern.
- **For static content.** A marketing page that loads once doesn't need virtualisation.
- **For data the user can paginate.** If the user can ask for 20 rows at a time, give them 20 rows.

## References

- React docs — [Profiler](https://react.dev/reference/react/Profiler), [Render and commit](https://react.dev/learn/render-and-commit)
- TanStack Virtual — https://tanstack.com/virtual/latest
- web-vitals — https://github.com/GoogleChrome/web-vitals
- Chrome DevTools Performance — https://developer.chrome.com/docs/devtools/performance
- Bundle analysis — https://github.com/btd/rollup-plugin-visualizer
