import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsDateString,
  IsUUID,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LedgerType } from '@devaseva/types';

/**
 * Query parameters for listing finance ledger entries with optional filters.
 * All results are always scoped to the requesting user's temple.
 */
export class ListLedgerQueryDto {
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
  @IsEnum(LedgerType)
  type?: LedgerType;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsUUID()
  fundId?: string;

  /** Fiscal year in 'YYYY-YY' format (e.g. '2025-26'). */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: "fiscalYear must be in 'YYYY-YY' format" })
  fiscalYear?: string;
}
