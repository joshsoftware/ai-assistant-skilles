/**
 * Typed HTTP helpers for TanStack Query feature services.
 *
 * Generic order is <TRequest, TResponse> — request first, response second —
 * matching how services read in the codebase:
 *
 *   POST<ILoginRequest, ILoginResponse>('/auth/login', payload)
 *                 ^^^^^^^^^^^^^                 ^^^^^^^^^^^^^^^
 *                 send this                     get this back
 *
 * Usage in a feature service:
 *
 *   import { GET, POST } from '@/api/http';
 *
 *   export const loginService = (payload: ILoginRequest): Promise<ILoginResponse> =>
 *     POST<ILoginRequest, ILoginResponse>(ENDPOINTS.LOGIN, payload);
 *
 * Then wrap with useMutation / useQuery in the feature's hooks file:
 *
 *   export const useLogin = () => useMutation({ mutationFn: loginService });
 */
import type { AxiosRequestConfig } from 'axios';
import axiosInstance from './axiosInstance.js';

export async function GET<TResponse, TParams = void>(
  url: string,
  params?: TParams,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  const { data } = await axiosInstance.get<TResponse>(url, { ...config, params });
  return data;
}

export async function POST<TRequest = void, TResponse = unknown>(
  url: string,
  payload?: TRequest,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  const { data } = await axiosInstance.post<TResponse>(url, payload, config);
  return data;
}

export async function PUT<TRequest = void, TResponse = unknown>(
  url: string,
  payload?: TRequest,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  const { data } = await axiosInstance.put<TResponse>(url, payload, config);
  return data;
}

export async function PATCH<TRequest = void, TResponse = unknown>(
  url: string,
  payload?: TRequest,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  const { data } = await axiosInstance.patch<TResponse>(url, payload, config);
  return data;
}

export async function DELETE<TResponse = void>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  const { data } = await axiosInstance.delete<TResponse>(url, config);
  return data;
}
