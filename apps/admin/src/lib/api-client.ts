import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from '@/store/auth.store';
import { queryClient } from './query-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface ApiError {
  success: false;
  error: { code: string; message: string };
  requestId: string;
}

// ─── Axios instance ───────────────────────────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send httpOnly refresh-token cookie on every request
});

// ─── Request interceptor — attach Bearer token ────────────────────────────────

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — handle 401 + token refresh ───────────────────────

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

/** Drain the queue after a successful (or failed) refresh. */
function drainQueue(token: string | null, err: unknown = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(err);
  });
  refreshQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only attempt refresh on 401, and only once per request
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't retry the refresh endpoint itself — that would loop forever
    if (originalRequest.url?.includes('/auth/refresh')) {
      clearAccessToken();
      queryClient.clear();
      // Navigate to login — dispatch custom event (Router not available here)
      window.dispatchEvent(new CustomEvent('auth:logout'));
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the in-flight refresh completes
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      // POST /auth/refresh — the httpOnly cookie carries the refresh token;
      // no body needed. Server returns a new access token.
      const { data } = await apiClient.post<
        ApiResponse<{ accessToken: string; expiresIn: number }>
      >('/auth/refresh', {});

      const newToken = data.data.accessToken;
      setAccessToken(newToken);
      drainQueue(newToken);

      // Retry the original request with the new token
      if (originalRequest.headers) {
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      }
      return apiClient(originalRequest);
    } catch (refreshErr) {
      drainQueue(null, refreshErr);
      clearAccessToken();
      queryClient.clear();
      window.dispatchEvent(new CustomEvent('auth:logout'));
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);

// ─── Typed helpers ────────────────────────────────────────────────────────────

/** Unwraps the { success, data } envelope and returns T. */
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get<ApiResponse<T>>(url, { params });
  return res.data.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.post<ApiResponse<T>>(url, body);
  return res.data.data;
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.patch<ApiResponse<T>>(url, body);
  return res.data.data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.put<ApiResponse<T>>(url, body);
  return res.data.data;
}

export async function apiDelete(url: string): Promise<void> {
  await apiClient.delete(url);
}
