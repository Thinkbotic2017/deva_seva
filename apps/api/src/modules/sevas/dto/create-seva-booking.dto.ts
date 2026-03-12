import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
  MaxLength,
  Matches,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SevaBookingPaymentMode } from '@devaseva/types';

/**
 * Validates additional sankalpa names (family members) included in the booking.
 */
export class SankalpaPersonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  gotra?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nakshatra?: string;
}

/**
 * DTO for creating a new seva booking at the counter.
 *
 * Security: templeId is never accepted here — it is always derived from req.user.templeId (JWT).
 * Financial: amount must be a valid positive number with at most 2 decimal places.
 */
export class CreateSevaBookingDto {
  /** UUID of the SevaType to book. */
  @IsUUID()
  sevaTypeId: string;

  /** Optional link to an existing devotee profile. */
  @IsOptional()
  @IsUUID()
  devoteeId?: string;

  /** Primary devotee name captured at booking time. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  devoteeName: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone must be a valid 10-digit Indian mobile number',
  })
  devoteePhone?: string;

  /** Seva date in ISO 8601 date format (YYYY-MM-DD). */
  @IsDateString()
  sevaDate: string;

  /** Time slot in 24-hour HH:MM format (e.g. '07:00'). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  timeSlot: string;

  /** Pricing tier name (e.g. 'Silver', 'Gold'). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tierName?: string;

  /**
   * Booking amount in rupees.
   * Must match a pricing tier price or the configured base price.
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  amount: number;

  /**
   * Payment mode — if provided and not ONLINE, the booking is confirmed immediately.
   * Omitting (or setting to ONLINE) creates a PENDING_PAYMENT booking.
   */
  @IsOptional()
  @IsEnum(SevaBookingPaymentMode)
  paymentMode?: SevaBookingPaymentMode;

  /** Devotee's sankalpa name (may differ from account name). */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sankalpaName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  gotra?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nakshatra?: string;

  @IsOptional()
  @IsString()
  sankalpaPurpose?: string;

  /** Additional family members to include in the sankalpa. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SankalpaPersonDto)
  additionalNames?: SankalpaPersonDto[];

  /** UUID of the priest to assign to this booking. */
  @IsOptional()
  @IsUUID()
  priestId?: string;
}
