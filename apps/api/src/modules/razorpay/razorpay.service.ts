import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { RAZORPAY_PAISE_MULTIPLIER } from '../../common/constants';

/** Shape returned by Razorpay paymentLink.create(). */
export interface RazorpayPaymentLink {
  id: string;
  /** Short URL to send to the customer to complete payment. */
  short_url: string;
  status: string;
  amount: number; // paise
  currency: string;
  reference_id: string;
}

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
   * Creates a Razorpay Payment Link (for subscription billing by SUPER_ADMIN).
   * Returns a short_url the temple admin can open to complete payment.
   *
   * @param amountRupees  Amount in INR — converted to paise internally.
   * @param description   Shown to the payer in the checkout page.
   * @param referenceId   Correlation ID (e.g. templeId) for reconciliation.
   * @param notifyEmail   If provided, Razorpay will email the link to this address.
   */
  async createPaymentLink(
    amountRupees: number,
    description: string,
    referenceId: string,
    notifyEmail?: string,
  ): Promise<RazorpayPaymentLink> {
    const amountPaise = Math.round(amountRupees * RAZORPAY_PAISE_MULTIPLIER);

    this.logger.log(
      `Creating Razorpay payment link: ₹${amountRupees} (${amountPaise} paise), ref=${referenceId}`,
    );

    const payload: Record<string, unknown> = {
      amount: amountPaise,
      currency: 'INR',
      description,
      reference_id: referenceId,
      reminder_enable: true,
    };

    if (notifyEmail) {
      payload['customer'] = { email: notifyEmail };
      payload['notify'] = { email: true };
    }

    // The Razorpay SDK type definitions don't always export paymentLink — cast safely.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const link = await (this.client as any).paymentLink.create(payload);
    return link as RazorpayPaymentLink;
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
