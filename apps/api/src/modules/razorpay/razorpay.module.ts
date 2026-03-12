import { Module } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';

/**
 * RazorpayModule provides RazorpayService to any module that imports it.
 * Imported by DonationsModule (order creation) and WebhooksModule (signature verification).
 */
@Module({
  providers: [RazorpayService],
  exports: [RazorpayService],
})
export class RazorpayModule {}
