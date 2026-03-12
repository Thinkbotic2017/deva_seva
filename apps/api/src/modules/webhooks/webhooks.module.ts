import { Module } from '@nestjs/common';
import { DonationsModule } from '../donations/donations.module';
import { RazorpayWebhookService } from './razorpay-webhook.service';
import { WebhooksController } from './webhooks.controller';

/**
 * WebhooksModule handles all inbound webhook events.
 * Imports DonationsModule to access DonationsService (confirmation, cancellation).
 * ConfigService is available globally and injected directly into RazorpayWebhookService.
 */
@Module({
  imports: [DonationsModule],
  providers: [RazorpayWebhookService],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
