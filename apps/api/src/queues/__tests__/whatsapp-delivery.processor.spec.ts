import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from 'bull';
import { WhatsAppDeliveryProcessor } from '../whatsapp-delivery.processor';
import { Donation } from '../../database/entities/donation.entity';
import { GupshupService } from '../../common/services/gupshup.service';
import { S3Service } from '../../common/services/s3.service';
import { DonationStatus } from '@devaseva/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DONATION_ID = 'donation-uuid';
const TEMPLE_ID = 'temple-uuid';
const PRESIGNED_URL = 'https://s3.example.com/presigned-receipt.pdf?sig=xyz';
const GUPSHUP_MSG_ID = 'gupshup-msg-001';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_DONATION: Partial<Donation> = {
  id: DONATION_ID,
  templeId: TEMPLE_ID,
  donorName: 'Priya Sharma',
  donorPhone: '9876543210',
  receiptNumber: 'RCPT-2025-26-0001',
  receiptPdfS3Key: `receipts/${TEMPLE_ID}/2025-26/${DONATION_ID}.pdf`,
  amount: '5100.00',
  fiscalYear: '2025-26',
  status: DonationStatus.RECEIPT_GENERATED,
};

/** Builds a minimal mock Bull Job. */
function makeJob(data: object = { donationId: DONATION_ID }): Job {
  return {
    data,
    attemptsMade: 0,
  } as Job;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('WhatsAppDeliveryProcessor', () => {
  let processor: WhatsAppDeliveryProcessor;
  let donationRepo: Record<string, jest.Mock>;
  let gupshupService: jest.Mocked<GupshupService>;
  let s3Service: jest.Mocked<S3Service>;

  beforeEach(async () => {
    donationRepo = {
      findOne: jest.fn().mockResolvedValue({ ...MOCK_DONATION }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    gupshupService = {
      sendDocument: jest.fn().mockResolvedValue(GUPSHUP_MSG_ID),
    } as unknown as jest.Mocked<GupshupService>;
    s3Service = {
      getPresignedUrl: jest.fn().mockResolvedValue(PRESIGNED_URL),
      upload: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<S3Service>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        WhatsAppDeliveryProcessor,
        { provide: getRepositoryToken(Donation), useValue: donationRepo },
        { provide: GupshupService, useValue: gupshupService },
        { provide: S3Service, useValue: s3Service },
      ],
    }).compile();

    processor = moduleRef.get(WhatsAppDeliveryProcessor);
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('generates a pre-signed URL from the donation receiptPdfS3Key', async () => {
    await processor.handleSendReceipt(makeJob());

    expect(s3Service.getPresignedUrl).toHaveBeenCalledWith(
      MOCK_DONATION.receiptPdfS3Key,
    );
  });

  it('sends the document via GupshupService with the correct phone and URL', async () => {
    await processor.handleSendReceipt(makeJob());

    expect(gupshupService.sendDocument).toHaveBeenCalledWith(
      MOCK_DONATION.donorPhone,
      PRESIGNED_URL,
      expect.stringContaining(MOCK_DONATION.receiptNumber!),
      expect.stringContaining(MOCK_DONATION.donorName!),
    );
  });

  it('updates donation with receiptSentAt and RECEIPT_SENT status', async () => {
    await processor.handleSendReceipt(makeJob());

    expect(donationRepo.update).toHaveBeenCalledWith(
      DONATION_ID,
      expect.objectContaining({
        receiptSentAt: expect.any(Date),
        status: DonationStatus.RECEIPT_SENT,
      }),
    );
  });

  // ── Graceful failure — permanent conditions (no retry warranted) ────────────

  it('returns without throwing when donation is not found', async () => {
    donationRepo.findOne.mockResolvedValue(null);

    await expect(processor.handleSendReceipt(makeJob())).resolves.toBeUndefined();
    expect(gupshupService.sendDocument).not.toHaveBeenCalled();
  });

  it('returns without throwing when donorPhone is absent', async () => {
    donationRepo.findOne.mockResolvedValue({
      ...MOCK_DONATION,
      donorPhone: undefined,
    });

    await expect(processor.handleSendReceipt(makeJob())).resolves.toBeUndefined();
    expect(gupshupService.sendDocument).not.toHaveBeenCalled();
  });

  it('returns without throwing when receiptPdfS3Key is absent', async () => {
    donationRepo.findOne.mockResolvedValue({
      ...MOCK_DONATION,
      receiptPdfS3Key: undefined,
    });

    await expect(processor.handleSendReceipt(makeJob())).resolves.toBeUndefined();
    expect(s3Service.getPresignedUrl).not.toHaveBeenCalled();
    expect(gupshupService.sendDocument).not.toHaveBeenCalled();
  });

  // ── Graceful failure — transient errors (Bull will retry) ──────────────────

  it('catches S3 getPresignedUrl errors and does NOT re-throw', async () => {
    s3Service.getPresignedUrl.mockRejectedValue(
      new Error('S3 service unavailable'),
    );

    await expect(processor.handleSendReceipt(makeJob())).resolves.toBeUndefined();
    expect(gupshupService.sendDocument).not.toHaveBeenCalled();
    expect(donationRepo.update).not.toHaveBeenCalled();
  });

  it('catches Gupshup API errors and does NOT re-throw', async () => {
    gupshupService.sendDocument.mockRejectedValue(
      new Error('Gupshup 429 Too Many Requests'),
    );

    await expect(processor.handleSendReceipt(makeJob())).resolves.toBeUndefined();
    // donation.update must NOT have been called if send failed
    expect(donationRepo.update).not.toHaveBeenCalled();
  });

  it('uses donationId as filename fallback when receiptNumber is absent', async () => {
    donationRepo.findOne.mockResolvedValue({
      ...MOCK_DONATION,
      receiptNumber: undefined,
    });

    await processor.handleSendReceipt(makeJob());

    expect(gupshupService.sendDocument).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.stringContaining(DONATION_ID),
      expect.any(String),
    );
  });
});
