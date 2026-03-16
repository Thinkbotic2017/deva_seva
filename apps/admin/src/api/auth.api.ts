import { apiGet, apiPost } from '@/lib/api-client';
import {
  setAccessToken,
  setRefreshToken,
  clearRefreshToken,
  getRefreshToken,
} from '@/store/auth.store';
import type { AuthUser } from '@/store/auth.store';

export interface RequestOtpResult {
  sessionId: string;
  expiresAt: string;
  /** Only present when the API is running in development mode. */
  devOtp?: string;
}

export interface VerifyOtpResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

/**
 * Step 1 — Request a login OTP.
 * Returns sessionId which must be passed to verifyOtp.
 */
export async function requestOtp(phone: string): Promise<RequestOtpResult> {
  return apiPost<RequestOtpResult>('/auth/request-otp', { phone });
}

/**
 * Step 2 — Verify OTP and obtain token pair.
 * Stores the access token in memory immediately.
 * The refresh token is returned in the response body and stored in localStorage under 'ds_rt'.
 */
export async function verifyOtp(
  sessionId: string,
  otp: string,
  deviceInfo?: string,
): Promise<VerifyOtpResult> {
  const result = await apiPost<VerifyOtpResult>('/auth/verify-otp', {
    sessionId,
    otp,
    deviceInfo,
  });
  // Store access token in memory; refresh token in localStorage
  setAccessToken(result.accessToken);
  setRefreshToken(result.refreshToken);
  return result;
}

/**
 * Logout — revokes the current session on the server, then clears local storage.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await apiPost('/auth/logout', { refreshToken });
  }
  clearRefreshToken();
}

/** Fetches the authenticated user's profile. */
export async function fetchMe(): Promise<{ user: AuthUser }> {
  return apiGet<{ user: AuthUser }>('/auth/me');
}
