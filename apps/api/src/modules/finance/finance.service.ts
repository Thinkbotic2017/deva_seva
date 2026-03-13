import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { FinanceLedger } from '../../database/entities/finance-ledger.entity';
import { LedgerType, PaginatedResult } from '@devaseva/types';
import { FiscalYearUtil } from '../../common/utils/fiscal-year.util';
import { toPaginatedResult } from '../../common/utils/pagination.util';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { ListLedgerQueryDto } from './dto/list-ledger-query.dto';
import { FinanceSummaryQueryDto } from './dto/finance-summary-query.dto';

// ─── Param types for internal auto-post methods ───────────────────────────────

export interface AutoPostIncomeParams {
  templeId: string;
  /** Decimal string, e.g. '5100.00'. TypeORM stores decimal as string — never Number. */
  amount: string;
  /** ISO date string 'YYYY-MM-DD'. Pass a string — never a Date — to avoid UTC shift. */
  entryDate: string;
  description: string;
  categoryId?: string;
  fundId?: string;
  /** Set when income is from a donation. Mutually exclusive with sevaBookingId. */
  donationId?: string;
  /** Set when income is from a seva booking. Mutually exclusive with donationId. */
  sevaBookingId?: string;
  recordedBy?: string;
  fiscalYear: string;
}

export interface AutoPostReversalParams {
  templeId: string;
  /** Same decimal string that was originally posted. */
  amount: string;
  /** ISO date string 'YYYY-MM-DD'. Pass a string — never a Date — to avoid UTC shift. */
  entryDate: string;
  description: string;
  sevaBookingId: string;
  recordedBy?: string;
  fiscalYear: string;
}

// ─── Public report types ──────────────────────────────────────────────────────

export interface LedgerSummary {
  totalIncome: string;
  totalExpense: string;
  /** netBalance = totalIncome - totalExpense. May be negative. */
  netBalance: string;
  fromDate?: string;
  toDate?: string;
  fiscalYear?: string;
}

/**
 * FinanceService manages finance_ledger entries.
 *
 * LEDGER IMMUTABILITY:
 * - autoPostIncome() and autoPostReversal() are called via EntityManager inside
 *   callers' transactions — these rows are system-generated (isAutoPosted=true).
 * - createManualEntry() creates staff-recorded entries (isAutoPosted=false).
 * - NEVER update or delete a ledger row's financial fields.
 * - Only expense_status, approved_by, approved_at may be updated (approval flow).
 */
@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectRepository(FinanceLedger)
    private readonly ledgerRepo: Repository<FinanceLedger>,
    private readonly fiscalYearUtil: FiscalYearUtil,
  ) {}

  // ─── Internal auto-post methods (called via EntityManager in transactions) ──

  /**
   * Creates an INCOME entry in the finance ledger within the caller's transaction.
   * Called from DonationsService.create() and SevaBookingService.create() inside
   * their respective transaction blocks.
   *
   * NEVER call manager.update() on a ledger row.
   * Only expense_status, approved_by, approved_at are mutable (approval flow).
   */
  async autoPostIncome(
    entityManager: EntityManager,
    params: AutoPostIncomeParams,
  ): Promise<FinanceLedger> {
    const entry = entityManager.create(FinanceLedger, {
      templeId: params.templeId,
      type: LedgerType.INCOME,
      amount: params.amount,
      entryDate: params.entryDate,
      description: params.description,
      categoryId: params.categoryId,
      fundId: params.fundId,
      donationId: params.donationId,
      sevaBookingId: params.sevaBookingId,
      isAutoPosted: true,
      recordedBy: params.recordedBy,
      fiscalYear: params.fiscalYear,
    });

    const saved = await entityManager.save(entry);

    this.logger.log(
      `Ledger income entry ${saved.id} posted [donation=${params.donationId ?? '-'}, seva_booking=${params.sevaBookingId ?? '-'}]`,
    );

    return saved;
  }

  /**
   * Posts an EXPENSE reversal entry when a confirmed seva booking is cancelled.
   * The ledger is APPEND-ONLY — this does NOT update or delete the original INCOME entry.
   */
  async autoPostReversal(
    entityManager: EntityManager,
    params: AutoPostReversalParams,
  ): Promise<FinanceLedger> {
    const entry = entityManager.create(FinanceLedger, {
      templeId: params.templeId,
      type: LedgerType.EXPENSE,
      amount: params.amount,
      entryDate: params.entryDate,
      description: params.description,
      sevaBookingId: params.sevaBookingId,
      isAutoPosted: true,
      recordedBy: params.recordedBy,
      fiscalYear: params.fiscalYear,
    });

    const saved = await entityManager.save(entry);

    this.logger.log(
      `Ledger reversal entry ${saved.id} posted for seva_booking ${params.sevaBookingId}`,
    );

    return saved;
  }

  // ─── Manual entry (staff-recorded) ───────────────────────────────────────────

  /**
   * Creates a manual INCOME or EXPENSE entry recorded by a staff member.
   *
   * CRITICAL: isAutoPosted is ALWAYS false here — that flag is reserved for
   * system-generated entries triggered by donation/seva payment confirmations.
   *
   * @param templeId   From req.user.templeId (JWT). NEVER from dto.
   * @param dto        Validated request body.
   * @param recordedBy userId of the staff member recording the entry.
   */
  async createManualEntry(
    templeId: string,
    dto: CreateLedgerEntryDto,
    recordedBy: string,
  ): Promise<FinanceLedger> {
    const entryDateObj = new Date(dto.entryDate);
    const fiscalYear = this.fiscalYearUtil.fromDate(entryDateObj);

    const entry = this.ledgerRepo.create({
      templeId,
      type: dto.type,
      amount: Number(dto.amount).toFixed(2),
      entryDate: dto.entryDate,
      description: dto.description,
      categoryId: dto.categoryId,
      fundId: dto.fundId,
      paymentMode: dto.paymentMode,
      referenceNumber: dto.referenceNumber,
      isAutoPosted: false, // ALWAYS false for manual entries — never set true here
      recordedBy,
      fiscalYear,
    });

    const saved = await this.ledgerRepo.save(entry);

    this.logger.log(
      `Manual ledger entry ${saved.id} [type=${dto.type}] created by ${recordedBy} for temple ${templeId}`,
    );

    return saved;
  }

  // ─── Ledger query methods ─────────────────────────────────────────────────────

  /**
   * Returns paginated ledger entries for a temple.
   * templeId guard is mandatory — never omit it.
   */
  async findLedger(
    templeId: string,
    query: ListLedgerQueryDto,
  ): Promise<PaginatedResult<FinanceLedger>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const qb = this.ledgerRepo
      .createQueryBuilder('l')
      .where('l.temple_id = :templeId', { templeId })
      .andWhere('l.deleted_at IS NULL')
      .orderBy('l.entry_date', 'DESC')
      .addOrderBy('l.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.type) {
      qb.andWhere('l.type = :type', { type: query.type });
    }
    if (query.fromDate) {
      qb.andWhere('l.entry_date >= :fromDate', { fromDate: query.fromDate });
    }
    if (query.toDate) {
      qb.andWhere('l.entry_date <= :toDate', { toDate: query.toDate });
    }
    if (query.fundId) {
      qb.andWhere('l.fund_id = :fundId', { fundId: query.fundId });
    }
    if (query.fiscalYear) {
      qb.andWhere('l.fiscal_year = :fiscalYear', { fiscalYear: query.fiscalYear });
    }

    const [data, total] = await qb.getManyAndCount();
    return toPaginatedResult(data, total, page, limit);
  }

  /**
   * Returns income vs expense totals for a date range or fiscal year.
   * All aggregation is performed in SQL — never in JavaScript.
   *
   * netBalance = totalIncome - totalExpense (may be negative if expenses exceed income).
   */
  async getLedgerSummary(
    templeId: string,
    query: FinanceSummaryQueryDto,
  ): Promise<LedgerSummary> {
    const qb = this.ledgerRepo
      .createQueryBuilder('l')
      .select('l.type', 'type')
      .addSelect('COALESCE(SUM(l.amount::numeric), 0)', 'total')
      .where('l.temple_id = :templeId', { templeId })
      .andWhere('l.deleted_at IS NULL')
      .groupBy('l.type');

    if (query.fromDate) {
      qb.andWhere('l.entry_date >= :fromDate', { fromDate: query.fromDate });
    }
    if (query.toDate) {
      qb.andWhere('l.entry_date <= :toDate', { toDate: query.toDate });
    }
    if (query.fiscalYear) {
      qb.andWhere('l.fiscal_year = :fiscalYear', { fiscalYear: query.fiscalYear });
    }

    const rows = await qb.getRawMany<{ type: LedgerType; total: string }>();

    const incomeRow = rows.find((r) => r.type === LedgerType.INCOME);
    const expenseRow = rows.find((r) => r.type === LedgerType.EXPENSE);

    const totalIncome = parseFloat(incomeRow?.total ?? '0');
    const totalExpense = parseFloat(expenseRow?.total ?? '0');
    const net = totalIncome - totalExpense;

    return {
      totalIncome: totalIncome.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      netBalance: net.toFixed(2),
      fromDate: query.fromDate,
      toDate: query.toDate,
      fiscalYear: query.fiscalYear,
    };
  }
}
