import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
  IsEnum,
  IsEmail,
  IsDateString,
  IsBoolean,
  IsUUID,
  Length,
} from 'class-validator';
import { Gender, DevoteeTier } from '@devaseva/types';

/**
 * DTO for updating a devotee record.
 *
 * PAN handling:
 * - Provide a new PAN string to replace the existing one (will be re-encrypted).
 * - Omit the `pan` field entirely to leave the existing PAN unchanged.
 * - The raw PAN is NEVER returned in any response — only the masked value.
 *
 * Security: templeId is never accepted here — always from req.user.templeId (JWT).
 */
export class UpdateDevoteeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsDateString()
  anniversaryDate?: string;

  /**
   * Raw PAN — will be validated, encrypted, and masked.
   * Omit to keep existing PAN. Supply new value to replace and re-encrypt.
   * Format: AAAAA9999A (5 letters, 4 digits, 1 letter).
   */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/, {
    message: 'PAN must be in format AAAAA9999A',
  })
  pan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'PIN code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'PIN code must be 6 digits' })
  pinCode?: string;

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
  @MaxLength(50)
  rashi?: string;

  @IsOptional()
  @IsEnum(DevoteeTier)
  tier?: DevoteeTier;

  @IsOptional()
  @IsUUID()
  familyHeadId?: string;

  @IsOptional()
  @IsBoolean()
  whatsappOptedOut?: boolean;

  @IsOptional()
  @IsBoolean()
  smsOptedOut?: boolean;

  @IsOptional()
  @IsDateString()
  memberSince?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
