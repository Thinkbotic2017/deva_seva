import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TempleProfile {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  upiId?: string;
  razorpayKeyId?: string;
  is80gRegistered: boolean;
  plan: string;
  isActive: boolean;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Fetches the current temple's profile. */
export function useTempleProfile() {
  return useQuery({
    queryKey: ['temple', 'profile'],
    queryFn: () => apiGet<TempleProfile>('/temples/profile'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
