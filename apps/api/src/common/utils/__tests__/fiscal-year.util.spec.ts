import { FiscalYearUtil } from '../fiscal-year.util';

/**
 * Helper: construct a UTC Date whose IST wall-clock matches the given
 * year/month/day. IST = UTC+5:30, so IST midnight = UTC 18:30 the day before.
 */
function istDate(year: number, month: number, day: number): Date {
  // month is 1-indexed here
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - (5 * 60 + 30) * 60 * 1000);
}

describe('FiscalYearUtil', () => {
  let util: FiscalYearUtil;

  beforeEach(() => {
    util = new FiscalYearUtil();
  });

  describe('fromDate — IST-aware', () => {
    it('returns 2025-26 for April 1 00:00 IST', () => {
      expect(util.fromDate(istDate(2025, 4, 1))).toBe('2025-26');
    });

    it('returns 2024-25 for March 31 23:59 IST', () => {
      const almostMidnight = new Date(
        Date.UTC(2025, 2, 31, 18, 29, 59), // 23:59:59 IST March 31
      );
      expect(util.fromDate(almostMidnight)).toBe('2024-25');
    });

    it('returns 2025-26 for a date in January IST', () => {
      expect(util.fromDate(istDate(2026, 1, 15))).toBe('2025-26');
    });

    it('returns 2025-26 for December IST', () => {
      expect(util.fromDate(istDate(2025, 12, 1))).toBe('2025-26');
    });

    it('handles the dangerous 5.5-hour UTC window at IST midnight April 1', () => {
      // 00:01 IST April 1 2025 = 18:31 UTC March 31 2025
      const justAfterIstMidnightApril1 = new Date(Date.UTC(2025, 2, 31, 18, 31, 0));
      expect(util.fromDate(justAfterIstMidnightApril1)).toBe('2025-26');
    });

    it('returns 2024-25 for 23:59 IST March 31 (last second of FY)', () => {
      // 23:59 IST March 31 = 18:29 UTC March 31
      const lastSecond = new Date(Date.UTC(2025, 2, 31, 18, 29, 0));
      expect(util.fromDate(lastSecond)).toBe('2024-25');
    });
  });

  describe('startDate', () => {
    it('returns a Date representing April 1 00:00 IST of the start year', () => {
      const start = util.startDate('2025-26');
      // April 1 00:00 IST = March 31 18:30 UTC
      expect(start.toISOString()).toBe('2025-03-31T18:30:00.000Z');
    });

    it('throws for an invalid format', () => {
      expect(() => util.startDate('2025')).toThrow('Invalid fiscal year format');
      expect(() => util.startDate('')).toThrow('Invalid fiscal year format');
    });
  });

  describe('endDate', () => {
    it('returns a Date representing March 31 23:59:59 IST of the end year', () => {
      const end = util.endDate('2025-26');
      // March 31 23:59:59 IST 2026 = March 31 18:29:59 UTC 2026
      expect(end.toISOString()).toBe('2026-03-31T18:29:59.000Z');
    });

    it('throws for an invalid format', () => {
      expect(() => util.endDate('notayear')).toThrow('Invalid fiscal year format');
    });
  });
});
