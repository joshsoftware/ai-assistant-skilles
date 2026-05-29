import { Component, type ErrorInfo, type ReactNode } from 'react';

import { ROUTES } from '../constants/routes.js';

interface Props {
  children: ReactNode;
}

interface State {
  errorRef: string | null;
}

/**
 * Generate a short, human-readable error reference code (e.g. `ERR-A7K2`).
 * Shown to users in the fallback UI so they can quote it when contacting
 * support. The 4-char alphabet excludes 0/O to avoid confusion.
 */
function generateErrorRef(): string {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  const bytes = new Uint8Array(4);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 4; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = 'ERR-';
  for (let i = 0; i < 4; i++) out += chars[bytes[i]! % chars.length];
  return out;
}

/**
 * BFSI error boundary. Catches render errors; shows a generic safe message
 * with a ref code that maps to a full log entry.
 *
 * NEVER expose error.message / error.stack to the UI — that leaks technical
 * detail per the bfsi-error-message skill.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { errorRef: null };

  static getDerivedStateFromError(_error: Error): State {
    return { errorRef: generateErrorRef() };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Forward to your observability (PII-scrubbed). Replace with your client.
    // For now, log to console with structure (`console.error` is allowed by the
    // project's no-console rule).
    console.error('[error-boundary]', {
      ref: this.state.errorRef,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.errorRef) {
      return (
        <main className="container mx-auto py-12">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-muted-foreground">
            We&apos;re sorry — an unexpected error occurred. If this persists, contact support with
            this reference:
          </p>
          <code className="mt-4 inline-block rounded bg-muted px-2 py-1 font-mono text-sm">
            {this.state.errorRef}
          </code>
          <div className="mt-6">
            <a className="underline" href={ROUTES.home}>
              Go back to home
            </a>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
