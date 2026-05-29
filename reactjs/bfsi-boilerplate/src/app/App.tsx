import { type ReactElement } from 'react';
/**
 * TanStack variant App.tsx — overlays the _shared App.tsx with QueryClientProvider.
 */
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '../shared/ErrorBoundary.js';
import { AppRoutes } from '../routes/index.js';
import { queryClient } from '../api/queryClient.js';

export function App(): ReactElement {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
