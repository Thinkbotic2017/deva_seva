import { registerAs } from '@nestjs/config';

/** OTP security configuration. */
export const otpConfig = registerAs('otp', () => ({
  expirySeconds: parseInt(process.env['OTP_EXPIRY_SECONDS'] ?? '600', 10),
  maxAttempts: parseInt(process.env['OTP_MAX_ATTEMPTS'] ?? '3', 10),
  rateLimitPerHour: parseInt(process.env['OTP_RATE_LIMIT_PER_HOUR'] ?? '5', 10),
}));
