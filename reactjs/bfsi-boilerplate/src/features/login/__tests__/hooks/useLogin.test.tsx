/**
 * Hook unit test. We exercise the TanStack mutation directly via
 * `renderHook`, fronting it with a fresh QueryClient so caches don't bleed
 * across tests. The underlying service module is mocked so the test stays
 * a unit test, not an integration test.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services', () => ({
  loginService: vi.fn(),
  logoutService: vi.fn(),
}));

import { createWrapper } from '@/test-utils/render';

import { loginService } from '../../services';
import type { ILoginResponse } from '../../types';
import { useLogin } from '../../hooks/useLogin';

const mockedLogin = vi.mocked(loginService);

const okResponse: ILoginResponse = {
  statusCode: 200,
  status: 'success',
  message: 'Logged in',
  data: {
    token: 'fake-jwt',
    userAttributes: {
      userId: 'u1',
      name: 'Amar',
      email: 'amar@example.com',
      roles: ['user'],
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useLogin', () => {
  it('calls loginService with the submitted credentials and exposes the response', async () => {
    mockedLogin.mockResolvedValueOnce(okResponse);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLogin(), { wrapper });

    result.current.mutate({ username: 'amar.j', password: 'sekrit' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // TanStack Query v5 passes a 2nd `context` arg ({ client, meta, mutationKey })
    // to mutationFn — assert only the payload, ignore the context.
    expect(mockedLogin).toHaveBeenCalledWith(
      { username: 'amar.j', password: 'sekrit' },
      expect.anything(),
    );
    expect(result.current.data).toEqual(okResponse);
  });

  it('surfaces errors via the mutation state', async () => {
    const failure = new Error('Invalid credentials');
    mockedLogin.mockRejectedValueOnce(failure);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useLogin(), { wrapper });

    result.current.mutate({ username: 'amar.j', password: 'wrong' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(failure);
  });
});
