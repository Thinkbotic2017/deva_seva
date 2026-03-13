import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client';
import type { PaginatedResult } from './donations.api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FinanceCategory {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
  color?: string;
}

export interface CreateFinanceCategoryDto {
  name: string;
  type: 'INCOME' | 'EXPENSE';
  sortOrder?: number;
  color?: string;
}

export interface UpdateFinanceCategoryDto {
  name?: string;
  isActive?: boolean;
  sortOrder?: number;
  color?: string;
}

export interface LedgerEntry {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  entryDate: string;
  description: string;
  isAutoPosted: boolean;
  expenseStatus: string | null;
  fiscalYear: string;
  categoryId?: string;
  donationId?: string;
  sevaBookingId?: string;
  fund?: { name: string };
  createdAt: string;
}

export interface FinanceSummary {
  totalIncome: string;
  totalExpense: string;
  netBalance: string;
  period: { from: string; to: string };
}

export interface LedgerFilters {
  page?: number;
  limit?: number;
  type?: 'INCOME' | 'EXPENSE' | '';
  fromDate?: string;
  toDate?: string;
  fiscalYear?: string;
}

export interface CreateLedgerEntryDto {
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  categoryId?: string;
  description: string;
  entryDate: string;
  notes?: string;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const financeKeys = {
  all: ['finance'] as const,
  ledger: (filters: LedgerFilters) => ['finance', 'ledger', filters] as const,
  summary: (from: string, to: string) => ['finance', 'summary', from, to] as const,
  categories: (type?: string) => ['finance', 'categories', type] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useFinanceLedger(filters: LedgerFilters) {
  return useQuery({
    queryKey: financeKeys.ledger(filters),
    queryFn: () =>
      apiGet<PaginatedResult<LedgerEntry>>('/finance/ledger', filters as Record<string, unknown>),
    placeholderData: (prev) => prev,
  });
}

export function useFinanceSummary(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: financeKeys.summary(fromDate, toDate),
    queryFn: () =>
      apiGet<FinanceSummary>('/finance/summary', { fromDate, toDate }),
    enabled: Boolean(fromDate && toDate),
  });
}

export function useFinanceCategories(type?: 'INCOME' | 'EXPENSE') {
  return useQuery({
    queryKey: financeKeys.categories(type),
    queryFn: () =>
      apiGet<FinanceCategory[]>('/finance/categories', type ? { type } : undefined),
    staleTime: 5 * 60_000,
  });
}

/** Returns ALL categories for a type (including inactive) for the Settings admin UI. */
export function useFinanceCategoriesAdmin(type: 'INCOME' | 'EXPENSE') {
  return useQuery({
    queryKey: ['finance', 'categories-admin', type],
    queryFn: () =>
      apiGet<FinanceCategory[]>('/finance/categories', { type, includeInactive: 'true' }),
    staleTime: 0,
  });
}

export function useCreateFinanceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateFinanceCategoryDto) =>
      apiPost<FinanceCategory>('/finance/categories', dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['finance', 'categories-admin'] });
    },
  });
}

export function useUpdateFinanceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateFinanceCategoryDto }) =>
      apiPatch<FinanceCategory>(`/finance/categories/${id}`, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['finance', 'categories-admin'] });
    },
  });
}

export function useDeleteFinanceCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/finance/categories/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['finance', 'categories-admin'] });
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateLedgerEntryDto) => apiPost<LedgerEntry>('/finance/ledger', dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}

export function useCreateIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateLedgerEntryDto) => apiPost<LedgerEntry>('/finance/ledger', dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: financeKeys.all });
    },
  });
}
