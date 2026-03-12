import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DevoteeTier } from '@devaseva/types';

/**
 * Query parameters for listing devotees with optional filters.
 * All results are scoped to the requesting user's temple.
 */
export class ListDevoteesQueryDto {
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

  /** Full-text search across name and phone fields. */
  @IsOptional()
  @IsString()
  search?: string;

  /** Filter by devotee tier. */
  @IsOptional()
  @IsEnum(DevoteeTier)
  tier?: DevoteeTier;

  /** Filter by city. */
  @IsOptional()
  @IsString()
  city?: string;
}
