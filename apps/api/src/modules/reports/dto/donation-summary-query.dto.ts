import { IsOptional, IsDateString } from 'class-validator';

/**
 * Query parameters for the donation summary report.
 * At least one date bound is recommended for meaningful results.
 */
export class DonationSummaryQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
