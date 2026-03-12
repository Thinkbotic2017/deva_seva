import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsUUID,
  MaxLength,
  Matches,
  Min,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Body for POST /donations/initiate-online (public, no JWT).
 * The temple is identified by slug rather than ID because the client knows only the public slug.
 */
export class InitiateOnlineDonationDto {
  /** Public temple slug (e.g. 'sri-venkateshwara'). Used to look up the temple. */
  @IsString()
  @IsNotEmpty()
  templeSlug: string;

  @IsUUID()
  categoryId: string;

  /** Amount in rupees. Converted to paise when creating the Razorpay order. */
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  donorName: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone must be a valid 10-digit Indian mobile number',
  })
  donorPhone?: string;

  /**
   * PAN number (optional). Required for 80G receipt.
   * Validated, encrypted, and masked in service — raw value is never stored.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/, {
    message: 'Invalid PAN format (expected ABCDE1234F)',
  })
  pan?: string;
}
