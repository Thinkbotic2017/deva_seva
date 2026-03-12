import * as crypto from 'crypto';
import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DonationsService } from '../donations/donations.service';
import {
  RazorpayWebhookPayload,
} from './razorpay-webhook.types';

/**
 * RazorpayWebhookService processes incoming Razorpay webhook events.
 *
 * Security model:
 * - verifySignature() MUST be called before handle() on every webhook.
 *   An attacker who can POST fake payment.captured events gets free donations.
 * - HMAC-SHA256 of the raw request body is compared using timingSafeEqual
 *   to prevent timing-based signature oracle attacks.
 *
 * Response strategy:
 * - Invalid HMAC → throw UnauthorizedException (caller returns 401/400).
 * - Business logic errors (unknown order, duplicate event) → log and return.
 *   The webhook controller always returns HTTP 200 after HMAC passes so
 *   Razorpay does not retry on transient processing issues.
 */
@Injectable()
export class RazorpayWebhookService {
  private readonly logger = new Logger(RazorpayWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly donationsService: DonationsService,
  ) {}

  /**
   * Verifies the X-Razorpay-Signature header against the raw request body.
   * Throws UnauthorizedException immediately if the signature is invalid.
   *
   * Must be called with the raw Buffer body — NOT the parsed JSON body.
   * (Parsing changes whitespace and destroys the HMAC.)
   */
  verifySignature(rawBody: Buffer, signature: string): void {
    const secret = this.config.getOrThrow<string>('RAZORPAY_WEBHOOK_SECRET');

    const expectedHex = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expBuffer = Buffer.from(expectedHex, 'hex');

    // timingSafeEqual requires equal-length buffers — different lengths means invalid.
    if (
      sigBuffer.length !== expBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expBuffer)
    ) {
      this.logger.warn('Razorpay webhook signature mismatch — possible forged request');
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  /**
   * Routes a verified webhook payload to the appropriate handler.
   * Unrecognised events are silently ignored (Razorpay sends many event types).
   */
  async handle(payload: RazorpayWebhookPayload): Promise<void> {
    this.logger.log(`Razorpay webhook event: ${payload.event}`);

    switch (payload.event) {
      case 'payment.captured':
        await this.handlePaymentCaptured(payload);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(payload);
        break;
      default:
        this.logger.log(`Ignoring unhandled Razorpay event: ${payload.event}`);
    }
  }

  // ─── Private event handlers ───────────────────────────────────────────────

  /**
   * Confirms a donation after successful payment capture.
   * Idempotent: if the donation is already CONFIRMED, logs and returns silently.
   */
  private async handlePaymentCaptured(
    payload: RazorpayWebhookPayload,
  ): Promise<void> {
    const { order_id, id: paymentId, created_at } = payload.payload.payment.entity;

    const donation = await this.donationsService.findByRazorpayOrderId(order_id);

    if (!donation) {
      // Unknown order — could be from a different system or test payment.
      // Return without error so Razorpay stops retrying.
      this.logger.warn(`payment.captured for unknown order ${order_id} — ignoring`);
      return;
    }

    // Unix timestamp (seconds) → Date
    const captureDate = new Date(created_at * 1000);

    await this.donationsService.confirmOnlinePayment(
      donation.id,
      paymentId,
      captureDate,
    );
  }

  /**
   * Cancels a PENDING donation when the payment fails.
   * Idempotent: already-cancelled donations are silently skipped.
   * Does NOT cancel CONFIRMED donations (guards against out-of-order events).
   */
  private async handlePaymentFailed(
    payload: RazorpayWebhookPayload,
  ): Promise<void> {
    const { order_id } = payload.payload.payment.entity;

    const donation = await this.donationsService.findByRazorpayOrderId(order_id);

    if (!donation) {
      this.logger.warn(`payment.failed for unknown order ${order_id} — ignoring`);
      return;
    }

    await this.donationsService.cancelDonation(donation.id);
  }
}
