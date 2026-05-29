/**
 * Single axios instance for the app. Auth token set ONCE at login via
 * setAuthToken() — not per-request.
 */
import { createAxios } from '@/lib/http';
import { env } from '../env.js';
import { ROUTES } from '../constants/routes.js';

const axiosInstance = createAxios({
  baseURL: env.VITE_API_BASE_URL,
  timeoutMs: env.VITE_API_TIMEOUT_MS,
  authHeaderName: env.VITE_AUTH_HEADER_NAME,
  onUnauthorized: () => {
    if (typeof window !== 'undefined') {
      window.location.href = ROUTES.login;
    }
  },
});

export default axiosInstance;
