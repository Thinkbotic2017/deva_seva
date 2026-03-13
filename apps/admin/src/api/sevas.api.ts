import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client';
import type { PaginatedResult } from './donations.api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SevaFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'FESTIVAL' | 'ON_DEMAND';

export interface PricingTier {
  name: string;
  price: number;
  description?: string;
}

export interface SevaType {
  id: string;
  name: string;
  nameHi?: string;
  description?: string;
  durationMinutes: number;
  frequency: SevaFrequency;
  isActive: boolean;
  isOnlineBookable: boolean;
  pricingTiers: PricingTier[];
  maxBookingsPerSlot: number;
  advanceBookingDays: number;
  requiresSankalpa: boolean;
  availableDays: number[];
  availableTimeSlots: Array<{ time: string; label?: string; maxBookings?: number }>;
  sortOrder: number;
  createdAt: string;
}

export interface CreateSevaTypeDto {
  name: string;
  nameHi?: string;
  description?: string;
  durationMinutes?: number;
  frequency: SevaFrequency;
  pricingTiers?: PricingTier[];
  maxBookingsPerSlot?: number;
  advanceBookingDays?: number;
  requiresSankalpa?: boolean;
  isOnlineBookable?: boolean;
  availableDays?: number[];
  sortOrder?: number;
}

export interface UpdateSevaTypeDto extends Partial<CreateSevaTypeDto> {
  isActive?: boolean;
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
  devoteeId?: string;
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

/** Admin variant — includes inactive types. staleTime: 0 so settings always re-fetches. */
export function useSevaTypesAdmin() {
  return useQuery({
    queryKey: [...sevaKeys.types, 'admin'] as const,
    queryFn: () => apiGet<SevaType[]>('/sevas/types', { includeInactive: 'true' }),
    staleTime: 0,
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

export function useCreateSevaType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSevaTypeDto) => apiPost<SevaType>('/sevas/types', dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sevaKeys.types });
    },
  });
}

export function useUpdateSevaType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSevaTypeDto }) =>
      apiPatch<SevaType>(`/sevas/types/${id}`, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sevaKeys.types });
    },
  });
}

export function useDeleteSevaType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/sevas/types/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sevaKeys.types });
    },
  });
}
