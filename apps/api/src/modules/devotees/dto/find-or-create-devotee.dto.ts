import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
  IsEnum,
  IsEmail,
  IsDateString,
} from 'class-validator';
import { Gender } from '@devaseva/types';

/**
 * DTO for creating or finding a devotee by temple + phone.
 *
 * name + phone are required — the phone is the CRM key within a temple.
 * If a devotee with this phone already exists for the temple, the existing
 * record is returned unchanged (no partial update on find).
 */
export class FindOrCreateDevoteeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone must be a valid 10-digit Indian mobile number',
  })
  phone: string;

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
  @IsString()
  @MaxLength(100)
  gotra?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nakshatra?: string;
}
