/**
 * Test-render helper for TanStack components and hooks. Wraps the unit under
 * test in a fresh QueryClient + MemoryRouter so caches don't leak across
 * tests and routing-dependent components work without a real browser.
 *
 * Usage:
 *
 *   const { getByLabelText, queryClient } = renderWithProviders(<LoginForm onLoggedIn={() => {}} />);
 *
 *   const wrapper = createWrapper();
 *   const { result } = renderHook(() => useLogin(), { wrapper });
 */
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ROUTES } from '@/constants/routes';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface ProviderOptions {
  queryClient?: QueryClient;
  initialRoute?: string;
}

export function createWrapper({
  queryClient,
  initialRoute = ROUTES.home,
}: ProviderOptions = {}): {
  wrapper: (props: { children: ReactNode }) => ReactElement;
  queryClient: QueryClient;
} {
  const client = queryClient ?? createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialRoute]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  return { wrapper: Wrapper, queryClient: client };
}

export function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {},
): RenderResult & { queryClient: QueryClient } {
  const { queryClient, initialRoute, ...renderOptions } = options;
  const { wrapper, queryClient: client } = createWrapper({ queryClient, initialRoute });
  return {
    ...render(ui, { wrapper, ...renderOptions }),
    queryClient: client,
  };
}
