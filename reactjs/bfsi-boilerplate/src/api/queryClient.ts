/**
 * TanStack Query client + sensible BFSI defaults.
 *
 * Defaults rationale:
 *   - `staleTime: 60_000` — most BFSI screens (lists, KYC summaries, profile)
 *     don't change second-to-second; a 1-minute fresh window cuts background
 *     refetches dramatically without serving badly stale data. Override per
 *     query for high-velocity data (transaction tickers, live balance).
 *   - `gcTime: 5 * 60_000` — keep cached responses for 5 minutes after the
 *     last subscriber unmounts, so route-back navigation is instant.
 *   - `refetchOnWindowFocus: false` — focus refetches surprise users in BFSI
 *     flows (e.g. tab-switch during OTP entry). Opt in per query if needed.
 *   - `retry: retryPolicy` — retry network/5xx once with backoff; never retry
 *     4xx (auth failures, validation errors). Mutations don't auto-retry
 *     (idempotency-key is the safety net, not blind retries).
 *
 * Tune per-query (`staleTime`, `gcTime`, `retry`) at each feature's call-site
 * for that data's needs. Promote a value to a global default here only when
 * three or more features have agreed on it.
 *
 * Full reference: `.claude/skills/perf-tuning/SKILL.md`.
 */
import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

const ONE_MINUTE_MS = 60_000;
const FIVE_MINUTES_MS = 5 * ONE_MINUTE_MS;

/**
 * Retry once on network or 5xx; never on 4xx (caller error).
 * 4xx means the request itself is wrong — retrying produces the same result
 * and wastes the user's connection.
 */
function retryPolicy(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (isAxiosError(error) && error.response) {
    const status = error.response.status;
    return status >= 500 && status < 600;
  }
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ONE_MINUTE_MS,
      gcTime: FIVE_MINUTES_MS,
      refetchOnWindowFocus: false,
      retry: retryPolicy,
    },
    mutations: {
      retry: false,
    },
  },
});
