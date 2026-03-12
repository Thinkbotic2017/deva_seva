import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Job } from 'bull';
import { ReceiptGenerationProcessor } from '../receipt-generation.processor';
import { Donation } from '../../database/entities/donation.entity';
import { Temple } from '../../database/entities/temple.entity';
import { PdfService } from '../../common/services/pdf.service';
import { S3Service } from '../../common/services/s3.service';
import { DonationStatus } from '@devaseva/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DONATION_ID = 'donation-uuid';
const TEMPLE_ID = 'temple-uuid';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_DONATION: Partial<Donation> = {
  id: DONATION_ID,
  templeId: TEMPLE_ID,
  donorName: 'Ramesh Kumar',
  donorPhone: '9876543210',
  amount: '5100.00',
  fiscalYear: '2025-26',
  receiptNumber: 'RCPT-2025-26-0001',
  receiptPdfS3Key: undefined,
  is80gEligible: true,
};

const MOCK_TEMPLE: Partial<Temple> = {
  id: TEMPLE_ID,
  name: 'Shri Ram Mandir',
  is80gRegistered: true,
  number80g: '80G/2023/001',
};

const MOCK_PDF = Buffer.from('%PDF-1.4 mock');
const MOCK_S3_KEY = `receipts/${TEMPLE_ID}/2025-26/${DONATION_ID}.pdf`;

/** Builds a minimal mock Bull Job. */
function makeJob(data: object = { donationId: DONATION_ID }): Job {
  return {
    data,
    attemptsMade: 0,
  } as Job;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('ReceiptGenerationProcessor', () => {
  let processor: ReceiptGenerationProcessor;
  let donationRepo: Record<string, jest.Mock>;
  let templeRepo: Record<string, jest.Mock>;
  let whatsappQueue: Record<string, jest.Mock>;
  let pdfService: jest.Mocked<PdfService>;
  let s3Service: jest.Mocked<S3Service>;

  beforeEach(async () => {
    donationRepo = {
      findOne: jest.fn().mockResolvedValue({ ...MOCK_DONATION }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    templeRepo = {
      findOne: jest.fn().mockResolvedValue({ ...MOCK_TEMPLE }),
    };
    whatsappQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };
    pdfService = {
      generateDonationReceipt: jest.fn().mockResolvedValue(MOCK_PDF),
    } as unknown as jest.Mocked<PdfService>;
    s3Service = {
      upload: jest.fn().mockResolvedValue(MOCK_S3_KEY),
      getPresignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/receipt.pdf'),
    } as unknown as jest.Mocked<S3Service>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReceiptGenerationProcessor,
        { provide: getRepositoryToken(Donation), useValue: donationRepo },
        { provide: getRepositoryToken(Temple), useValue: templeRepo },
        { provide: getQueueToken('whatsapp_delivery'), useValue: whatsappQueue },
        { provide: PdfService, useValue: pdfService },
        { provide: S3Service, useValue: s3Service },
      ],
    }).compile();

    processor = moduleRef.get(ReceiptGenerationProcessor);
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('calls PdfService.generateDonationReceipt with the donation and temple', async () => {
    await processor.handleGenerate(makeJob());

    expect(pdfService.generateDonationReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ id: DONATION_ID }),
      expect.objectContaining({ id: TEMPLE_ID }),
    );
  });

  it('uploads PDF to S3 with the correct key format', async () => {
    await processor.handleGenerate(makeJob());

    expect(s3Service.upload).toHaveBeenCalledWith(
      `receipts/${TEMPLE_ID}/2025-26/${DONATION_ID}.pdf`,
      MOCK_PDF,
      'application/pdf',
    );
  });

  it('updates donation with s3Key, receiptGeneratedAt, and RECEIPT_GENERATED status', async () => {
    await processor.handleGenerate(makeJob());

    expect(donationRepo.update).toHaveBeenCalledWith(
      DONATION_ID,
      expect.objectContaining({
        receiptPdfS3Key: MOCK_S3_KEY,
        receiptGeneratedAt: expect.any(Date),
        status: DonationStatus.RECEIPT_GENERATED,
      }),
    );
  });

  it('queues a whatsapp_delivery job when donorPhone is present', async () => {
    await processor.handleGenerate(makeJob());

    expect(whatsappQueue.add).toHaveBeenCalledWith(
      'send_receipt',
      { donationId: DONATION_ID },
      expect.objectContaining({ priority: 2, attempts: 3 }),
    );
  });

  it('does NOT queue WhatsApp when donorPhone is absent', async () => {
    donationRepo.findOne.mockResolvedValue({
      ...MOCK_DONATION,
      donorPhone: undefined,
    });

    await processor.handleGenerate(makeJob());

    expect(whatsappQueue.add).not.toHaveBeenCalled();
  });

  // ── Graceful failure (no re-throw) ─────────────────────────────────────────

  it('returns without throwing when donation is not found', async () => {
    donationRepo.findOne.mockResolvedValue(null);

    // Must not throw — processor handles missing donations gracefully
    await expect(processor.handleGenerate(makeJob())).resolves.toBeUndefined();
    expect(pdfService.generateDonationReceipt).not.toHaveBeenCalled();
  });

  it('returns without throwing when temple is not found', async () => {
    templeRepo.findOne.mockResolvedValue(null);

    await expect(processor.handleGenerate(makeJob())).resolves.toBeUndefined();
    expect(pdfService.generateDonationReceipt).not.toHaveBeenCalled();
  });

  it('catches PdfService errors and does NOT re-throw', async () => {
    pdfService.generateDonationReceipt.mockRejectedValue(
      new Error('Puppeteer crashed'),
    );

    // Must resolve (not reject) — Bull handles retries via job opts
    await expect(processor.handleGenerate(makeJob())).resolves.toBeUndefined();
    // S3 upload must NOT have been called after PDF failure
    expect(s3Service.upload).not.toHaveBeenCalled();
  });

  it('catches S3 upload errors and does NOT re-throw', async () => {
    s3Service.upload.mockRejectedValue(new Error('S3 connection timeout'));

    await expect(processor.handleGenerate(makeJob())).resolves.toBeUndefined();
    // donation.update must NOT have been called after S3 failure
    expect(donationRepo.update).not.toHaveBeenCalled();
  });

  it('catches whatsappQueue.add errors and does NOT re-throw', async () => {
    whatsappQueue.add.mockRejectedValue(new Error('Redis unavailable'));

    // Queue failure must not propagate — receipt was already generated successfully
    await expect(processor.handleGenerate(makeJob())).resolves.toBeUndefined();
  });
});
