import {
  Controller,
  Post,
  Headers,
  Body,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { RazorpayWebhookService } from './razorpay-webhook.service';
import { RazorpayWebhookPayload } from './razorpay-webhook.types';

/**
 * WebhooksController handles incoming webhooks from Razorpay and Gupshup.
 *
 * Security rules enforced here:
 * - EVERY webhook is HMAC-verified before any processing.
 * - HTTP 200 is returned after successful HMAC verification even if business logic
 *   fails, so Razorpay does not retry indefinitely on processing errors.
 * - All routes are @Public() — auth is via HMAC, not JWT.
 *
 * Raw body requirement:
 * - app is created with { rawBody: true } in main.ts.
 * - req.rawBody (Buffer) is used for HMAC — req.body (parsed JSON) would break the hash.
 */
@Controller('webhooks')
@Public()
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly razorpayWebhookService: RazorpayWebhookService,
  ) {}

  /**
   * POST /webhooks/razorpay
   *
   * Handles Razorpay payment events (payment.captured, payment.failed, etc.).
   * HMAC is verified first — throws UnauthorizedException if invalid.
   * All post-verification errors are caught and logged; 200 is still returned
   * so Razorpay's retry queue is satisfied.
   */
  @Post('razorpay')
  @HttpCode(HttpStatus.OK)
  async razorpay(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: RazorpayWebhookPayload,
  ): Promise<{ status: string }> {
    const rawBody = req.rawBody;

    if (!rawBody) {
      this.logger.error('Raw body not available — ensure app is created with rawBody: true');
      return { status: 'error' };
    }

    // HMAC verification — throws UnauthorizedException if invalid.
    // This is the security boundary: all further processing trusts the payload.
    this.razorpayWebhookService.verifySignature(rawBody, signature ?? '');

    // Process event — catch errors so Razorpay doesn't retry indefinitely
    try {
      await this.razorpayWebhookService.handle(body);
    } catch (error: unknown) {
      // Log but do NOT rethrow — return 200 to prevent Razorpay retries
      this.logger.error(
        `Error processing Razorpay event ${body?.event ?? 'unknown'}: ${String(error)}`,
      );
    }

    return { status: 'ok' };
  }
}
