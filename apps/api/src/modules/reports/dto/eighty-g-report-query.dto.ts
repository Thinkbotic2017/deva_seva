import { IsString, IsNotEmpty, Matches } from 'class-validator';

/**
 * Query parameters for the 80G (tax exemption) donation report.
 * Always scoped to a fiscal year per Indian income tax requirements.
 */
export class EightyGReportQueryDto {
  /**
   * Fiscal year in 'YYYY-YY' format (e.g. '2025-26').
   * Required — 80G certificates are issued per fiscal year.
   */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/, { message: "fiscalYear must be in 'YYYY-YY' format" })
  fiscalYear: string;
}
