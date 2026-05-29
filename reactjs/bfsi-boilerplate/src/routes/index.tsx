import { Suspense, lazy, type ReactElement } from 'react';
/**
 * App routes. Treat this file as the wiring layer:
 *   - Import feature pages from `src/features/<feature>/index.tsx`
 *     using `React.lazy()` for route-level code splitting.
 *   - Group routes under a layout via the React-Router-v6 parent/`<Outlet />`
 *     pattern (`<Route element={<PublicLayout />}>...`). Layouts own chrome;
 *     pages render only their content.
 *   - Wrap protected routes in `<ProtectedRoute permission="...">` — auth
 *     and per-route permission stay at the leaf, NOT the layout. See
 *     `bfsi-protected-route` for the rationale.
 *   - Keep route paths in `src/constants/routes.ts` only.
 */
import { Routes, Route } from 'react-router-dom';

import { ProtectedRoute } from './ProtectedRoute.js';
import { AppLayout, PublicLayout } from '../layouts/index.js';
import { ROUTES } from '../constants/routes.js';

// Route-level code splitting: each feature page ships as its own chunk and
// loads on first navigation. The landing page stays in the main bundle so
// the very first paint is fast.
const LoginPage = lazy(() => import('../features/login/index.js'));

// Vite treats `import.meta.env.DEV` as a compile-time constant, so the
// entire lazy() expression is dead-code-eliminated in production — neither
// the chunk nor the dynamic import survives the build.
const ShowcasePage = import.meta.env.DEV
  ? lazy(() => import('../features/showcase/index.js'))
  : null;

function RouteFallback(): ReactElement {
  return (
    <div aria-busy="true" aria-live="polite" className="py-12">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

export function AppRoutes(): ReactElement {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path={ROUTES.home} element={<Landing />} />
          <Route path={ROUTES.login} element={<LoginPage />} />
          {ShowcasePage && <Route path={ROUTES.devShowcase} element={<ShowcasePage />} />}
        </Route>

        <Route element={<AppLayout />}>
          <Route
            path={ROUTES.dashboard}
            element={
              <ProtectedRoute permission="dashboard.view">
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path={ROUTES.notFound} element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function Landing(): ReactElement {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">{`{{projectName}}`}</h1>
      <p className="mt-2 text-muted-foreground">
        Scaffolded from @react-vault/create-app. Go to{' '}
        <a className="underline" href={ROUTES.login}>
          {ROUTES.login}
        </a>{' '}
        to try the example feature, then{' '}
        <a className="underline" href={ROUTES.dashboard}>
          {ROUTES.dashboard}
        </a>
        .
      </p>
      {import.meta.env.DEV && (
        <p className="mt-4 text-sm text-muted-foreground">
          Dev only:{' '}
          <a className="underline" href={ROUTES.devShowcase}>
            {ROUTES.devShowcase}
          </a>{' '}
          renders every shipped BFSI primitive.
        </p>
      )}
      <p className="mt-4 text-sm text-muted-foreground">
        Run <code className="rounded bg-muted px-1.5 py-0.5">claude</code> in this directory to
        start a Claude Code session with the BFSI toolkit enabled. Then run{' '}
        <code className="rounded bg-muted px-1.5 py-0.5">/bfsi-doctor</code>.
      </p>
    </>
  );
}

function Dashboard(): ReactElement {
  return (
    <>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Protected by &lt;ProtectedRoute&gt;.</p>
    </>
  );
}

function NotFound(): ReactElement {
  return (
    <main className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-muted-foreground">
        The page you were looking for doesn&apos;t exist.
      </p>
    </main>
  );
}
