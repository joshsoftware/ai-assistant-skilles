/**
 * Service-layer unit tests. Mock the shared axios instance once at the top
 * of the file — every service call funnels through it, so a single mock
 * covers every endpoint.
 *
 * Patterns:
 *   - Resolve with `{ data: <envelope> }` because the HTTP helpers unwrap
 *     `response.data` before returning.
 *   - Use `vi.mocked(...)` to keep type inference on the mocked methods.
 *   - One assertion per behaviour: the request shape AND the returned value.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/axiosInstance', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import axiosInstance from '@/api/axiosInstance';
import { ENDPOINTS } from '@/constants/endPoints';

import { loginService, logoutService } from '../services';
import type { ILoginResponse } from '../types';

const mockedPost = vi.mocked(axiosInstance.post);

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

describe('loginService', () => {
  it('POSTs to ENDPOINTS.LOGIN with the credentials and returns the parsed envelope', async () => {
    mockedPost.mockResolvedValueOnce({ data: okResponse });

    const result = await loginService({ username: 'amar.j', password: 'sekrit' });

    expect(mockedPost).toHaveBeenCalledTimes(1);
    expect(mockedPost).toHaveBeenCalledWith(
      ENDPOINTS.LOGIN,
      { username: 'amar.j', password: 'sekrit' },
      undefined,
    );
    expect(result).toEqual(okResponse);
  });

  it('propagates errors from axios so the caller (or TanStack) can handle them', async () => {
    const apiError = Object.assign(new Error('Unauthorized'), { status: 401 });
    mockedPost.mockRejectedValueOnce(apiError);

    await expect(loginService({ username: 'amar.j', password: 'wrong' })).rejects.toBe(apiError);
  });
});

describe('logoutService', () => {
  it('POSTs to ENDPOINTS.LOGOUT with no payload', async () => {
    mockedPost.mockResolvedValueOnce({ data: undefined });

    await logoutService();

    expect(mockedPost).toHaveBeenCalledWith(ENDPOINTS.LOGOUT, undefined, undefined);
  });
});
