import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { RAZORPAY_PAISE_MULTIPLIER } from '../../common/constants';

/** Shape returned by Razorpay orders.create(). */
export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;   // paise
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

/**
 * RazorpayService wraps the Razorpay Node SDK for order creation and
 * payment-signature verification.
 *
 * All amounts in this service are in PAISE (integer).
 * Multiply rupee amounts by RAZORPAY_PAISE_MULTIPLIER (100) before calling createOrder().
 * NEVER pass fractional paise.
 */
@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly client: Razorpay;
  readonly keyId: string;

  constructor(private readonly config: ConfigService) {
    this.keyId = config.getOrThrow<string>('RAZORPAY_KEY_ID');
    const keySecret = config.getOrThrow<string>('RAZORPAY_KEY_SECRET');

    this.client = new Razorpay({
      key_id: this.keyId,
      key_secret: keySecret,
    });
  }

  /**
   * Creates a Razorpay order for an online donation.
   *
   * @param amountRupees  Amount in Indian Rupees (e.g. 5100). Converted to paise internally.
   * @param receipt       Unique receipt identifier (used as correlation ID, e.g. donationId).
   * @param currency      Defaults to 'INR'.
   */
  async createOrder(
    amountRupees: number,
    receipt: string,
    currency = 'INR',
  ): Promise<RazorpayOrder> {
    // Amount must be an integer number of paise — never float
    const amountPaise = Math.round(amountRupees * RAZORPAY_PAISE_MULTIPLIER);

    this.logger.log(
      `Creating Razorpay order: ₹${amountRupees} (${amountPaise} paise), receipt=${receipt}`,
    );

    const order = (await this.client.orders.create({
      amount: amountPaise,
      currency,
      receipt,
    })) as RazorpayOrder;

    return order;
  }

  /**
   * Verifies the Razorpay payment signature sent by the client after checkout.
   * Used in the client-side flow (POST /donations/initiate-online follow-up).
   *
   * Signature = HMAC-SHA256("${orderId}|${paymentId}", keySecret)
   * Returns true if valid, false if not. Never throws.
   */
  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    signature: string,
  ): boolean {
    const keySecret = this.config.getOrThrow<string>('RAZORPAY_KEY_SECRET');
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;

    const expectedHex = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expBuffer = Buffer.from(expectedHex, 'hex');

    if (sigBuffer.length !== expBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expBuffer);
  }
}
