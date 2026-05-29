/**
 * Frontend router paths. One home for every route string — wire these in
 * `src/routes/index.tsx` and reference from anywhere that navigates, redirects,
 * or links to a page. Never inline a path elsewhere.
 *
 * Grouping convention:
 *   - Top-level pages are flat keys (home, login, dashboard).
 *   - Multi-view features get a nested object (billing.invoice, ...).
 *   - `notFound` is the wildcard catch-all used by react-router.
 */
export const ROUTES = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  devShowcase: '/dev/showcase',
  notFound: '*',
} as const;
