import { Entity, Column } from 'typeorm';
import { TenantBaseEntity, PricingTier, TimeSlot } from '@devaseva/types';
import { SevaFrequency } from '@devaseva/types';

/**
 * SevaType defines a temple's catalogue of available sevas (rituals/services).
 * Pricing and time-slot configuration live in jsonb columns — no separate tables.
 *
 * image_url stores an S3 key only. Generate a pre-signed URL at serve time.
 */
@Entity('seva_types')
export class SevaType extends TenantBaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 200 })
  name: string;

  /** Hindi transliteration of the seva name. */
  @Column({ name: 'name_hi', type: 'varchar', length: 200, nullable: true })
  nameHi?: string;

  /** Regional-language transliteration of the seva name. */
  @Column({ name: 'name_local', type: 'varchar', length: 200, nullable: true })
  nameLocal?: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  /** Duration of one seva slot in minutes. */
  @Column({ name: 'duration_minutes', type: 'integer', default: 60 })
  durationMinutes: number;

  @Column({ name: 'frequency', type: 'enum', enum: SevaFrequency })
  frequency: SevaFrequency;

  /**
   * Pricing tiers as jsonb.
   * Each entry: { name: string, price: number, description: string }
   * Example: [{ name: "Silver", price: 101, description: "Basic puja" }]
   */
  @Column({ name: 'pricing_tiers', type: 'jsonb', default: '[]' })
  pricingTiers: PricingTier[];

  /** Maximum concurrent bookings per time slot across all tiers. */
  @Column({ name: 'max_bookings_per_slot', type: 'integer', default: 1 })
  maxBookingsPerSlot: number;

  /** How many days in advance bookings can be made. */
  @Column({ name: 'advance_booking_days', type: 'integer', default: 30 })
  advanceBookingDays: number;

  /** When true, sankalpa (devotee intent) details are collected at booking. */
  @Column({ name: 'requires_sankalpa', type: 'boolean', default: false })
  requiresSankalpa: boolean;

  /** S3 key — NEVER a full URL. Generate pre-signed URL at serve time. */
  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  /** When true, this seva is bookable on the public web/mobile app. */
  @Column({ name: 'is_online_bookable', type: 'boolean', default: false })
  isOnlineBookable: boolean;

  /**
   * Days of the week this seva is available (0 = Sunday, 6 = Saturday).
   * Stored as jsonb array of integers.
   * Default: every day [0,1,2,3,4,5,6].
   */
  @Column({ name: 'available_days', type: 'jsonb', default: '[0,1,2,3,4,5,6]' })
  availableDays: number[];

  /**
   * Time slots available for this seva, stored as jsonb.
   * Each entry: { time: "07:00", label: "Morning", maxBookings: 2 }
   */
  @Column({ name: 'available_time_slots', type: 'jsonb', default: '[]' })
  availableTimeSlots: TimeSlot[];

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;
}
