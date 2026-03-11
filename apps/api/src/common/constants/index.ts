/** Maximum OTP verification attempts before the session is locked. */
export const MAX_OTP_ATTEMPTS = 3;

/** OTP validity window in seconds (10 minutes). */
export const OTP_EXPIRY_SECONDS = 600;

/** Max OTP requests allowed per phone number per hour. */
export const OTP_RATE_LIMIT_PER_HOUR = 5;

/** Default pagination page size. */
export const DEFAULT_PAGE_LIMIT = 20;

/** Maximum allowed page size — hard cap on all list endpoints. */
export const MAX_PAGE_LIMIT = 100;

/**
 * Expenses above this threshold (₹) require Trustee approval.
 * Runtime value overrides this via EXPENSE_APPROVAL_THRESHOLD env var.
 */
export const DEFAULT_EXPENSE_APPROVAL_THRESHOLD = 5000;

/** Pre-signed S3 URL validity in seconds (1 hour). */
export const S3_PRESIGN_TTL_SECONDS = 3600;

/** BullMQ job retry attempts for all queues. */
export const JOB_MAX_ATTEMPTS = 3;

/** BullMQ exponential backoff base delay in milliseconds. */
export const JOB_BACKOFF_DELAY_MS = 2000;

/** Redis key prefix for OTP rate limiting: otp_req:{phone} */
export const REDIS_KEY_OTP_REQUEST = (phone: string): string =>
  `otp_req:${phone}`;

/** Redis key prefix for receipt sequence: receipt_seq:{templeId}:{fiscalYear} */
export const REDIS_KEY_RECEIPT_SEQ = (
  templeId: string,
  fiscalYear: string,
): string => `receipt_seq:${templeId}:${fiscalYear}`;

/** Default receipt number prefix. Overridden per temple. */
export const DEFAULT_RECEIPT_PREFIX = 'RCPT';

/** Razorpay amounts are in paise — multiply rupees by this factor. */
export const RAZORPAY_PAISE_MULTIPLIER = 100;
