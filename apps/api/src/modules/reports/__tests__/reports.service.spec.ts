import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportsService } from '../reports.service';
import { Donation } from '../../../database/entities/donation.entity';
import { DonationCategory } from '../../../database/entities/donation-category.entity';
import { FinanceLedger } from '../../../database/entities/finance-ledger.entity';
import { SevaBooking } from '../../../database/entities/seva-booking.entity';
import { DonationMode, DonationStatus, LedgerType, SevaBookingStatus } from '@devaseva/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEMPLE_ID = 'temple-uuid';

/** Builds a mock query builder that returns configurable raw results. */
function qbChain(rawResult: unknown, rawManyResult: unknown[] = []) {
  const qb: Record<string, jest.Mock> = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    clone: jest.fn(),
    getRawOne: jest.fn().mockResolvedValue(rawResult),
    getRawMany: jest.fn().mockResolvedValue(rawManyResult),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getCount: jest.fn().mockResolvedValue(0),
  };
  // clone() returns a fresh copy of the same stub
  qb.clone = jest.fn().mockReturnValue({ ...qb });
  return qb;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('ReportsService', () => {
  let service: ReportsService;
  let donationRepo: Record<string, jest.Mock>;
  let categoryRepo: Record<string, jest.Mock>;
  let ledgerRepo: Record<string, jest.Mock>;
  let sevaBookingRepo: Record<string, jest.Mock>;

  async function buildModule(overrides?: {
    donationQb?: Record<string, jest.Mock>;
    ledgerQb?: Record<string, jest.Mock>;
    sevaQb?: Record<string, jest.Mock>;
  }) {
    const defaultDonationQb = qbChain(
      { grandTotal: '15300.00', confirmedCount: '3' },
      [
        { mode: DonationMode.CASH, total: '10200.00', count: '2' },
        { mode: DonationMode.UPI, total: '5100.00', count: '1' },
      ],
    );
    const defaultLedgerQb = qbChain(
      null,
      [
        { type: LedgerType.INCOME, total: '50000.00' },
        { type: LedgerType.EXPENSE, total: '20000.00' },
      ],
    );
    const defaultSevaQb = qbChain({ total: '3300.00' });

    donationRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(
        overrides?.donationQb ?? defaultDonationQb,
      ),
      find: jest.fn().mockResolvedValue([]),
    };
    categoryRepo = {};
    ledgerRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(
        overrides?.ledgerQb ?? defaultLedgerQb,
      ),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      create: jest.fn(),
    };
    sevaBookingRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(
        overrides?.sevaQb ?? defaultSevaQb,
      ),
      find: jest.fn().mockResolvedValue([]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(Donation), useValue: donationRepo },
        { provide: getRepositoryToken(DonationCategory), useValue: categoryRepo },
        { provide: getRepositoryToken(FinanceLedger), useValue: ledgerRepo },
        { provide: getRepositoryToken(SevaBooking), useValue: sevaBookingRepo },
      ],
    }).compile();

    service = moduleRef.get(ReportsService);
  }

  beforeEach(async () => {
    await buildModule();
  });

  // ── getDonationSummary() ───────────────────────────────────────────────────

  describe('getDonationSummary()', () => {
    it('returns grandTotal and breakdown by mode', async () => {
      const result = await service.getDonationSummary(TEMPLE_ID, {});

      expect(result.grandTotal).toBe('15300.00');
      expect(result.confirmedCount).toBe(3);
      expect(result.byMode).toHaveLength(2);
      expect(result.byMode[0]).toMatchObject({
        mode: DonationMode.CASH,
        total: '10200.00',
        count: 2,
      });
    });

    it('scopes query to templeId', async () => {
      await service.getDonationSummary(TEMPLE_ID, {});

      const qb = donationRepo.createQueryBuilder.mock.results[0].value;
      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('temple_id'),
        expect.objectContaining({ templeId: TEMPLE_ID }),
      );
    });

    it('filters by CONFIRMED statuses only', async () => {
      await service.getDonationSummary(TEMPLE_ID, {});

      const qb = donationRepo.createQueryBuilder.mock.results[0].value;
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('status IN'),
        expect.objectContaining({
          statuses: expect.arrayContaining([
            DonationStatus.CONFIRMED,
            DonationStatus.RECEIPT_GENERATED,
            DonationStatus.RECEIPT_SENT,
          ]),
        }),
      );
    });

    it('applies fromDate filter when provided', async () => {
      await service.getDonationSummary(TEMPLE_ID, { from: '2025-04-01' });

      const qb = donationRepo.createQueryBuilder.mock.results[0].value;
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('payment_date >='),
        expect.objectContaining({ from: '2025-04-01' }),
      );
    });

    it('handles zero donations gracefully', async () => {
      const emptyQb = qbChain(
        { grandTotal: '0', confirmedCount: '0' },
        [],
      );
      donationRepo.createQueryBuilder.mockReturnValue(emptyQb);

      const result = await service.getDonationSummary(TEMPLE_ID, {});

      expect(result.grandTotal).toBe('0.00');
      expect(result.confirmedCount).toBe(0);
      expect(result.byMode).toHaveLength(0);
    });
  });

  // ── getLedgerReport() ──────────────────────────────────────────────────────

  describe('getLedgerReport()', () => {
    it('returns totalIncome, totalExpense, and netBalance', async () => {
      // Fund rows for byFund breakdown
      const ledgerQb = qbChain(null, [
        { type: LedgerType.INCOME, total: '50000.00' },
        { type: LedgerType.EXPENSE, total: '20000.00' },
      ]);
      // clone() returns a qb that also returns fund rows
      const fundQb = qbChain(null, [
        { fundId: 'fund-1', type: LedgerType.INCOME, total: '30000.00' },
        { fundId: 'fund-1', type: LedgerType.EXPENSE, total: '10000.00' },
        { fundId: null, type: LedgerType.INCOME, total: '20000.00' },
      ]);
      ledgerQb.clone = jest.fn().mockReturnValueOnce(ledgerQb).mockReturnValue(fundQb);
      ledgerRepo.createQueryBuilder.mockReturnValue(ledgerQb);

      const result = await service.getLedgerReport(TEMPLE_ID, { fiscalYear: '2025-26' });

      expect(result.totalIncome).toBe('50000.00');
      expect(result.totalExpense).toBe('20000.00');
      expect(result.netBalance).toBe('30000.00');
      expect(result.fiscalYear).toBe('2025-26');
    });

    it('netBalance is negative when expenses exceed income', async () => {
      const ledgerQb = qbChain(null, [
        { type: LedgerType.INCOME, total: '5000.00' },
        { type: LedgerType.EXPENSE, total: '8000.00' },
      ]);
      ledgerQb.clone = jest.fn().mockReturnValue(ledgerQb);
      ledgerRepo.createQueryBuilder.mockReturnValue(ledgerQb);

      const result = await service.getLedgerReport(TEMPLE_ID, { fiscalYear: '2025-26' });

      expect(parseFloat(result.netBalance)).toBeLessThan(0);
      expect(result.netBalance).toBe('-3000.00');
    });

    it('scopes query to templeId and fiscalYear', async () => {
      await service.getLedgerReport(TEMPLE_ID, { fiscalYear: '2025-26' });

      const qb = ledgerRepo.createQueryBuilder.mock.results[0].value;
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('fiscal_year'),
        expect.objectContaining({ fiscalYear: '2025-26' }),
      );
    });
  });

  // ── get80GReport() ─────────────────────────────────────────────────────────

  describe('get80GReport()', () => {
    it('returns only 80G-eligible donations', async () => {
      const donationQb = qbChain(
        { totalAmount: '51000.00', donorCount: '2' },
        [
          {
            d_id: 'don-1',
            d_receipt_number: 'RCPT-2025-26-0001',
            d_donor_name: 'Ramesh Kumar',
            d_donor_phone: '9876543210',
            d_donor_pan_masked: 'ABCXX1234F',
            d_amount: '5100.00',
            d_payment_date: '2025-06-01',
            cat_name: 'Annadanam',
          },
        ],
      );
      donationRepo.createQueryBuilder.mockReturnValue(donationQb);

      const result = await service.get80GReport(TEMPLE_ID, { fiscalYear: '2025-26' });

      expect(result.fiscalYear).toBe('2025-26');
      expect(result.totalEligibleAmount).toBe('51000.00');
      expect(result.donorCount).toBe(2);
      expect(result.donations).toHaveLength(1);
    });

    it('filters with CONFIRMED_STATUSES — never includes PENDING or CANCELLED', async () => {
      await service.get80GReport(TEMPLE_ID, { fiscalYear: '2025-26' });

      const qb = donationRepo.createQueryBuilder.mock.results[0].value;
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('status IN'),
        expect.objectContaining({
          statuses: expect.arrayContaining([DonationStatus.CONFIRMED]),
        }),
      );
      // Verify PENDING and CANCELLED are NOT in the statuses
      const statusCall = (qb.andWhere as jest.Mock).mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('status IN'),
      );
      const statuses: DonationStatus[] = statusCall?.[1]?.statuses ?? [];
      expect(statuses).not.toContain(DonationStatus.PENDING);
      expect(statuses).not.toContain(DonationStatus.CANCELLED);
    });

    it('strips panEncrypted — only panMasked in output', async () => {
      const donationQb = qbChain(
        { totalAmount: '5100.00', donorCount: '1' },
        [{
          d_id: 'don-1',
          d_receipt_number: null,
          d_donor_name: 'Priya Sharma',
          d_donor_phone: null,
          d_donor_pan_masked: 'ABCXX1234F',
          d_amount: '5100.00',
          d_payment_date: '2025-06-01',
          cat_name: 'Temple Renovation',
        }],
      );
      donationRepo.createQueryBuilder.mockReturnValue(donationQb);

      const result = await service.get80GReport(TEMPLE_ID, { fiscalYear: '2025-26' });

      const entry = result.donations[0]!;
      // panMasked is present
      expect(entry.donorPanMasked).toBe('ABCXX1234F');
      // panEncrypted is NOT a field on Donation80GEntry — compile-time guard
      expect((entry as unknown as Record<string, unknown>)['donorPanEncrypted']).toBeUndefined();
    });
  });

  // ── getDaySheet() ──────────────────────────────────────────────────────────

  describe('getDaySheet()', () => {
    it('returns donations, sevaBookings, and computed totals', async () => {
      const mockDonation = { id: 'd1', amount: '5100.00' } as Partial<Donation>;
      const mockBooking = { id: 'sb1', amount: '1100.00' } as Partial<SevaBooking>;

      donationRepo.find.mockResolvedValue([mockDonation]);
      sevaBookingRepo.find.mockResolvedValue([mockBooking]);

      const donQb = qbChain({ total: '5100.00' });
      const sevaQb = qbChain({ total: '1100.00' });
      donationRepo.createQueryBuilder.mockReturnValue(donQb);
      sevaBookingRepo.createQueryBuilder.mockReturnValue(sevaQb);

      const result = await service.getDaySheet(TEMPLE_ID, { date: '2025-06-15' });

      expect(result.date).toBe('2025-06-15');
      expect(result.donations).toHaveLength(1);
      expect(result.sevaBookings).toHaveLength(1);
      expect(result.donationTotal).toBe('5100.00');
      expect(result.sevaTotal).toBe('1100.00');
      expect(result.grandTotal).toBe('6200.00');
    });

    it('grandTotal uses SQL totals — not JS accumulation from loaded records', async () => {
      // Loaded records have zero amount — SQL returns different totals
      const emptyBookings: SevaBooking[] = [];
      donationRepo.find.mockResolvedValue([]);
      sevaBookingRepo.find.mockResolvedValue(emptyBookings);

      const donQb = qbChain({ total: '25500.00' }); // SQL total
      const sevaQb = qbChain({ total: '3300.00' });  // SQL total
      donationRepo.createQueryBuilder.mockReturnValue(donQb);
      sevaBookingRepo.createQueryBuilder.mockReturnValue(sevaQb);

      const result = await service.getDaySheet(TEMPLE_ID, { date: '2025-06-15' });

      // Totals come from SQL, not from summing the loaded records array
      expect(result.donationTotal).toBe('25500.00');
      expect(result.sevaTotal).toBe('3300.00');
      expect(result.grandTotal).toBe('28800.00');
    });

    it('returns zero totals when no activity for the date', async () => {
      donationRepo.find.mockResolvedValue([]);
      sevaBookingRepo.find.mockResolvedValue([]);
      donationRepo.createQueryBuilder.mockReturnValue(qbChain({ total: '0' }));
      sevaBookingRepo.createQueryBuilder.mockReturnValue(qbChain({ total: '0' }));

      const result = await service.getDaySheet(TEMPLE_ID, { date: '2025-06-15' });

      expect(result.donationTotal).toBe('0.00');
      expect(result.sevaTotal).toBe('0.00');
      expect(result.grandTotal).toBe('0.00');
    });
  });
});
