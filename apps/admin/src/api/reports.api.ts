import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import type { Donation } from './donations.api';
import type { SevaBooking } from './sevas.api';
import type { LedgerEntry } from './finance.api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DonationAnalytics {
  daily: Array<{ date: string; count: number; total: string }>;
  byCategory: Array<{ categoryName: string; count: number; total: string }>;
  byMode: Array<{ mode: string; count: number; total: string }>;
  topDonors: Array<{ donorName: string; total: string; count: number }>;
}

export interface EightyGSummary {
  totalEligible: string;
  donorsCount: number;
  donations: Donation[];
  downloadUrl: string | null;
}

export interface DaySheet {
  date: string;
  bookings: SevaBooking[];
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const reportKeys = {
  donationAnalytics: (from: string, to: string) =>
    ['reports', 'donation-analytics', from, to] as const,
  eightyG: (fiscalYear: string) => ['reports', '80g', fiscalYear] as const,
  daySheet: (date: string) => ['reports', 'day-sheet', date] as const,
  ledgerReport: (from: string, to: string) =>
    ['reports', 'ledger', from, to] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDonationAnalytics(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: reportKeys.donationAnalytics(fromDate, toDate),
    queryFn: () =>
      apiGet<DonationAnalytics>('/donations/analytics', { fromDate, toDate }),
    enabled: Boolean(fromDate && toDate),
  });
}

export function useEightyGSummary(fiscalYear: string) {
  return useQuery({
    queryKey: reportKeys.eightyG(fiscalYear),
    queryFn: () => apiGet<EightyGSummary>('/donations/80g-summary', { fiscalYear }),
    enabled: Boolean(fiscalYear),
  });
}

export function useDaySheet(date: string) {
  return useQuery({
    queryKey: reportKeys.daySheet(date),
    queryFn: () => apiGet<DaySheet>('/sevas/bookings/day-sheet', { date }),
    enabled: Boolean(date),
  });
}

export function useLedgerReport(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: reportKeys.ledgerReport(fromDate, toDate),
    queryFn: () =>
      apiGet<{ entries: LedgerEntry[]; totalIncome: string; totalExpense: string; net: string }>(
        '/finance/ledger',
        { fromDate, toDate, limit: 200 },
      ),
    enabled: Boolean(fromDate && toDate),
  });
}
