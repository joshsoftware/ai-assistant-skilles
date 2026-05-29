/**
 * Login feature — service functions.
 *
 * Services are typed wrappers around the HTTP helpers. No React, no hooks,
 * no queryKeys here — they're trivially unit-testable and reusable.
 *
 * Pattern (mirrors stp-portal):
 *   - One function per endpoint.
 *   - Both request and response types passed explicitly to POST/GET/...
 *   - Endpoints come from `src/constants/endPoints.ts`, never inline.
 *   - Hooks (useMutation/useQuery) wrap these in `./hooks/useLogin.ts`.
 */
import { POST } from '@/api/http';
import { ENDPOINTS } from '@/constants/endPoints';

import type { ILoginRequest, ILoginResponse } from './types';

export const loginService = (payload: ILoginRequest): Promise<ILoginResponse> =>
  POST<ILoginRequest, ILoginResponse>(ENDPOINTS.LOGIN, payload);

export const logoutService = (): Promise<void> => POST<void, void>(ENDPOINTS.LOGOUT);
