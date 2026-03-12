import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsDateString,
  IsUUID,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DonationMode, DonationStatus } from '@devaseva/types';

export class ListDonationsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(DonationMode)
  mode?: DonationMode;

  @IsOptional()
  @IsEnum(DonationStatus)
  status?: DonationStatus;

  /** Full-text search across donor name, phone, and receipt number. */
  @IsOptional()
  @IsString()
  search?: string;

  /** Filter by fiscal year (e.g. '2025-26'). */
  @IsOptional()
  @IsString()
  fiscalYear?: string;
}
