import { Injectable } from '@nestjs/common';

/**
 * FiscalYearUtil derives the Indian fiscal year string from a date.
 * Indian fiscal year runs April 1 → March 31.
 *
 * Timezone note: Indian Standard Time is UTC+5:30. Production servers
 * (AWS ECS) run in UTC. A UTC midnight on April 1 is 5:30 AM IST — still
 * April 1. But the danger window is the LAST 5.5 hours of March 31 IST
 * (18:30–24:00 UTC March 31 = 00:00–05:30 IST April 1). Without IST
 * conversion, a UTC server would compute March for what is April 1 IST,
 * stamping donations with the wrong fiscal year on legal 80G receipts.
 *
 * Fix: all calculations use the IST wall-clock date derived via the
 * Intl API (timeZone: 'Asia/Kolkata') — correct on any server timezone.
 *
 * Examples (IST dates):
 *   2025-03-31 → '2024-25'
 *   2025-04-01 → '2025-26'
 */

/** Validated fiscal year format: YYYY-YY e.g. '2025-26'. */
const FISCAL_YEAR_REGEX = /^\d{4}-\d{2}$/;

/**
 * Converts any Date to the IST wall-clock date components using the
 * Intl API with an explicit timeZone option — correct on any server
 * timezone (UTC, IST, etc.) without manual offset arithmetic.
 */
function toIstComponents(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => parseInt(parts.find((p) => p.type === type)!.value, 10);
  return { year: get('year'), month: get('month'), day: get('day') };
}

@Injectable()
export class FiscalYearUtil {
  /**
   * Returns the fiscal year string for the given date, using IST wall-clock.
   * Format: 'YYYY-YY' (e.g. '2025-26').
   */
  fromDate(date: Date): string {
    const { year, month } = toIstComponents(date);

    if (month >= 4) {
      // April or later: FY is year → year+1
      const nextYearShort = String(year + 1).slice(-2);
      return `${year}-${nextYearShort}`;
    } else {
      // January–March: FY is (year-1) → year
      const prevYear = year - 1;
      const yearShort = String(year).slice(-2);
      return `${prevYear}-${yearShort}`;
    }
  }

  /**
   * Returns the fiscal year string for the current IST wall-clock time.
   */
  current(): string {
    return this.fromDate(new Date());
  }

  /**
   * Returns the IST wall-clock date as a 'YYYY-MM-DD' string.
   * Use this when you have a server-side Date (e.g. new Date() or a Razorpay
   * capture timestamp) and need to store it as a date column without UTC shift.
   */
  toIstDateString(date: Date): string {
    const { year, month, day } = toIstComponents(date);
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  /**
   * Returns the UTC Date for April 1 00:00:00 IST of the given fiscal year.
   * Throws if the format is invalid.
   */
  startDate(fiscalYear: string): Date {
    this.assertValidFormat(fiscalYear);
    const startYear = parseInt(fiscalYear.split('-')[0] as string, 10);
    // April 1 00:00 IST = March 31 18:30 UTC
    return new Date(Date.UTC(startYear, 2, 31, 18, 30, 0));
  }

  /**
   * Returns the UTC Date for March 31 23:59:59 IST of the given fiscal year.
   * Throws if the format is invalid.
   */
  endDate(fiscalYear: string): Date {
    this.assertValidFormat(fiscalYear);
    const startYear = parseInt(fiscalYear.split('-')[0] as string, 10);
    // March 31 23:59:59 IST = March 31 18:29:59 UTC of the following year
    return new Date(Date.UTC(startYear + 1, 2, 31, 18, 29, 59));
  }

  /** Throws if fiscalYear does not match 'YYYY-YY'. */
  private assertValidFormat(fiscalYear: string): void {
    if (!FISCAL_YEAR_REGEX.test(fiscalYear)) {
      throw new Error(
        `Invalid fiscal year format: '${fiscalYear}'. Expected 'YYYY-YY' e.g. '2025-26'.`,
      );
    }
  }
}
