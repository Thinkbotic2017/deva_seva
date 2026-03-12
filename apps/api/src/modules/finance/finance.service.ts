import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { FinanceLedger } from '../../database/entities/finance-ledger.entity';
import { LedgerType } from '@devaseva/types';

export interface AutoPostIncomeParams {
  templeId: string;
  /** Decimal string, e.g. '5100.00'. TypeORM stores decimal as string — never Number. */
  amount: string;
  entryDate: Date;
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
  entryDate: Date;
  description: string;
  sevaBookingId: string;
  recordedBy?: string;
  fiscalYear: string;
}

/**
 * FinanceService manages finance_ledger entries.
 *
 * The ledger is APPEND-ONLY.
 * autoPostIncome() accepts an EntityManager so the caller can wrap it in a
 * transaction alongside the donation insert (both succeed or both fail).
 */
@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  /**
   * Creates an INCOME entry in the finance ledger within the caller's transaction.
   * Called from DonationsService.create() inside the transaction block.
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
   * The reversal amount offsets the income in finance reports.
   *
   * @param entityManager  Caller's transaction EntityManager.
   * @param params         Reversal parameters — amount must match the original income amount.
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
}
