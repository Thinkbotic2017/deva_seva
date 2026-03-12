import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import type { PaginatedResult } from './donations.api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SevaType {
  id: string;
  name: string;
  isActive: boolean;
  pricingTiers: Array<{ name: string; price: number; description?: string }>;
}

export interface SevaBooking {
  id: string;
  bookingNumber: string | null;
  sevaTypeId: string;
  sevaType?: { name: string };
  devoteeName: string;
  devoteePhone: string | null;
  sevaDate: string;
  timeSlot: string;
  tierName: string;
  amount: string;
  paymentMode: string;
  status: string;
  sankalpaName: string | null;
  fiscalYear: string;
  createdAt: string;
}

export interface SevaBookingFilters {
  page?: number;
  limit?: number;
  date?: string;
  sevaTypeId?: string;
  status?: string;
}

export interface CreateSevaBookingDto {
  sevaTypeId: string;
  devoteeName: string;
  devoteePhone?: string;
  sevaDate: string;
  timeSlot: string;
  tierName: string;
  amount: number;
  paymentMode: string;
  sankalpaName?: string;
  gotra?: string;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const sevaKeys = {
  all: ['sevas'] as const,
  bookings: (filters: SevaBookingFilters) => ['sevas', 'bookings', filters] as const,
  types: ['sevas', 'types'] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useSevaBookings(filters: SevaBookingFilters) {
  return useQuery({
    queryKey: sevaKeys.bookings(filters),
    queryFn: () =>
      apiGet<PaginatedResult<SevaBooking>>('/sevas/bookings', filters as Record<string, unknown>),
    placeholderData: (prev) => prev,
  });
}

export function useSevaTypes() {
  return useQuery({
    queryKey: sevaKeys.types,
    queryFn: () => apiGet<SevaType[]>('/sevas/types'),
    staleTime: 5 * 60_000,
  });
}

export function useCreateSevaBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSevaBookingDto) => apiPost<SevaBooking>('/sevas/bookings', dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sevaKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
