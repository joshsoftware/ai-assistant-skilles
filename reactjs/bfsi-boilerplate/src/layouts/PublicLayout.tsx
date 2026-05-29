import { type ReactElement } from 'react';
import { Link, Outlet } from 'react-router-dom';

import { Image } from '@/components/common/Image';
import { ROUTES } from '@/constants/routes';
import logoUrl from '@/assets/logo.svg';

/**
 * Layout for unauthenticated routes (Landing, Login, dev showcase).
 *
 * Intentionally minimal — a slim top bar with the brand mark and an
 * `<Outlet />` for the page body. No nav, no user menu, no logout. Pages
 * rendered inside this layout must NOT add their own `<main>` element.
 */
export function PublicLayout(): ReactElement {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link to={ROUTES.home} className="inline-flex items-center" aria-label="Go to home">
            <Image src={logoUrl} alt="[Brand] logo" width={160} height={40} priority />
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default PublicLayout;
