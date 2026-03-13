import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '@devaseva/types';
import { Gender, DevoteeTier } from '@devaseva/types';

/**
 * Devotee represents a temple patron — the CRM record for donation/seva history.
 *
 * PAN security invariants:
 * - pan_number_encrypted stores AES-256-GCM ciphertext only. NEVER return this field.
 * - pan_number_masked (e.g. "ABCXX1234X") is the only PAN value safe for API responses.
 *
 * Aggregate stats (donationCount, totalDonated, sevaCount, lastDonationAt) are NOT stored
 * as columns. They are computed at query time from the donations and seva_bookings tables.
 * This avoids denormalisation drift at the cost of a subquery on detail pages.
 *
 * Phone uniqueness: UNIQUE (temple_id, phone) WHERE deleted_at IS NULL
 * The same phone number at two different temples creates two separate devotee records.
 */
@Entity('devotees')
@Index(['templeId', 'tier'])
@Index(['templeId', 'phone'])
export class Devotee extends TenantBaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  /** Used as the CRM key within a temple. Unique per (temple_id, phone). */
  @Column({ name: 'phone', type: 'varchar', length: 15 })
  phone: string;

  @Column({ name: 'email', type: 'varchar', nullable: true })
  email?: string;

  @Column({ name: 'gender', type: 'enum', enum: Gender, nullable: true })
  gender?: Gender;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: Date;

  @Column({ name: 'anniversary_date', type: 'date', nullable: true })
  anniversaryDate?: Date;

  /**
   * AES-256-GCM encrypted PAN number.
   * Format: iv:authTag:ciphertext (all hex, colon-separated).
   * NEVER return this in any API response — not even to ADMIN role.
   * Decrypt only for 80G receipt generation.
   */
  @Column({ name: 'pan_number_encrypted', type: 'varchar', nullable: true })
  panNumberEncrypted?: string;

  /**
   * Masked PAN safe for display: "ABCXX1234X".
   * This is the ONLY PAN value that may appear in API responses.
   */
  @Column({ name: 'pan_number_masked', type: 'varchar', length: 12, nullable: true })
  panNumberMasked?: string;

  @Column({ name: 'address_line1', type: 'varchar', nullable: true })
  addressLine1?: string;

  @Column({ name: 'city', type: 'varchar', nullable: true })
  city?: string;

  @Column({ name: 'state', type: 'varchar', nullable: true })
  state?: string;

  @Column({ name: 'pin_code', type: 'varchar', length: 6, nullable: true })
  pinCode?: string;

  @Column({ name: 'gotra', type: 'varchar', length: 100, nullable: true })
  gotra?: string;

  @Column({ name: 'nakshatra', type: 'varchar', length: 50, nullable: true })
  nakshatra?: string;

  @Column({ name: 'rashi', type: 'varchar', length: 50, nullable: true })
  rashi?: string;

  @Column({
    name: 'tier',
    type: 'enum',
    enum: DevoteeTier,
    default: DevoteeTier.REGULAR,
  })
  tier: DevoteeTier;

  /** UUID of the family head devotee (optional grouping for family donations). */
  @Column({ name: 'family_head_id', type: 'uuid', nullable: true })
  familyHeadId?: string;

  @Column({ name: 'whatsapp_opted_out', type: 'boolean', default: false })
  whatsappOptedOut: boolean;

  @Column({ name: 'sms_opted_out', type: 'boolean', default: false })
  smsOptedOut: boolean;

  /** S3 key — NEVER a full URL. Generate pre-signed URL at serve time. */
  @Column({ name: 'photo_url', type: 'varchar', nullable: true })
  photoUrl?: string;

  @Column({ name: 'member_since', type: 'date', nullable: true })
  memberSince?: Date;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  /** UUID of the devotee who referred this devotee. */
  @Column({ name: 'referred_by', type: 'uuid', nullable: true })
  referredBy?: string;
}
