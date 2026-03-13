import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '@devaseva/types';
import { UserRole } from '@devaseva/types';

/**
 * User represents a staff member of a temple.
 * All users belong to exactly one temple (tenant-scoped).
 * Auth is passwordless OTP — no password column.
 *
 * Multi-tenancy rule: phone is unique per temple, not globally.
 * A counter staff member at Temple A can have the same phone as staff at Temple B.
 */
@Entity('users')
@Index(['templeId', 'phone'], { unique: true })
export class User extends TenantBaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 15 })
  phone: string;

  @Column({ name: 'full_name', type: 'varchar', length: 200 })
  fullName: string;

  @Column({ type: 'varchar', nullable: true })
  email?: string;

  /** S3 key — generate pre-signed URL at serve time. */
  @Column({ name: 'profile_photo_url', type: 'varchar', nullable: true })
  profilePhotoUrl?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.COUNTER_STAFF,
  })
  role: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  /** UUID of the user who sent this invite — self-referential FK. */
  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  invitedBy?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'invited_by' })
  invitedByUser?: User;

  /** One-time invite token (48h TTL). Cleared after acceptance. */
  @Column({ name: 'invite_token', type: 'varchar', nullable: true })
  inviteToken?: string;

  @Column({ name: 'invite_accepted_at', type: 'timestamptz', nullable: true })
  inviteAcceptedAt?: Date;

  @Column({ name: 'preferred_language', type: 'varchar', length: 5, default: 'hi' })
  preferredLanguage: string;

  /** Fine-grained permission overrides stored as key-value JSON. */
  @Column({ type: 'jsonb', default: '{}' })
  permissions: Record<string, unknown>;
}
