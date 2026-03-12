import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { Donation } from '../database/entities/donation.entity';
import { GupshupService } from '../common/services/gupshup.service';
import { S3Service } from '../common/services/s3.service';
import { DonationStatus } from '@devaseva/types';

/** Job data shape for the whatsapp_delivery queue. */
export interface WhatsAppDeliveryJobData {
  donationId: string;
}

/**
 * WhatsAppDeliveryProcessor handles whatsapp_delivery queue jobs.
 *
 * For each 'send_receipt' job:
 *   1. Loads the donation from the DB.
 *   2. Generates a pre-signed S3 URL for the receipt PDF (1hr TTL).
 *   3. Sends the PDF as a WhatsApp document via GupshupService.
 *   4. Updates the donation: receiptSentAt, status → RECEIPT_SENT.
 *
 * Error handling:
 * - Errors are caught, logged, and NOT re-thrown.
 * - Bull handles retries via job options set at enqueue time (exponential backoff).
 * - A missing phone number or missing PDF key are treated as permanent failures
 *   (logged as warnings) — no retry is useful for those cases.
 */
@Processor('whatsapp_delivery')
export class WhatsAppDeliveryProcessor {
  private readonly logger = new Logger(WhatsAppDeliveryProcessor.name);

  constructor(
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    private readonly gupshupService: GupshupService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Sends the receipt PDF to the donor via WhatsApp.
   *
   * @param job  Bull job with { donationId } payload.
   */
  @Process('send_receipt')
  async handleSendReceipt(
    job: Job<WhatsAppDeliveryJobData>,
  ): Promise<void> {
    const { donationId } = job.data;
    this.logger.log(
      `[whatsapp_delivery] Processing donationId=${donationId} (attempt ${job.attemptsMade + 1})`,
    );

    try {
      // ── 1. Load donation ─────────────────────────────────────────────────
      const donation = await this.donationRepo.findOne({
        where: { id: donationId },
      });
      if (!donation) {
        this.logger.warn(
          `[whatsapp_delivery] Donation ${donationId} not found — skipping`,
        );
        return;
      }

      // Permanent failure conditions — no point retrying
      if (!donation.donorPhone) {
        this.logger.warn(
          `[whatsapp_delivery] Donation ${donationId} has no donor phone — skipping`,
        );
        return;
      }
      if (!donation.receiptPdfS3Key) {
        this.logger.warn(
          `[whatsapp_delivery] Donation ${donationId} has no receipt PDF yet — skipping`,
        );
        return;
      }

      // ── 2. Generate pre-signed URL (1hr TTL) ─────────────────────────────
      const presignedUrl = await this.s3Service.getPresignedUrl(
        donation.receiptPdfS3Key,
      );

      // ── 3. Send via Gupshup ──────────────────────────────────────────────
      const filename = `receipt-${donation.receiptNumber ?? donationId}.pdf`;
      const caption = `Dear ${donation.donorName}, please find your donation receipt attached. Thank you! 🙏`;

      await this.gupshupService.sendDocument(
        donation.donorPhone,
        presignedUrl,
        filename,
        caption,
      );

      // ── 4. Update donation ───────────────────────────────────────────────
      await this.donationRepo.update(donationId, {
        receiptSentAt: new Date(),
        status: DonationStatus.RECEIPT_SENT,
      });

      this.logger.log(
        `[whatsapp_delivery] Receipt sent to ${donation.donorPhone} for donation ${donationId}`,
      );
    } catch (err: unknown) {
      // Log and return — do NOT re-throw.
      // Bull will check job.opts.attempts and retry automatically.
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[whatsapp_delivery] Failed for donationId=${donationId}: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }
}
