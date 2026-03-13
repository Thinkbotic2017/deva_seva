import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BillingCycle } from '@devaseva/types';

/**
 * MembershipPlan defines a subscribable billing tier for temples.
 *
 * Not tenant-scoped — plans are platform-wide (managed by SUPER_ADMIN).
 * Append-safe: deactivate instead of deleting (isActive=false) to preserve
 * historical references from temples.
 */
@Entity('membership_plans')
export class MembershipPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'billing_cycle', type: 'varchar', length: 20 })
  billingCycle: BillingCycle;

  /** Always a positive decimal — TypeORM returns as string. Use parseFloat() for math. */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  /** List of human-readable feature strings shown to temple admins. */
  @Column({ type: 'jsonb', default: '[]' })
  features: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
