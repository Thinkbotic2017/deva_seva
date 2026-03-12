import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Donation } from '../database/entities/donation.entity';
import { Temple } from '../database/entities/temple.entity';
import { PdfService } from '../common/services/pdf.service';
import { S3Service } from '../common/services/s3.service';
import { DonationStatus } from '@devaseva/types';
import { JOB_MAX_ATTEMPTS, JOB_BACKOFF_DELAY_MS } from '../common/constants';

/** Job data shape for the receipt_generation queue. */
export interface ReceiptGenerationJobData {
  donationId: string;
}

/**
 * ReceiptGenerationProcessor handles receipt_generation queue jobs.
 *
 * For each 'generate' job:
 *   1. Loads the donation and its temple from the DB.
 *   2. Renders the 80G receipt HTML to a PDF buffer via PdfService (Puppeteer).
 *   3. Uploads the PDF buffer to S3.
 *   4. Updates the donation: receiptPdfS3Key, receiptGeneratedAt, status → RECEIPT_GENERATED.
 *   5. Queues a whatsapp_delivery job if the donor has a phone number.
 *
 * Error handling:
 * - Errors are caught, logged, and NOT re-thrown.
 * - Bull handles retries via job options set at enqueue time (JOB_MAX_ATTEMPTS, exponential backoff).
 * - Re-throwing would cause Bull to count the error as an unhandled rejection — not what we want.
 */
@Processor('receipt_generation')
export class ReceiptGenerationProcessor {
  private readonly logger = new Logger(ReceiptGenerationProcessor.name);

  constructor(
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(Temple)
    private readonly templeRepo: Repository<Temple>,
    @InjectQueue('whatsapp_delivery')
    private readonly whatsappQueue: Queue,
    private readonly pdfService: PdfService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Generates and stores a PDF receipt, then queues WhatsApp delivery.
   *
   * @param job  Bull job with { donationId } payload.
   */
  @Process('generate')
  async handleGenerate(
    job: Job<ReceiptGenerationJobData>,
  ): Promise<void> {
    const { donationId } = job.data;
    this.logger.log(`[receipt_generation] Processing donationId=${donationId} (attempt ${job.attemptsMade + 1})`);

    try {
      // ── 1. Load donation ─────────────────────────────────────────────────
      const donation = await this.donationRepo.findOne({
        where: { id: donationId },
      });
      if (!donation) {
        this.logger.warn(`[receipt_generation] Donation ${donationId} not found — skipping`);
        return;
      }

      // ── 2. Load temple ───────────────────────────────────────────────────
      const temple = await this.templeRepo.findOne({
        where: { id: donation.templeId },
      });
      if (!temple) {
        this.logger.warn(
          `[receipt_generation] Temple ${donation.templeId} not found for donation ${donationId} — skipping`,
        );
        return;
      }

      // ── 3. Generate PDF ──────────────────────────────────────────────────
      const pdfBuffer = await this.pdfService.generateDonationReceipt(donation, temple);

      // ── 4. Upload to S3 ──────────────────────────────────────────────────
      // Key format: receipts/{templeId}/{fiscalYear}/{donationId}.pdf
      const s3Key = `receipts/${donation.templeId}/${donation.fiscalYear}/${donationId}.pdf`;
      await this.s3Service.upload(s3Key, pdfBuffer, 'application/pdf');

      // ── 5. Update donation ───────────────────────────────────────────────
      await this.donationRepo.update(donationId, {
        receiptPdfS3Key: s3Key,
        receiptGeneratedAt: new Date(),
        status: DonationStatus.RECEIPT_GENERATED,
      });

      this.logger.log(
        `[receipt_generation] Receipt generated for donation ${donationId} [s3Key=${s3Key}]`,
      );

      // ── 6. Queue WhatsApp delivery ───────────────────────────────────────
      if (donation.donorPhone) {
        await this.whatsappQueue.add(
          'send_receipt',
          { donationId },
          {
            priority: 2,
            attempts: JOB_MAX_ATTEMPTS,
            backoff: { type: 'exponential', delay: JOB_BACKOFF_DELAY_MS },
          },
        );
        this.logger.log(
          `[receipt_generation] WhatsApp delivery queued for donation ${donationId}`,
        );
      }
    } catch (err: unknown) {
      // Log and return — do NOT re-throw.
      // Bull will check job.opts.attempts and retry automatically.
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[receipt_generation] Failed for donationId=${donationId}: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }
}
