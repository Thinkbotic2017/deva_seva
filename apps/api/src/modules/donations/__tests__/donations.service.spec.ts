import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getQueueToken } from '@nestjs/bull';
import { DonationsService } from '../donations.service';
import { FinanceService } from '../../finance/finance.service';
import { RazorpayService } from '../../razorpay/razorpay.service';
import { Donation } from '../../../database/entities/donation.entity';
import { DonationCategory } from '../../../database/entities/donation-category.entity';
import { Temple } from '../../../database/entities/temple.entity';
import { EncryptionUtil } from '../../../common/utils/encryption.util';
import { FiscalYearUtil } from '../../../common/utils/fiscal-year.util';
import { ReceiptNumberUtil } from '../../../common/utils/receipt-number.util';
import { S3Service } from '../../../common/services/s3.service';
import { CreateDonationDto } from '../dto/create-donation.dto';
import { DonationMode, DonationStatus } from '@devaseva/types';

// ─── Mock factories ──────────────────────────────────────────────────────────

/** A minimal mock EntityManager — only the methods DonationsService exercises. */
function mockEntityManager() {
  return {
    create: jest.fn((Entity: unknown, data: unknown) => data),
    save: jest
      .fn()
      .mockResolvedValue({ id: 'donation-uuid', receiptNumber: undefined }),
  };
}

/** DataSource mock whose transaction() calls the callback with the mock EntityManager. */
function mockDataSource() {
  const em = mockEntityManager();
  return {
    _em: em, // Expose so tests can assert on it
    transaction: jest.fn((cb: (em: ReturnType<typeof mockEntityManager>) => unknown) =>
      cb(em),
    ),
  };
}

const TEMPLE_ID = 'temple-uuid';
const USER_ID = 'user-uuid';

const MOCK_TEMPLE: Partial<Temple> = {
  id: TEMPLE_ID,
  is80gRegistered: true,
  receiptPrefix: 'RCPT',
  isActive: true,
};

const MOCK_CATEGORY: Partial<DonationCategory> = {
  id: 'cat-uuid',
  templeId: TEMPLE_ID,
  is80gEligible: true,
};

const VALID_DTO: CreateDonationDto = {
  categoryId: 'cat-uuid',
  donorName: 'Ramesh Kumar',
  donorPhone: '9876543210',
  amount: 5100,
  mode: DonationMode.CASH,
  paymentDate: '2025-06-15',
};

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('DonationsService', () => {
  let service: DonationsService;
  let donationRepo: Record<string, jest.Mock>;
  let categoryRepo: Record<string, jest.Mock>;
  let templeRepo: Record<string, jest.Mock>;
  let receiptQueue: Record<string, jest.Mock>;
  let financeService: jest.Mocked<FinanceService>;
  let encryptionUtil: jest.Mocked<EncryptionUtil>;
  let fiscalYearUtil: jest.Mocked<FiscalYearUtil>;
  let receiptNumberUtil: jest.Mocked<ReceiptNumberUtil>;
  let s3Service: jest.Mocked<S3Service>;
  let razorpayService: jest.Mocked<RazorpayService>;
  let ds: ReturnType<typeof mockDataSource>;

  beforeEach(async () => {
    ds = mockDataSource();

    donationRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(),
    };
    categoryRepo = { findOne: jest.fn() };
    templeRepo = { findOne: jest.fn() };
    receiptQueue = { add: jest.fn().mockResolvedValue({}) };

    financeService = {
      autoPostIncome: jest.fn().mockResolvedValue({ id: 'ledger-uuid' }),
    } as unknown as jest.Mocked<FinanceService>;

    encryptionUtil = {
      encrypt: jest.fn().mockReturnValue('iv:tag:cipher'),
      decrypt: jest.fn(),
    } as unknown as jest.Mocked<EncryptionUtil>;

    fiscalYearUtil = {
      fromDate: jest.fn().mockReturnValue('2025-26'),
    } as unknown as jest.Mocked<FiscalYearUtil>;

    receiptNumberUtil = {
      next: jest.fn().mockResolvedValue('RCPT-2025-26-0001'),
    } as unknown as jest.Mocked<ReceiptNumberUtil>;

    s3Service = {
      upload: jest.fn(),
      getPresignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/presigned'),
    } as unknown as jest.Mocked<S3Service>;

    razorpayService = {
      keyId: 'rzp_test_key',
      createOrder: jest.fn(),
      verifyPaymentSignature: jest.fn(),
    } as unknown as jest.Mocked<RazorpayService>;

    const module = await Test.createTestingModule({
      providers: [
        DonationsService,
        { provide: getRepositoryToken(Donation), useValue: donationRepo },
        { provide: getRepositoryToken(DonationCategory), useValue: categoryRepo },
        { provide: getRepositoryToken(Temple), useValue: templeRepo },
        { provide: getQueueToken('receipt_generation'), useValue: receiptQueue },
        { provide: FinanceService, useValue: financeService },
        { provide: EncryptionUtil, useValue: encryptionUtil },
        { provide: FiscalYearUtil, useValue: fiscalYearUtil },
        { provide: ReceiptNumberUtil, useValue: receiptNumberUtil },
        { provide: S3Service, useValue: s3Service },
        { provide: DataSource, useValue: ds },
        { provide: RazorpayService, useValue: razorpayService },
      ],
    }).compile();

    service = module.get(DonationsService);
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    beforeEach(() => {
      // Both check80gEligibility (Promise.all) and receipt prefix lookup call templeRepo.findOne
      templeRepo.findOne.mockResolvedValue(MOCK_TEMPLE as Temple);
      categoryRepo.findOne.mockResolvedValue(MOCK_CATEGORY as DonationCategory);
      // The transaction callback returns a saved donation with an id
      ds._em.save.mockResolvedValue({ id: 'donation-uuid' });
    });

    it('stores templeId from the parameter — never from dto', async () => {
      await service.create(TEMPLE_ID, VALID_DTO, USER_ID);

      // The first argument to manager.create() must include our templeId
      const callArgs = ds._em.create.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs['templeId']).toBe(TEMPLE_ID);
    });

    it('stores amount as a toFixed(2) decimal string', async () => {
      await service.create(TEMPLE_ID, { ...VALID_DTO, amount: 5100 }, USER_ID);

      const callArgs = ds._em.create.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs['amount']).toBe('5100.00');
    });

    it('encrypts PAN when provided and stores the ciphertext — not the raw PAN', async () => {
      const dto = { ...VALID_DTO, pan: 'ABCDE1234F' };
      await service.create(TEMPLE_ID, dto, USER_ID);

      expect(encryptionUtil.encrypt).toHaveBeenCalledWith('ABCDE1234F');

      const callArgs = ds._em.create.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs['donorPanEncrypted']).toBe('iv:tag:cipher');
      // Raw PAN must NOT appear anywhere in the persisted data
      expect(JSON.stringify(callArgs)).not.toContain('ABCDE1234F');
    });

    it('throws UnprocessableEntityException for an invalid PAN format', async () => {
      const dto = { ...VALID_DTO, pan: 'INVALID' };
      await expect(service.create(TEMPLE_ID, dto, USER_ID)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(encryptionUtil.encrypt).not.toHaveBeenCalled();
    });

    it('sets is80gEligible = true when temple is registered AND category is eligible', async () => {
      await service.create(TEMPLE_ID, VALID_DTO, USER_ID);

      const callArgs = ds._em.create.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs['is80gEligible']).toBe(true);
    });

    it('sets is80gEligible = false when temple is NOT 80G registered', async () => {
      templeRepo.findOne.mockResolvedValue({
        ...MOCK_TEMPLE,
        is80gRegistered: false,
      } as Temple);

      await service.create(TEMPLE_ID, VALID_DTO, USER_ID);

      const callArgs = ds._em.create.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs['is80gEligible']).toBe(false);
    });

    it('calls financeService.autoPostIncome inside the transaction', async () => {
      await service.create(TEMPLE_ID, VALID_DTO, USER_ID);

      expect(financeService.autoPostIncome).toHaveBeenCalledWith(
        ds._em,
        expect.objectContaining({
          templeId: TEMPLE_ID,
          amount: '5100.00',
        }),
      );
    });

    it('queues receipt_generation job AFTER the transaction commits', async () => {
      await service.create(TEMPLE_ID, VALID_DTO, USER_ID);

      expect(receiptQueue.add).toHaveBeenCalledWith(
        'generate',
        { donationId: 'donation-uuid' },
        expect.objectContaining({ priority: 1 }),
      );
    });

    it('generates receipt number via ReceiptNumberUtil and updates the donation', async () => {
      await service.create(TEMPLE_ID, VALID_DTO, USER_ID);

      expect(receiptNumberUtil.next).toHaveBeenCalledWith(
        TEMPLE_ID,
        '2025-26',
        'RCPT',
      );
      expect(donationRepo.update).toHaveBeenCalledWith('donation-uuid', {
        receiptNumber: 'RCPT-2025-26-0001',
      });
    });

    it('defaults isAnonymous to false when not provided', async () => {
      await service.create(TEMPLE_ID, VALID_DTO, USER_ID);

      const callArgs = ds._em.create.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs['isAnonymous']).toBe(false);
    });

    it('sets status to CONFIRMED on creation', async () => {
      await service.create(TEMPLE_ID, VALID_DTO, USER_ID);

      const callArgs = ds._em.create.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs['status']).toBe(DonationStatus.CONFIRMED);
    });
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns the donation with a presigned URL when receipt exists', async () => {
      donationRepo.findOne.mockResolvedValue({
        id: 'donation-uuid',
        templeId: TEMPLE_ID,
        receiptPdfS3Key: 'receipts/temple-uuid/2025-26/donation-uuid.pdf',
      } as Donation);

      const result = await service.findById(TEMPLE_ID, 'donation-uuid');

      expect(result.receiptUrl).toBe('https://s3.example.com/presigned');
      expect(s3Service.getPresignedUrl).toHaveBeenCalledWith(
        'receipts/temple-uuid/2025-26/donation-uuid.pdf',
      );
    });

    it('returns the donation without receiptUrl when no receipt has been generated', async () => {
      donationRepo.findOne.mockResolvedValue({
        id: 'donation-uuid',
        templeId: TEMPLE_ID,
        receiptPdfS3Key: undefined,
      } as Donation);

      const result = await service.findById(TEMPLE_ID, 'donation-uuid');

      expect(result.receiptUrl).toBeUndefined();
      expect(s3Service.getPresignedUrl).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when donation belongs to a different temple', async () => {
      donationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findById(TEMPLE_ID, 'other-donation'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
