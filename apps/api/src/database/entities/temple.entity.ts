import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@devaseva/types';
import { TempleCategory, TemplePlan } from '@devaseva/types';

/**
 * Temple is the root of every tenant.
 * All other tenant-scoped tables reference temple_id FK to this table.
 * This entity is NOT a TenantBaseEntity — it has no temple_id column itself.
 */
@Entity('temples')
export class Temple extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({
    type: 'enum',
    enum: TempleCategory,
    nullable: true,
  })
  category?: TempleCategory;

  @Column({ type: 'text', nullable: true })
  description?: string;

  /** S3 key — never a full URL. Generate pre-signed URL at serve time. */
  @Column({ name: 'logo_url', type: 'varchar', nullable: true })
  logoUrl?: string;

  /** S3 key — never a full URL. Generate pre-signed URL at serve time. */
  @Column({ name: 'banner_url', type: 'varchar', nullable: true })
  bannerUrl?: string;

  @Column({ name: 'address_line1', type: 'varchar', nullable: true })
  addressLine1?: string;

  @Column({ name: 'address_line2', type: 'varchar', nullable: true })
  addressLine2?: string;

  @Column({ type: 'varchar', nullable: true })
  city?: string;

  @Column({ type: 'varchar', nullable: true })
  state?: string;

  @Column({ name: 'pin_code', type: 'varchar', length: 6, nullable: true })
  pinCode?: string;

  @Column({ name: 'phone_primary', type: 'varchar', length: 15, nullable: true })
  phonePrimary?: string;

  @Column({ name: 'phone_whatsapp', type: 'varchar', length: 15, nullable: true })
  phoneWhatsapp?: string;

  @Column({ type: 'varchar', nullable: true })
  email?: string;

  @Column({ name: 'website_url', type: 'varchar', nullable: true })
  websiteUrl?: string;

  /** Temple PAN — not encrypted (public information used on receipts). */
  @Column({ name: 'pan_number', type: 'varchar', nullable: true })
  panNumber?: string;

  @Column({ name: 'trust_reg_number', type: 'varchar', nullable: true })
  trustRegNumber?: string;

  @Column({ name: 'number_80g', type: 'varchar', nullable: true })
  number80g?: string;

  @Column({ name: 'number_80g_expiry', type: 'date', nullable: true })
  number80gExpiry?: Date;

  @Column({ name: 'is_80g_registered', type: 'boolean', default: false })
  is80gRegistered: boolean;

  @Column({ name: 'fcra_number', type: 'varchar', nullable: true })
  fcraNumber?: string;

  @Column({ name: 'receipt_prefix', type: 'varchar', length: 20, default: 'RCPT' })
  receiptPrefix: string;

  @Column({ name: 'upi_id', type: 'varchar', nullable: true })
  upiId?: string;

  @Column({ name: 'razorpay_key_id', type: 'varchar', nullable: true })
  razorpayKeyId?: string;

  /** Razorpay secret — encrypted at rest in the application layer. */
  @Column({ name: 'razorpay_key_secret', type: 'varchar', nullable: true })
  razorpayKeySecret?: string;

  @Column({
    type: 'enum',
    enum: TemplePlan,
    default: TemplePlan.STARTER,
  })
  plan: TemplePlan;

  @Column({ name: 'plan_valid_until', type: 'timestamptz', nullable: true })
  planValidUntil?: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'onboarding_completed_at', type: 'timestamptz', nullable: true })
  onboardingCompletedAt?: Date;

  /** Free-form per-temple configuration blob (feature flags, notification prefs, etc.). */
  @Column({ type: 'jsonb', default: '{}' })
  settings: Record<string, unknown>;

  @Column({ type: 'varchar', default: 'Asia/Kolkata' })
  timezone: string;

  @Column({ name: 'primary_language', type: 'varchar', length: 5, default: 'hi' })
  primaryLanguage: string;
}
