import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SevaBookingStatus } from '@devaseva/types';

/**
 * Query parameters for listing seva bookings with optional filters.
 * All filters are scoped to the requesting user's temple via service layer.
 */
export class ListSevaBookingsQueryDto {
  /** Page number (1-based). Defaults to 1. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  /** Items per page. Defaults to 20. Hard cap at 100. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  /** Filter by seva date (YYYY-MM-DD). Used for the day-sheet view. */
  @IsOptional()
  @IsDateString()
  date?: string;

  /** Filter by booking status. */
  @IsOptional()
  @IsEnum(SevaBookingStatus)
  status?: SevaBookingStatus;

  /** Filter by seva type. */
  @IsOptional()
  @IsUUID()
  sevaTypeId?: string;

  /** Filter by assigned priest. */
  @IsOptional()
  @IsUUID()
  priestId?: string;
}
