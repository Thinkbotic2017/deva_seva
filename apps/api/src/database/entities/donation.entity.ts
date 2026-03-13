import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '@devaseva/types';
import { DonationMode, DonationStatus } from '@devaseva/types';

/**
 * Core donation record — the primary revenue entity.
 *
 * Security invariants:
 * - donor_pan_encrypted stores AES-256-GCM ciphertext only. NEVER the raw PAN.
 * - donor_pan_masked is safe for display (e.g. "ABCXX1234X").
 * - receipt_pdf_s3_key stores the S3 key only. Generate pre-signed URL at serve time.
 * - Soft-delete only — NEVER hard-delete a donation.
 *
 * Decimal fields: TypeORM returns decimal columns as strings. Always parseFloat() before math.
 */
@Entity('donations')
@Index(['templeId', 'paymentDate'])
@Index(['templeId', 'fiscalYear'])
@Index(['templeId', 'status'])
@Index(['templeId', 'receiptNumber'], { unique: true, where: '"receipt_number" IS NOT NULL' })
export class Donation extends TenantBaseEntity {
  /**
   * Auto-generated receipt number (atomic via Redis INCR).
   * Nullable until receipt is issued.
   * Partial unique index: UNIQUE(temple_id, receipt_number) WHERE receipt_number IS NOT NULL
   */
  @Column({ name: 'receipt_number', type: 'varchar', length: 50, nullable: true })
  receiptNumber?: string;

  /** Optional link to an existing devotee record. */
  @Index()
  @Column({ name: 'devotee_id', type: 'uuid', nullable: true })
  devoteeId?: string;

  /** Required — all donations belong to a category. */
  @Index()
  @Column({ name: 'category_id', type: 'uuid', nullable: false })
  categoryId: string;

  /** Captured at time of donation for display/receipts — not linked by FK. */
  @Column({ name: 'donor_name', type: 'varchar', length: 200 })
  donorName: string;

  @Column({ name: 'donor_phone', type: 'varchar', length: 15, nullable: true })
  donorPhone?: string;

  /**
   * AES-256-GCM encrypted PAN number.
   * Format: iv:authTag:ciphertext (all hex, colon-separated).
   * NEVER store raw PAN. NEVER log this value.
   */
  @Column({ name: 'donor_pan_encrypted', type: 'varchar', nullable: true })
  donorPanEncrypted?: string;

  /**
   * Masked PAN safe for display in the UI (e.g. "ABCXX1234X").
   * First 5 chars replaced with "ABCXX", last char preserved.
   */
  @Column({ name: 'donor_pan_masked', type: 'varchar', length: 12, nullable: true })
  donorPanMasked?: string;

  /** Donation amount. TypeORM returns decimal as string — use parseFloat() when doing math. */
  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'mode', type: 'enum', enum: DonationMode })
  mode: DonationMode;

  @Column({ name: 'status', type: 'enum', enum: DonationStatus, default: DonationStatus.PENDING })
  status: DonationStatus;

  /** True when the temple has 80G registration AND the category is 80g eligible. */
  @Column({ name: 'is_80g_eligible', type: 'boolean', default: false })
  is80gEligible: boolean;

  @Column({ name: 'is_anonymous', type: 'boolean', default: false })
  isAnonymous: boolean;

  /** Razorpay order ID — set for online donations initiated via /donations/initiate-online. */
  @Column({ name: 'razorpay_order_id', type: 'varchar', nullable: true })
  razorpayOrderId?: string;

  /** Razorpay payment ID — set after payment.captured webhook is verified. */
  @Column({ name: 'razorpay_payment_id', type: 'varchar', nullable: true })
  razorpayPaymentId?: string;

  /** Free-form payment reference (UPI transaction ID, cheque number, DD number, etc.). */
  @Column({ name: 'payment_reference', type: 'varchar', nullable: true })
  paymentReference?: string;

  @Column({
    name: 'payment_date',
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
  paymentDate: string;

  /**
   * S3 key for the generated 80G PDF receipt.
   * NEVER return this directly — generate a pre-signed URL (1hr TTL) at serve time.
   */
  @Column({ name: 'receipt_pdf_s3_key', type: 'varchar', nullable: true })
  receiptPdfS3Key?: string;

  @Column({ name: 'receipt_generated_at', type: 'timestamptz', nullable: true })
  receiptGeneratedAt?: Date;

  @Column({ name: 'receipt_sent_at', type: 'timestamptz', nullable: true })
  receiptSentAt?: Date;

  /** Optional routing to a specific fund. */
  @Index()
  @Column({ name: 'fund_id', type: 'uuid', nullable: true })
  fundId?: string;

  /** Staff member who recorded this donation. */
  @Column({ name: 'recorded_by', type: 'uuid', nullable: true })
  recordedBy?: string;

  /** Indian fiscal year in 'YYYY-YY' format (e.g. '2025-26'). Derived from payment_date. */
  @Column({ name: 'fiscal_year', type: 'varchar', length: 10 })
  fiscalYear: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;
}
