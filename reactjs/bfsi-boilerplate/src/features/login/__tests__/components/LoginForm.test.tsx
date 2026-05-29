/**
 * Component test for LoginForm. Drives the form via Testing Library + user
 * events — same path a real user takes. The service is mocked so we
 * exercise the RHF + Zod + useMutation wiring, not the network.
 */
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services', () => ({
  loginService: vi.fn(),
  logoutService: vi.fn(),
}));

import { renderWithProviders } from '@/test-utils/render';

import { loginService } from '../../services';
import type { ILoginResponse } from '../../types';
import { LoginForm } from '../../components/LoginForm';

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

describe('<LoginForm />', () => {
  it('blocks submission and shows field errors when credentials are missing', async () => {
    const onLoggedIn = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<LoginForm onLoggedIn={onLoggedIn} />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/username must be at least/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(mockedLogin).not.toHaveBeenCalled();
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  it('submits valid credentials and calls onLoggedIn with the response', async () => {
    mockedLogin.mockResolvedValueOnce(okResponse);
    const onLoggedIn = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<LoginForm onLoggedIn={onLoggedIn} />);

    await user.type(screen.getByLabelText(/username/i), 'amar.j');
    await user.type(screen.getByLabelText(/password/i), 'sekrit');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith(okResponse));
    // TanStack Query v5 passes a 2nd `context` arg to mutationFn — only the payload matters here.
    expect(mockedLogin).toHaveBeenCalledWith(
      { username: 'amar.j', password: 'sekrit' },
      expect.anything(),
    );
  });

  it('renders an error message when the service rejects', async () => {
    mockedLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
    const user = userEvent.setup();

    renderWithProviders(<LoginForm onLoggedIn={vi.fn()} />);

    await user.type(screen.getByLabelText(/username/i), 'amar.j');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
