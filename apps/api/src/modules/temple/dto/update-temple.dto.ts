import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  MaxLength,
  Matches,
  IsEmail,
} from 'class-validator';
import { TempleCategory } from '@devaseva/types';

/**
 * Fields a temple ADMIN is allowed to update.
 * Sensitive fields (razorpay_key_secret, plan) are excluded — only SUPER_ADMIN manages those.
 * logo_url / banner_url are updated via dedicated upload endpoints, not here.
 */
export class UpdateTempleDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEnum(TempleCategory)
  category?: TempleCategory;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  addressLine2?: string;

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
  @Matches(/^\d{6}$/, { message: 'PIN code must be 6 digits' })
  pinCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Phone must be a valid 10-digit Indian mobile number' })
  phonePrimary?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Phone must be a valid 10-digit Indian mobile number' })
  phoneWhatsapp?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  panNumber?: string;

  @IsOptional()
  @IsString()
  trustRegNumber?: string;

  @IsOptional()
  @IsString()
  number80g?: string;

  @IsOptional()
  @IsDateString()
  number80gExpiry?: string;

  @IsOptional()
  @IsBoolean()
  is80gRegistered?: boolean;

  @IsOptional()
  @IsString()
  fcraNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  receiptPrefix?: string;

  @IsOptional()
  @IsString()
  upiId?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  primaryLanguage?: string;
}
