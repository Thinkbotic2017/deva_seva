import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FinanceService } from '../finance.service';
import { FinanceLedger } from '../../../database/entities/finance-ledger.entity';
import { FiscalYearUtil } from '../../../common/utils/fiscal-year.util';
import { LedgerType } from '@devaseva/types';
import { CreateLedgerEntryDto } from '../dto/create-ledger-entry.dto';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLE_ID = 'temple-uuid';
const USER_ID = 'user-uuid';
const ENTRY_ID = 'entry-uuid';

// ─── Mock factories ───────────────────────────────────────────────────────────

function makeQb(rawManyResult: unknown[] = [{ type: LedgerType.INCOME, total: '10000.00' }]) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawManyResult),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('FinanceService', () => {
  let service: FinanceService;
  let ledgerRepo: Record<string, jest.Mock>;
  let fiscalYearUtil: jest.Mocked<FiscalYearUtil>;

  async function buildModule() {
    ledgerRepo = {
      create: jest.fn((data: unknown) => ({ ...(data as object), id: ENTRY_ID })),
      save: jest.fn().mockImplementation((e: unknown) => Promise.resolve({ ...(e as object), id: ENTRY_ID })),
      createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
    };

    fiscalYearUtil = {
      fromDate: jest.fn().mockReturnValue('2025-26'),
      current: jest.fn().mockReturnValue('2025-26'),
      startDate: jest.fn(),
      endDate: jest.fn(),
    } as unknown as jest.Mocked<FiscalYearUtil>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: getRepositoryToken(FinanceLedger), useValue: ledgerRepo },
        { provide: FiscalYearUtil, useValue: fiscalYearUtil },
      ],
    }).compile();

    service = moduleRef.get(FinanceService);
  }

  beforeEach(async () => {
    await buildModule();
  });

  // ── createManualEntry() ───────────────────────────────────────────────────

  describe('createManualEntry()', () => {
    const INCOME_DTO: CreateLedgerEntryDto = {
      type: LedgerType.INCOME,
      amount: 5000,
      entryDate: '2025-06-15',
      description: 'Mahotsav donation collection',
    };

    const EXPENSE_DTO: CreateLedgerEntryDto = {
      type: LedgerType.EXPENSE,
      amount: 3500,
      entryDate: '2025-06-15',
      description: 'Flower purchase for puja',
    };

    it('creates an INCOME entry with isAutoPosted=false', async () => {
      await service.createManualEntry(TEMPLE_ID, INCOME_DTO, USER_ID);

      expect(ledgerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: LedgerType.INCOME,
          isAutoPosted: false,
          templeId: TEMPLE_ID,
          recordedBy: USER_ID,
        }),
      );
    });

    it('creates an EXPENSE entry with isAutoPosted=false', async () => {
      await service.createManualEntry(TEMPLE_ID, EXPENSE_DTO, USER_ID);

      expect(ledgerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: LedgerType.EXPENSE,
          isAutoPosted: false,
        }),
      );
    });

    it('NEVER sets isAutoPosted=true for manual entries', async () => {
      await service.createManualEntry(TEMPLE_ID, INCOME_DTO, USER_ID);

      const createArg = (ledgerRepo.create as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
      expect(createArg['isAutoPosted']).toBe(false);
      expect(createArg['isAutoPosted']).not.toBe(true);
    });

    it('stores amount as decimal string (toFixed(2))', async () => {
      await service.createManualEntry(TEMPLE_ID, INCOME_DTO, USER_ID);

      expect(ledgerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: '5000.00' }),
      );
    });

    it('derives fiscalYear from entryDate via FiscalYearUtil', async () => {
      await service.createManualEntry(TEMPLE_ID, INCOME_DTO, USER_ID);

      expect(fiscalYearUtil.fromDate).toHaveBeenCalledWith(
        expect.any(Date),
      );
      expect(ledgerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ fiscalYear: '2025-26' }),
      );
    });

    it('always uses templeId from parameter — never from dto', async () => {
      await service.createManualEntry(TEMPLE_ID, INCOME_DTO, USER_ID);

      expect(ledgerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ templeId: TEMPLE_ID }),
      );
    });

    it('passes optional fields (categoryId, fundId, paymentMode, referenceNumber)', async () => {
      const dto: CreateLedgerEntryDto = {
        ...INCOME_DTO,
        categoryId: 'cat-uuid',
        fundId: 'fund-uuid',
        paymentMode: 'NEFT',
        referenceNumber: 'INV-2025-001',
      };
      await service.createManualEntry(TEMPLE_ID, dto, USER_ID);

      expect(ledgerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'cat-uuid',
          fundId: 'fund-uuid',
          paymentMode: 'NEFT',
          referenceNumber: 'INV-2025-001',
        }),
      );
    });
  });

  // ── getLedgerSummary() ─────────────────────────────────────────────────────

  describe('getLedgerSummary()', () => {
    it('returns totalIncome, totalExpense, and netBalance', async () => {
      const qb = makeQb([
        { type: LedgerType.INCOME, total: '50000.00' },
        { type: LedgerType.EXPENSE, total: '18000.00' },
      ]);
      ledgerRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getLedgerSummary(TEMPLE_ID, {});

      expect(result.totalIncome).toBe('50000.00');
      expect(result.totalExpense).toBe('18000.00');
      expect(result.netBalance).toBe('32000.00');
    });

    it('returns zero values when no ledger entries exist', async () => {
      const qb = makeQb([]); // empty result
      ledgerRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getLedgerSummary(TEMPLE_ID, {});

      expect(result.totalIncome).toBe('0.00');
      expect(result.totalExpense).toBe('0.00');
      expect(result.netBalance).toBe('0.00');
    });

    it('handles negative net balance when expenses > income', async () => {
      const qb = makeQb([
        { type: LedgerType.INCOME, total: '5000.00' },
        { type: LedgerType.EXPENSE, total: '9000.00' },
      ]);
      ledgerRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getLedgerSummary(TEMPLE_ID, {});

      expect(result.netBalance).toBe('-4000.00');
    });

    it('applies fiscalYear filter when provided', async () => {
      const qb = makeQb([]);
      ledgerRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getLedgerSummary(TEMPLE_ID, { fiscalYear: '2025-26' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('fiscal_year'),
        expect.objectContaining({ fiscalYear: '2025-26' }),
      );
    });

    it('applies date range filters when provided', async () => {
      const qb = makeQb([]);
      ledgerRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getLedgerSummary(TEMPLE_ID, {
        fromDate: '2025-04-01',
        toDate: '2025-06-30',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('entry_date >='),
        expect.objectContaining({ fromDate: '2025-04-01' }),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('entry_date <='),
        expect.objectContaining({ toDate: '2025-06-30' }),
      );
    });
  });
});
