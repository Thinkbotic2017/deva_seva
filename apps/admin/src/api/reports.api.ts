import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';

// ─── Types — matched exactly to /reports/* backend response shapes ─────────────

export interface DonationSummary {
  grandTotal: string;
  confirmedCount: number;
  byMode: Array<{ mode: string; total: string; count: number }>;
  byCategory: Array<{ categoryId: string; categoryName: string; total: string; count: number }>;
  from?: string;
  to?: string;
}

export interface EightyGEntry {
  id: string;
  receiptNumber?: string;
  donorName: string;
  donorPhone?: string;
  donorPanMasked?: string;
  amount: string;
  paymentDate: string;
  categoryName: string;
}

export interface EightyGReport {
  fiscalYear: string;
  totalEligibleAmount: string;
  donorCount: number;
  donations: EightyGEntry[];
}

export interface DaySheetSevaBooking {
  id: string;
  timeSlot: string;
  devoteeName: string;
  devoteePhone?: string;
  sankalpaName?: string;
  amount: string;
  status: string;
  sevaType?: { name: string };
}

export interface DaySheetDonation {
  id: string;
  donorName: string;
  amount: string;
  mode: string;
  status: string;
  receiptNumber?: string;
}

export interface DaySheet {
  date: string;
  donations: DaySheetDonation[];
  sevaBookings: DaySheetSevaBooking[];
  donationTotal: string;
  sevaTotal: string;
  grandTotal: string;
}

export interface FundBreakdown {
  fundId: string | null;
  fundName?: string | null;
  totalIncome: string;
  totalExpense: string;
}

export interface LedgerReport {
  fiscalYear: string;
  totalIncome: string;
  totalExpense: string;
  netBalance: string;
  byFund: FundBreakdown[];
  from?: string;
  to?: string;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const reportKeys = {
  donationSummary: (from: string, to: string) =>
    ['reports', 'donation-summary', from, to] as const,
  eightyG: (fiscalYear: string) => ['reports', '80g', fiscalYear] as const,
  daySheet: (date: string) => ['reports', 'day-sheet', date] as const,
  ledgerReport: (fiscalYear: string) => ['reports', 'ledger', fiscalYear] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** GET /reports/donations/summary — donation totals by mode + category. */
export function useDonationSummary(from: string, to: string) {
  return useQuery({
    queryKey: reportKeys.donationSummary(from, to),
    queryFn: () =>
      apiGet<DonationSummary>('/reports/donations/summary', { from, to }),
    enabled: Boolean(from && to),
  });
}

/** GET /reports/80g — 80G-eligible donations for a fiscal year. */
export function useEightyGReport(fiscalYear: string) {
  return useQuery({
    queryKey: reportKeys.eightyG(fiscalYear),
    queryFn: () =>
      apiGet<EightyGReport>('/reports/80g', { fiscalYear }),
    enabled: Boolean(fiscalYear),
  });
}

/** GET /reports/day-sheet — all donations + seva bookings for a given date. */
export function useDaySheet(date: string) {
  return useQuery({
    queryKey: reportKeys.daySheet(date),
    queryFn: () =>
      apiGet<DaySheet>('/reports/day-sheet', { date }),
    enabled: Boolean(date),
  });
}

/** GET /reports/ledger — fiscal-year income/expense summary with fund breakdown. */
export function useLedgerReport(fiscalYear: string) {
  return useQuery({
    queryKey: reportKeys.ledgerReport(fiscalYear),
    queryFn: () =>
      apiGet<LedgerReport>('/reports/ledger', { fiscalYear }),
    enabled: Boolean(fiscalYear),
  });
}
