import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '@devaseva/types';
import { LedgerType, ExpenseStatus } from '@devaseva/types';

/**
 * Append-only financial ledger.
 *
 * IMMUTABILITY RULES (enforced in service layer + DB trigger):
 * - NEVER hard-delete a ledger row.
 * - NEVER UPDATE any financial field (amount, entry_date, type, description, fund_id, etc.).
 * - ONLY expense_status, approved_by, and approved_at may be updated (expense approval flow).
 *
 * Decimal fields: TypeORM returns decimal columns as strings. Always parseFloat() before math.
 */
@Entity('finance_ledger')
@Index(['templeId', 'entryDate'])
@Index(['templeId', 'fundId'])
@Index(['templeId', 'fiscalYear', 'type'])
export class FinanceLedger extends TenantBaseEntity {
  /** INCOME or EXPENSE. */
  @Column({ name: 'type', type: 'enum', enum: LedgerType })
  type: LedgerType;

  /** Always a positive value — sign is determined by `type`. */
  @Column({ name: 'amount', type: 'decimal', precision: 14, scale: 2 })
  amount: string; // TypeORM returns decimal as string

  @Column({
    name: 'entry_date',
    type: 'date',
    transformer: {
      to: (value: string | Date | null | undefined): string | null => {
        if (!value) return null as any;
        if (value instanceof Date) return value.toISOString().slice(0, 10);
        return value;
      },
      from: (value: string | null): string | null => value,
    },
  })
  entryDate: string;

  @Column({ name: 'description', type: 'varchar', length: 500 })
  description: string;

  /** Links to a user-defined income/expense category. */
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId?: string;

  @Column({ name: 'fund_id', type: 'uuid', nullable: true })
  fundId?: string;

  /** Set when this entry was auto-posted from a donation confirmation. */
  @Column({ name: 'donation_id', type: 'uuid', nullable: true })
  donationId?: string;

  /** Set when this entry was auto-posted from a seva booking confirmation. */
  @Column({ name: 'seva_booking_id', type: 'uuid', nullable: true })
  sevaBookingId?: string;

  /** Set when this entry was auto-posted from an inventory purchase. */
  @Column({ name: 'inventory_transaction_id', type: 'uuid', nullable: true })
  inventoryTransactionId?: string;

  /**
   * Expense approval workflow.
   * Expenses above the configured threshold require trustee approval.
   * These are the ONLY three fields that may be updated after insert.
   */
  @Column({ name: 'expense_status', type: 'enum', enum: ExpenseStatus, nullable: true })
  expenseStatus?: ExpenseStatus;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  /** References the vendor for expense entries created from inventory purchases. */
  @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
  vendorId?: string;

  @Column({ name: 'payment_mode', type: 'varchar', nullable: true })
  paymentMode?: string;

  @Column({ name: 'reference_number', type: 'varchar', nullable: true })
  referenceNumber?: string;

  /** True when this entry was created automatically by the system (not manually by staff). */
  @Column({ name: 'is_auto_posted', type: 'boolean', default: false })
  isAutoPosted: boolean;

  /** User who recorded this entry (null for system-generated entries). */
  @Column({ name: 'recorded_by', type: 'uuid', nullable: true })
  recordedBy?: string;

  /** Indian fiscal year in 'YYYY-YY' format (e.g. '2025-26'). Derived from entry_date. */
  @Column({ name: 'fiscal_year', type: 'varchar', length: 10 })
  fiscalYear: string;
}
