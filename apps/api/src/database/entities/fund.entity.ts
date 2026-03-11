import { Entity, Column } from 'typeorm';
import { TenantBaseEntity } from '@devaseva/types';

/**
 * A named fund that donation categories and ledger entries can be routed to.
 *
 * IMPORTANT: There is NO current_balance column here.
 * Fund balances are always calculated live via SUM(amount) on finance_ledger
 * filtered by fund_id. Storing a running balance creates reconciliation risk.
 */
@Entity('funds')
export class Fund extends TenantBaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Optional fundraising target — null means no target set. */
  @Column({ name: 'target_amount', type: 'decimal', precision: 14, scale: 2, nullable: true })
  targetAmount?: string; // TypeORM returns decimal as string

  /** Brand colour for UI display (hex). */
  @Column({ name: 'color', type: 'varchar', length: 7, default: '#1455A0' })
  color: string;

  /** Display sort order in the UI. */
  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;
}
