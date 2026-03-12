/**
 * Razorpay webhook payload types.
 * These are structural types matching the Razorpay webhook JSON body.
 * Not DTO classes — HMAC is verified before any processing, so class-validator isn't needed.
 */

export interface RazorpayPaymentEntity {
  /** Payment ID — e.g. pay_AbCd1234 */
  id: string;
  /** Order ID — e.g. order_AbCd1234 */
  order_id: string;
  /** Amount in paise (integer). */
  amount: number;
  currency: string;
  status: string;
  /** Unix timestamp (seconds) of payment capture. */
  created_at: number;
}

export interface RazorpayWebhookPayload {
  /** Event name — e.g. 'payment.captured', 'payment.failed' */
  event: string;
  account_id: string;
  created_at: number;
  payload: {
    payment: {
      entity: RazorpayPaymentEntity;
    };
  };
}
