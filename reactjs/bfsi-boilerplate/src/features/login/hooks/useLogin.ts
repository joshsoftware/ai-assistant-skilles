/**
 * Login feature — TanStack Query hooks.
 *
 * Hooks wrap the service functions with `useMutation` / `useQuery`. They
 * stay tiny — no defaults, no onSuccess/onError baked in. Callers pass
 * those at the call-site so the same hook works for "login from /login",
 * "login from /resume-session", "force re-login on 401", etc.
 *
 * Pattern (mirrors stp-portal):
 *   - One hook per service function.
 *   - Naming: `use<Action>` (useLogin, useLogout — not useLoginMutation).
 *   - Mutations don't need a queryKey.
 *   - Queries use a key factory; declare it locally for one-off cases or
 *     promote to `src/constants/queryKeys.ts` once two features share keys.
 */
import { useMutation } from '@tanstack/react-query';

import { loginService, logoutService } from '../services';

export const useLogin = () => useMutation({ mutationFn: loginService });

export const useLogout = () => useMutation({ mutationFn: logoutService });
