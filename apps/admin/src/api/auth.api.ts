import { apiPost } from '@/lib/api-client';
import { setAccessToken } from '@/store/auth.store';
import type { AuthUser } from '@/store/auth.store';

export interface RequestOtpResult {
  sessionId: string;
  expiresAt: string;
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
 * The refresh token arrives as an httpOnly cookie — not accessible to JS.
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
  // Store access token in memory — never localStorage
  setAccessToken(result.accessToken);
  return result;
}

/**
 * Logout — revokes the current session on the server.
 * The httpOnly cookie will be cleared by the server's Set-Cookie response.
 */
export async function logout(sessionId: string): Promise<void> {
  await apiPost('/auth/logout', { sessionId });
}

/** Fetches the authenticated user's profile. */
export async function fetchMe(): Promise<{ user: AuthUser }> {
  return apiPost<{ user: AuthUser }>('/auth/me');
}
