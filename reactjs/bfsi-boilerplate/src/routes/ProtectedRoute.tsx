import { type ReactNode, type ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { ROUTES } from '../constants/routes.js';

/**
 * v0.1 stub. Wire up to your auth context once you have it.
 *
 * Expected behaviour:
 *  - If not authenticated → redirect to /login (with `from` for return)
 *  - If authenticated but lacks `permission` → render 403 + emit audit event
 *  - Else → render children
 */
export interface ProtectedRouteProps {
  permission?: string;
  /** Override idle timeout for this route (in ms). */
  idleTimeoutMs?: number;
  children: ReactNode;
}

export function ProtectedRoute({
  permission: _permission,
  children,
}: ProtectedRouteProps): ReactElement {
  const location = useLocation();
  // TODO: wire to actual auth context
  const isAuthenticated = true; // placeholder
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }
  // TODO: check permission against user's permission set
  return <>{children}</>;
}
