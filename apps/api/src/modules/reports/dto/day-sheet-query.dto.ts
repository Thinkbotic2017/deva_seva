import { IsDateString } from 'class-validator';

/**
 * Query parameters for the day-sheet report.
 */
export class DaySheetQueryDto {
  /** ISO 8601 date (e.g. '2025-06-15'). */
  @IsDateString()
  date: string;
}
