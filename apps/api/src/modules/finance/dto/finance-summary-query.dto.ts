import { IsOptional, IsDateString, Matches } from 'class-validator';

/**
 * Query parameters for the finance summary (income vs expense totals).
 * All three filters are optional; at least one is recommended for meaningful results.
 */
export class FinanceSummaryQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  /** Fiscal year in 'YYYY-YY' format (e.g. '2025-26'). */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: "fiscalYear must be in 'YYYY-YY' format" })
  fiscalYear?: string;
}
