import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TempleSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  planId?: string;
  planBillingCycle?: string;
  planAmount?: string;
  planValidUntil?: string;
  lastPaymentAt?: string;
  isActive: boolean;
  suspensionReason?: string;
  createdAt: string;
  city?: string;
  state?: string;
  donationCount: number;
  devoteeCount: number;
}

export interface MembershipPlan {
  id: string;
  name: string;
  billingCycle: string;
  price: string;           // TypeORM decimal returned as string
  description?: string;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemStats {
  totalTemples: number;
  activeTemples: number;
  totalDonations: number;
  totalRevenue: string;    // decimal string, e.g. "123456.78"
  totalDevotees: number;
}

export interface CreatePlanDto {
  name: string;
  billingCycle: string;
  price: number;
  description?: string;
  features?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdatePlanDto {
  name?: string;
  billingCycle?: string;
  price?: number;
  description?: string;
  features?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

export interface ChargePlanDto {
  planId: string;
  billingCycle: string;
}

export interface ExtendPlanDto {
  months: number;
  reason: string;
}

export interface ChargeResult {
  paymentLinkUrl: string;
  amount: number;
  planName: string;
}

export interface InviteTempleAdminDto {
  phone: string;
  fullName: string;
  email?: string;
}

export interface InvitedUser {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: string;
  templeId: string;
  inviteToken?: string;
  createdAt: string;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const superAdminKeys = {
  temples: ['superadmin', 'temples'] as const,
  plans: ['superadmin', 'plans'] as const,
  stats: ['superadmin', 'stats'] as const,
};

// ─── Temple hooks ─────────────────────────────────────────────────────────────

/** GET /superadmin/temples */
export function useSuperAdminTemples() {
  return useQuery({
    queryKey: superAdminKeys.temples,
    queryFn: () => apiGet<TempleSummary[]>('/superadmin/temples'),
    staleTime: 30_000,
  });
}

/** PATCH /superadmin/temples/:id/suspend */
export function useSuspendTemple() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiPatch<TempleSummary>(`/superadmin/temples/${id}/suspend`, { reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: superAdminKeys.temples });
    },
  });
}

/** PATCH /superadmin/temples/:id/activate */
export function useActivateTemple() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiPatch<TempleSummary>(`/superadmin/temples/${id}/activate`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: superAdminKeys.temples });
    },
  });
}

/** POST /superadmin/temples/:id/invite-admin */
export function useInviteTempleAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: InviteTempleAdminDto }) =>
      apiPost<InvitedUser>(`/superadmin/temples/${id}/invite-admin`, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: superAdminKeys.temples });
    },
  });
}

/** POST /superadmin/temples/:id/charge */
export function useChargePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ChargePlanDto }) =>
      apiPost<ChargeResult>(`/superadmin/temples/${id}/charge`, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: superAdminKeys.temples });
    },
  });
}

/** POST /superadmin/temples/:id/extend */
export function useExtendPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ExtendPlanDto }) =>
      apiPost<TempleSummary>(`/superadmin/temples/${id}/extend`, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: superAdminKeys.temples });
    },
  });
}

// ─── Plan CRUD hooks ──────────────────────────────────────────────────────────

/** GET /superadmin/plans */
export function useMembershipPlans() {
  return useQuery({
    queryKey: superAdminKeys.plans,
    queryFn: () => apiGet<MembershipPlan[]>('/superadmin/plans'),
    staleTime: 60_000,
  });
}

/** POST /superadmin/plans */
export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePlanDto) =>
      apiPost<MembershipPlan>('/superadmin/plans', dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: superAdminKeys.plans });
    },
  });
}

/** PATCH /superadmin/plans/:id */
export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePlanDto }) =>
      apiPatch<MembershipPlan>(`/superadmin/plans/${id}`, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: superAdminKeys.plans });
    },
  });
}

/** DELETE /superadmin/plans/:id — deactivates (soft delete) */
export function useDeactivatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/superadmin/plans/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: superAdminKeys.plans });
    },
  });
}

// ─── Stats hook ───────────────────────────────────────────────────────────────

/** GET /superadmin/stats */
export function useSuperAdminStats() {
  return useQuery({
    queryKey: superAdminKeys.stats,
    queryFn: () => apiGet<SystemStats>('/superadmin/stats'),
    staleTime: 60_000,
  });
}
