import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '@devaseva/types';

@Entity('donation_categories')
export class DonationCategory extends TenantBaseEntity {
  /** Display name of the donation category (e.g. "Annadanam", "Temple Renovation"). */
  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  /** Whether donations under this category qualify for 80G tax exemption. */
  @Column({ name: 'is_80g_eligible', type: 'boolean', default: false })
  is80gEligible: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** Display sort order in the counter UI. */
  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  /** Brand colour for UI display (hex). */
  @Column({ name: 'color', type: 'varchar', length: 7, default: '#E8530A' })
  color: string;

  /** Optional fund this category routes into. */
  @Column({ name: 'fund_id', type: 'uuid', nullable: true })
  fundId?: string;

  /**
   * Relation to Fund — loaded lazily. Not required; set via fundId column.
   * Import Fund lazily to avoid circular dependency.
   */
  @ManyToOne('Fund', { nullable: true, onDelete: 'SET NULL', lazy: true })
  @JoinColumn({ name: 'fund_id' })
  fund?: Promise<unknown>;
}
