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
  donationId: string;
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
      isAutoPosted: true,
      recordedBy: params.recordedBy,
      fiscalYear: params.fiscalYear,
    });

    const saved = await entityManager.save(entry);

    this.logger.log(
      `Ledger income entry ${saved.id} posted for donation ${params.donationId}`,
    );

    return saved;
  }
}
