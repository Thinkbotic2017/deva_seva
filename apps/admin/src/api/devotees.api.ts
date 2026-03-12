import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import type { PaginatedResult, Donation } from './donations.api';
import type { SevaBooking } from './sevas.api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DevoteeTier = 'REGULAR' | 'PATRON' | 'VIP' | 'LIFE_TRUSTEE';

export interface Devotee {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  tier: DevoteeTier;
  city: string | null;
  totalDonationAmount: string;
  donationCount: number;
  sevaCount: number;
  lastDonationAt: string | null;
  memberSince: string | null;
  createdAt: string;
}

export interface DevoteeDetail extends Devotee {
  panNumberMasked: string | null;
  gotra: string | null;
  nakshatra: string | null;
  notes: string | null;
}

export interface DevoteeHistory {
  donations: Donation[];
  sevas: SevaBooking[];
}

export interface DevoteeFilters {
  page?: number;
  limit?: number;
  search?: string;
  tier?: string;
  city?: string;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const devoteeKeys = {
  all: ['devotees'] as const,
  list: (filters: DevoteeFilters) => ['devotees', 'list', filters] as const,
  detail: (id: string) => ['devotees', 'detail', id] as const,
  history: (id: string) => ['devotees', 'history', id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDevotees(filters: DevoteeFilters) {
  return useQuery({
    queryKey: devoteeKeys.list(filters),
    queryFn: () =>
      apiGet<PaginatedResult<Devotee>>('/devotees', filters as Record<string, unknown>),
    placeholderData: (prev) => prev,
  });
}

export function useDevoteeDetail(id: string | null) {
  return useQuery({
    queryKey: devoteeKeys.detail(id ?? ''),
    queryFn: () => apiGet<DevoteeDetail>(`/devotees/${id}`),
    enabled: id !== null,
  });
}

export function useDevoteeHistory(id: string | null) {
  return useQuery({
    queryKey: devoteeKeys.history(id ?? ''),
    queryFn: () => apiGet<DevoteeHistory>(`/devotees/${id}/history`),
    enabled: id !== null,
  });
}
