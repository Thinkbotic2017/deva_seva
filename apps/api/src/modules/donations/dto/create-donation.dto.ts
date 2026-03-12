import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUUID,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DonationMode } from '@devaseva/types';

export class CreateDonationDto {
  /** ID of the donation category. Must belong to the same temple. */
  @IsUUID()
  categoryId: string;

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
   * Donation amount in rupees (positive, max 2 decimal places).
   * Stored as decimal(12,2) — do NOT send paise here.
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @IsEnum(DonationMode)
  mode: DonationMode;

  /** UPI transaction ID, cheque number, DD number, etc. */
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsDateString()
  paymentDate: string;

  /**
   * PAN number for 80G receipt (optional).
   * Service will validate format, encrypt, and produce a masked copy.
   * NEVER returned in responses — only the masked version is exposed.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/, {
    message: 'Invalid PAN format (expected ABCDE1234F)',
  })
  pan?: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  /** Link to an existing devotee profile (optional). */
  @IsOptional()
  @IsUUID()
  devoteeId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
