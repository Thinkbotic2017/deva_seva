import { IsOptional, IsDateString, Matches, IsNotEmpty, IsString } from 'class-validator';

/**
 * Query parameters for the ledger income vs expense report.
 */
export class LedgerReportQueryDto {
  /**
   * Fiscal year in 'YYYY-YY' format (e.g. '2025-26').
   * Required — the ledger report is always scoped to a fiscal year.
   */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/, { message: "fiscalYear must be in 'YYYY-YY' format" })
  fiscalYear: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
