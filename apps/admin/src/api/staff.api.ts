import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResult } from './donations.api';

// ─── Types — matched exactly to /users backend response shape ─────────────────

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'ACCOUNTANT'
  | 'COUNTER_STAFF'
  | 'INVENTORY_MANAGER'
  | 'HEAD_PRIEST'
  | 'PRIEST'
  | 'TRUSTEE';

export interface StaffMember {
  id: string;
  phone: string;
  fullName: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface InviteStaffDto {
  fullName: string;
  phone: string;
  role: UserRole;
}

export interface UpdateStaffRoleDto {
  role: UserRole;
}

export interface ListStaffFilters {
  page?: number;
  limit?: number;
  role?: UserRole | '';
  isActive?: boolean;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const staffKeys = {
  all: ['staff'] as const,
  list: (filters: ListStaffFilters) => ['staff', 'list', filters] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** GET /users — paginated staff list, optionally filtered by role and active status. */
export function useStaffList(filters: ListStaffFilters = {}) {
  return useQuery({
    queryKey: staffKeys.list(filters),
    queryFn: () =>
      apiGet<PaginatedResult<StaffMember>>('/users', filters as Record<string, unknown>),
    placeholderData: (prev) => prev,
  });
}

/** POST /users/invite — creates a pending staff invitation. */
export function useInviteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: InviteStaffDto) =>
      apiPost<StaffMember>('/users/invite', dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

/** PATCH /users/:id/role — changes the role of an existing staff member. */
export function useUpdateStaffRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateStaffRoleDto }) =>
      apiPatch<StaffMember>(`/users/${id}/role`, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

/** POST /users/:id/deactivate — soft-deactivates a staff member (204 No Content). */
export function useDeactivateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/users/${id}/deactivate`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}
