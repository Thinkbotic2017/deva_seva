/**
 * Base entity classes shared across all apps.
 * Every entity in the platform extends one of these.
 */
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
  Index,
} from 'typeorm';

/**
 * BaseEntity provides standard audit columns (id, created_at, updated_at, deleted_at).
 * Used by tables that are NOT tenant-scoped (e.g., temples, otp_sessions).
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}

/**
 * TenantBaseEntity extends BaseEntity with temple_id.
 * EVERY table that stores per-temple data MUST extend this class.
 * Security rule: NEVER query a TenantBaseEntity subclass without WHERE temple_id = :templeId.
 */
export abstract class TenantBaseEntity extends BaseEntity {
  @Index()
  @Column({ name: 'temple_id', type: 'uuid' })
  templeId: string;
}
