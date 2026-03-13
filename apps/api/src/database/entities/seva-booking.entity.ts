import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity, SankalpaPerson } from '@devaseva/types';
import { SevaBookingPaymentMode, SevaBookingStatus } from '@devaseva/types';

/**
 * SevaBooking records a devotee's reservation for a specific seva on a date/time slot.
 *
 * Financial note:
 * - amount is decimal(10,2) — sufficient for seva pricing, per schema spec.
 * - TypeORM returns decimal columns as strings. Use parseFloat() before arithmetic.
 * - refund_amount is also decimal(10,2); nullable until a refund is issued.
 *
 * Booking number:
 * - Nullable until generated (similar to donation receipt_number).
 * - Partial unique index: UNIQUE(temple_id, booking_number) WHERE booking_number IS NOT NULL.
 *
 * Availability index:
 * - (temple_id, seva_date, time_slot, seva_type_id) — used by availability check queries
 *   to count confirmed bookings per slot without a full table scan.
 */
@Entity('seva_bookings')
@Index(['templeId', 'sevaDate'])
@Index(['templeId', 'sevaDate', 'timeSlot', 'sevaTypeId']) // Availability queries
@Index(['templeId', 'status'])
export class SevaBooking extends TenantBaseEntity {
  /**
   * Auto-generated booking reference number.
   * Nullable until generated via Redis INCR after payment confirmation.
   * Partial unique: UNIQUE(temple_id, booking_number) WHERE booking_number IS NOT NULL.
   */
  @Column({ name: 'booking_number', type: 'varchar', length: 50, nullable: true })
  bookingNumber?: string;

  /** Required — every booking belongs to a seva type. */
  @Column({ name: 'seva_type_id', type: 'uuid' })
  sevaTypeId: string;

  /** Optional link to an existing devotee profile. */
  @Column({ name: 'devotee_id', type: 'uuid', nullable: true })
  devoteeId?: string;

  /** Captured at booking time for display on day-sheet and confirmation messages. */
  @Column({ name: 'devotee_name', type: 'varchar', length: 200 })
  devoteeName: string;

  @Column({ name: 'devotee_phone', type: 'varchar', length: 15, nullable: true })
  devoteePhone?: string;

  @Column({
    name: 'seva_date',
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
  sevaDate: string;

  /** Time slot in 24-hour HH:MM format, e.g. '07:00'. */
  @Column({ name: 'time_slot', type: 'varchar', length: 10 })
  timeSlot: string;

  /** Name of the selected pricing tier (e.g. "Silver", "Gold"). */
  @Column({ name: 'tier_name', type: 'varchar', length: 100, nullable: true })
  tierName?: string;

  /**
   * Booking amount in rupees.
   * decimal(10,2) per schema — TypeORM returns as string. Use parseFloat() for math.
   */
  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({
    name: 'payment_mode',
    type: 'enum',
    enum: SevaBookingPaymentMode,
    nullable: true,
  })
  paymentMode?: SevaBookingPaymentMode;

  @Column({
    name: 'status',
    type: 'enum',
    enum: SevaBookingStatus,
    default: SevaBookingStatus.PENDING_PAYMENT,
  })
  status: SevaBookingStatus;

  // ── Sankalpa (devotee intent) details ────────────────────────────────────

  /** Primary devotee's sankalpa name (may differ from account name). */
  @Column({ name: 'sankalpa_name', type: 'varchar', length: 200, nullable: true })
  sankalphaName?: string;

  @Column({ name: 'gotra', type: 'varchar', length: 100, nullable: true })
  gotra?: string;

  @Column({ name: 'nakshatra', type: 'varchar', length: 50, nullable: true })
  nakshatra?: string;

  @Column({ name: 'sankalpa_purpose', type: 'text', nullable: true })
  sankalpaPurpose?: string;

  /**
   * Additional family members included in the sankalpa.
   * Stored as jsonb: [{ name, gotra, nakshatra }]
   */
  @Column({ name: 'additional_names', type: 'jsonb', default: '[]' })
  additionalNames: SankalpaPerson[];

  // ── Assignment & delivery ─────────────────────────────────────────────────

  @Column({ name: 'priest_id', type: 'uuid', nullable: true })
  priestId?: string;

  // ── Razorpay (online bookings) ────────────────────────────────────────────

  @Column({ name: 'razorpay_order_id', type: 'varchar', nullable: true })
  razorpayOrderId?: string;

  @Column({ name: 'razorpay_payment_id', type: 'varchar', nullable: true })
  razorpayPaymentId?: string;

  // ── Timestamps ────────────────────────────────────────────────────────────

  @Column({ name: 'confirmation_sent_at', type: 'timestamptz', nullable: true })
  confirmationSentAt?: Date;

  @Column({ name: 'reminder_sent_at', type: 'timestamptz', nullable: true })
  reminderSentAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancellation_reason', type: 'varchar', nullable: true })
  cancellationReason?: string;

  /**
   * Refund amount in rupees (nullable until a refund is issued).
   * decimal(10,2) — TypeORM returns as string.
   */
  @Column({ name: 'refund_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount?: string;

  /** Staff member who recorded this booking. */
  @Column({ name: 'recorded_by', type: 'uuid', nullable: true })
  recordedBy?: string;

  /** Indian fiscal year in 'YYYY-YY' format. Derived from seva_date. */
  @Column({ name: 'fiscal_year', type: 'varchar', length: 10 })
  fiscalYear: string;
}
