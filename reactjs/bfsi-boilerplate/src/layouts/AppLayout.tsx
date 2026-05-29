import { type ReactElement } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';

import { Image } from '@/components/common/Image';
import { clearAuthToken } from '@/lib/http';
import axiosInstance from '@/api/axiosInstance';
import { ROUTES } from '@/constants/routes';
import logoUrl from '@/assets/logo.svg';

/**
 * Layout for authenticated routes (Dashboard, future feature pages).
 *
 * Provides shared chrome — header with brand, logout — and an `<Outlet />`
 * for the page body. Pages rendered inside this layout must NOT add their
 * own `<main>` element.
 *
 * Per-route permission enforcement stays at the leaf via
 * `<ProtectedRoute permission="...">` — this layout is chrome only, not
 * an auth gate. See `bfsi-protected-route` skill for the rationale.
 *
 * Logout sequence (order matters):
 *   1. Drop auth token so no in-flight request authenticates.
 *   2. Clear TanStack Query cache so stale data doesn't leak on re-login.
 *   3. (Future) Reset Zustand stores via `resetAllStores()` — wire when the
 *      first app-wide store lands. See `bfsi-zustand-store`.
 *   4. Navigate to the login page.
 */
export function AppLayout(): ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  function handleLogout(): void {
    clearAuthToken(axiosInstance);
    queryClient.clear();
    navigate(ROUTES.login, { replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link
            to={ROUTES.dashboard}
            className="inline-flex items-center"
            aria-label="Go to dashboard"
          >
            <Image src={logoUrl} alt="[Brand] logo" width={160} height={40} priority />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
