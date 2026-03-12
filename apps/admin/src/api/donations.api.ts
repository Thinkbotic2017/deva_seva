import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DonationCategory {
  id: string;
  name: string;
  is80gEligible: boolean;
  isActive: boolean;
}

export interface Donation {
  id: string;
  receiptNumber: string | null;
  donorName: string;
  donorPhone: string | null;
  amount: string;               // TypeORM returns decimal as string
  mode: string;
  status: string;
  is80gEligible: boolean;
  isAnonymous: boolean;
  paymentDate: string;
  fiscalYear: string;
  donorPanMasked: string | null;
  categoryId: string;
  category?: { name: string };
  notes: string | null;
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DonationFilters {
  page?: number;
  limit?: number;
  fromDate?: string;
  toDate?: string;
  mode?: string;
  status?: string;
  search?: string;
}

export interface CreateDonationDto {
  categoryId: string;
  donorName: string;
  donorPhone?: string;
  amount: number;
  mode: string;
  paymentDate: string;
  pan?: string;
  isAnonymous?: boolean;
  notes?: string;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const donationKeys = {
  all: ['donations'] as const,
  list: (filters: DonationFilters) => ['donations', 'list', filters] as const,
  categories: ['donations', 'categories'] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDonations(filters: DonationFilters) {
  return useQuery({
    queryKey: donationKeys.list(filters),
    queryFn: () =>
      apiGet<PaginatedResult<Donation>>('/donations', filters as Record<string, unknown>),
    placeholderData: (prev) => prev,   // keep previous data while refetching (v5)
  });
}

export function useDonationCategories() {
  return useQuery({
    queryKey: donationKeys.categories,
    queryFn: () => apiGet<DonationCategory[]>('/donations/categories'),
    staleTime: 5 * 60_000,             // categories rarely change
  });
}

export function useCreateDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDonationDto) => apiPost<Donation>('/donations', dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: donationKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
