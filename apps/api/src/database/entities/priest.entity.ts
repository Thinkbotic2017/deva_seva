import { Entity, Column } from 'typeorm';
import { TenantBaseEntity } from '@devaseva/types';

/**
 * Priest represents a temple staff member who performs sevas.
 * Distinct from the User entity — priests have temple-specific attributes
 * (specialization, assigned seva types) that regular users don't have.
 *
 * A priest optionally links to a User account via user_id for app login.
 * profile_photo_url stores an S3 key only.
 */
@Entity('priests')
export class Priest extends TenantBaseEntity {
  /**
   * Optional link to a User account.
   * When set, the priest can log in and view their assignment schedule.
   */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'phone', type: 'varchar', length: 15, nullable: true })
  phone?: string;

  /** Priest's area of expertise (e.g. "Vedic rituals", "Carnatic music"). */
  @Column({ name: 'specialization', type: 'varchar', nullable: true })
  specialization?: string;

  /**
   * UUIDs of SevaType records this priest is assigned to perform.
   * Stored as jsonb array of uuid strings.
   * Used to filter priest availability on the booking calendar.
   */
  @Column({ name: 'assigned_seva_type_ids', type: 'jsonb', default: '[]' })
  assignedSevaTypeIds: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** S3 key — NEVER a full URL. Generate pre-signed URL at serve time. */
  @Column({ name: 'profile_photo_url', type: 'varchar', nullable: true })
  profilePhotoUrl?: string;
}
