import { Entity, Column } from 'typeorm';
import { FinanceCategoryType } from '@devaseva/types';
import { TenantBaseEntity } from '@devaseva/types';

/**
 * User-defined (and system-seeded) categories for income and expense ledger entries.
 * Note: no deleted_at — schema intentionally omits soft-delete on this table.
 */
@Entity('finance_categories')
export class FinanceCategory extends TenantBaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  /** INCOME or EXPENSE — determines which form this category appears in. */
  @Column({ name: 'type', type: 'enum', enum: FinanceCategoryType })
  type: FinanceCategoryType;

  /** System-seeded categories cannot be deleted by temple admins. */
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @Column({ name: 'color', type: 'varchar', length: 7, default: '#6366F1' })
  color: string;
}
