import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DonationCategory {
  id: string;
  name: string;
  description?: string;
  is80gEligible: boolean;
  isActive: boolean;
  color: string;
  sortOrder: number;
  createdAt: string;
}

export interface CreateDonationCategoryDto {
  name: string;
  description?: string;
  is80gEligible?: boolean;
  color?: string;
  sortOrder?: number;
}

export interface UpdateDonationCategoryDto {
  name?: string;
  description?: string;
  is80gEligible?: boolean;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
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
  categoryId?: string;
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
  devoteeId?: string;
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

/** Fetches all active donation categories for the temple. Used as a queryFn. */
export function fetchDonationCategories(): Promise<DonationCategory[]> {
  return apiGet<DonationCategory[]>('/donations/categories');
}

export function useDonationCategories() {
  return useQuery({
    queryKey: donationKeys.categories,
    queryFn: fetchDonationCategories,
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

/** Fetches all categories including inactive ones — for the Settings management page. */
export function useDonationCategoriesAdmin() {
  return useQuery({
    queryKey: [...donationKeys.categories, 'admin'] as const,
    queryFn: () =>
      apiGet<DonationCategory[]>('/donations/categories', {
        includeInactive: 'true',
      }),
    staleTime: 0,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDonationCategoryDto) =>
      apiPost<DonationCategory>('/donations/categories', dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: donationKeys.categories });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDonationCategoryDto }) =>
      apiPatch<DonationCategory>(`/donations/categories/${id}`, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: donationKeys.categories });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/donations/categories/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: donationKeys.categories });
    },
  });
}
