import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '@/lib/api-client';
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

/**
 * Nested stats block returned by GET /devotees/:id.
 * Note: the field is `totalDonated` (not `totalDonationAmount`) — different from the list API.
 */
export interface DevoteeStats {
  donationCount: number;
  /** Decimal string — parseFloat() before arithmetic. */
  totalDonated: string;
  lastDonationAt: string | null;
  sevaCount: number;
}

/**
 * Full devotee profile returned by GET /devotees/:id.
 * Stats are nested under `stats` — NOT flat on the object like the list API.
 */
export interface DevoteeDetail {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  tier: DevoteeTier;
  city: string | null;
  state: string | null;
  gotra: string | null;
  nakshatra: string | null;
  panNumberMasked: string | null;
  memberSince: string | null;
  notes: string | null;
  createdAt: string;
  stats: DevoteeStats;
  recentDonations: Donation[];
}

/** Fields sent in PUT /devotees/:id body. */
export interface UpdateDevoteePayload {
  name?: string;
  email?: string;
  city?: string;
  state?: string;
  gotra?: string;
  pan?: string;
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

export function useUpdateDevotee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDevoteePayload }) =>
      apiPut<DevoteeDetail>(`/devotees/${id}`, payload),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: devoteeKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: devoteeKeys.all });
    },
  });
}
