import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import {
  useStaffList,
  useInviteStaff,
  useUpdateStaffRole,
  useDeactivateStaff,
  type StaffMember,
  type UserRole,
  type InviteStaffDto,
  type ListStaffFilters,
} from '@/api/staff.api';

// ─── Role display config ──────────────────────────────────────────────────────

const ROLE_META: Record<UserRole, { label: string; className: string }> = {
  SUPER_ADMIN:       { label: 'Super Admin',      className: 'bg-amber-500/10 text-amber-500'   },
  ADMIN:             { label: 'Admin',            className: 'bg-danger/10 text-danger'         },
  ACCOUNTANT:        { label: 'Accountant',       className: 'bg-info/10 text-info'             },
  COUNTER_STAFF:     { label: 'Counter Staff',    className: 'bg-success/10 text-success'       },
  INVENTORY_MANAGER: { label: 'Inventory Mgr',    className: 'bg-primary/10 text-primary'       },
  HEAD_PRIEST:       { label: 'Head Priest',      className: 'bg-surface-2 text-text-primary'   },
  PRIEST:            { label: 'Priest',           className: 'bg-surface-2 text-text-secondary' },
  TRUSTEE:           { label: 'Trustee',          className: 'bg-surface-2 text-text-muted'     },
};

/** All roles that can be assigned via invite / role-change (SUPER_ADMIN excluded). */
const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'ADMIN',             label: 'Admin'             },
  { value: 'ACCOUNTANT',        label: 'Accountant'        },
  { value: 'COUNTER_STAFF',     label: 'Counter Staff'     },
  { value: 'INVENTORY_MANAGER', label: 'Inventory Manager' },
  { value: 'HEAD_PRIEST',       label: 'Head Priest'       },
  { value: 'PRIEST',            label: 'Priest'            },
  { value: 'TRUSTEE',           label: 'Trustee'           },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  const meta = ROLE_META[role];
  return (
    <span className={`px-2 py-0.5 rounded-full text-caption font-medium ${meta?.className ?? 'bg-surface-2 text-text-muted'}`}>
      {meta?.label ?? role}
    </span>
  );
}

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: 5 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-surface-2 rounded animate-pulse" style={{ width: `${50 + (j * 13) % 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ─── Invite modal ─────────────────────────────────────────────────────────────

interface InviteForm {
  fullName: string;
  phone: string;
  role: UserRole;
}

const EMPTY_INVITE: InviteForm = { fullName: '', phone: '', role: 'COUNTER_STAFF' };

function InviteModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<InviteForm>(EMPTY_INVITE);
  const [errors, setErrors] = useState<Partial<Record<keyof InviteForm, string>>>({});
  const inviteMutation = useInviteStaff();

  function setField<K extends keyof InviteForm>(key: K, value: InviteForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof InviteForm, string>> = {};
    if (!form.fullName.trim()) errs.fullName = 'Name is required';
    if (!form.phone.trim()) {
      errs.phone = 'Phone is required';
    } else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
      errs.phone = 'Enter a valid 10-digit Indian mobile number';
    }
    if (!form.role) errs.role = 'Role is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleClose() {
    setForm(EMPTY_INVITE);
    setErrors({});
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const dto: InviteStaffDto = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      role: form.role,
    };

    inviteMutation.mutate(dto, { onSuccess: handleClose });
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite Staff Member" width="max-w-md">
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <Input
          label="Full Name *"
          value={form.fullName}
          onChange={(e) => setField('fullName', e.target.value)}
          placeholder="e.g. Ramesh Kumar"
          error={errors.fullName}
        />

        <Input
          label="Mobile Number *"
          type="tel"
          value={form.phone}
          onChange={(e) => setField('phone', e.target.value)}
          placeholder="10-digit mobile"
          error={errors.phone}
        />

        <Select
          label="Role *"
          options={ROLE_OPTIONS}
          value={form.role}
          onChange={(e) => setField('role', e.target.value as UserRole)}
          error={errors.role}
        />

        <p className="text-caption text-text-muted">
          Staff will receive an invite link on their mobile number to set up their account.
        </p>

        {inviteMutation.isError && (
          <p className="text-caption text-danger">Failed to send invite. Please try again.</p>
        )}

        <div className="flex gap-3 pt-2 border-t border-border">
          <Button type="button" variant="ghost" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" loading={inviteMutation.isPending}>
            Send Invite
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit Role modal ──────────────────────────────────────────────────────────

function EditRoleModal({
  staff,
  onClose,
}: {
  staff: StaffMember | null;
  onClose: () => void;
}) {
  const [role, setRole] = useState<UserRole>(staff?.role ?? 'COUNTER_STAFF');
  const [error, setError] = useState('');
  const updateMutation = useUpdateStaffRole();

  // Sync role when staff changes
  function handleRoleChange(r: UserRole) {
    setRole(r);
    setError('');
  }

  function handleClose() {
    setError('');
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staff) return;
    updateMutation.mutate({ id: staff.id, dto: { role } }, { onSuccess: handleClose });
  }

  return (
    <Modal isOpen={Boolean(staff)} onClose={handleClose} title="Change Role" width="max-w-sm">
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        {staff && (
          <p className="text-body text-text-secondary">
            Changing role for <span className="font-semibold text-text-primary">{staff.fullName}</span>
          </p>
        )}

        <Select
          label="Role *"
          options={ROLE_OPTIONS}
          value={role}
          onChange={(e) => handleRoleChange(e.target.value as UserRole)}
        />

        {(error || updateMutation.isError) && (
          <p className="text-caption text-danger">{error || 'Failed to update role. Please try again.'}</p>
        )}

        <div className="flex gap-3 pt-2 border-t border-border">
          <Button type="button" variant="ghost" className="flex-1" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" loading={updateMutation.isPending}>
            Save Role
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type StatusFilter = '' | 'active' | 'inactive';

export function StaffPage() {
  const [filters, setFilters] = useState<ListStaffFilters>({ page: 1, limit: 20 });
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Build query filters from local state
  const queryFilters: ListStaffFilters = {
    ...filters,
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(statusFilter === 'active'   ? { isActive: true  } : {}),
    ...(statusFilter === 'inactive' ? { isActive: false } : {}),
  };

  const { data, isLoading, isError } = useStaffList(queryFilters);
  const deactivateMutation = useDeactivateStaff();

  const rows = data?.data ?? [];
  const meta = data?.meta;

  function handleFilterChange(key: keyof ListStaffFilters, value: unknown) {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }

  async function handleDeactivate(member: StaffMember) {
    const confirmed = window.confirm(
      `Deactivate "${member.fullName}"? They will lose access to the system immediately.`,
    );
    if (!confirmed) return;
    deactivateMutation.mutate(member.id);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-h1 font-bold text-text-primary">Staff</h1>
        <Button onClick={() => setShowInviteModal(true)}>+ Invite Staff</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-lg bg-surface border border-border p-4">
        <div className="flex-1 min-w-[160px]">
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            placeholder="All roles"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as UserRole | '');
              handleFilterChange('page', 1);
            }}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <Select
            label="Status"
            options={[
              { value: 'active',   label: 'Active only'   },
              { value: 'inactive', label: 'Inactive only' },
            ]}
            placeholder="All staff"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              handleFilterChange('page', 1);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-surface border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Last Login</th>
                <th className="px-4 py-3 text-right text-caption text-text-muted font-medium uppercase tracking-wide">Actions</th>
              </tr>
            </thead>

            {isLoading ? (
              <TableSkeleton />
            ) : isError ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-danger text-body">
                    Failed to load staff. Please try again.
                  </td>
                </tr>
              </tbody>
            ) : rows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-text-muted text-body">
                    No staff members found
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {rows.map((member) => (
                  <tr key={member.id} className="border-b border-border hover:bg-surface-2 transition-colors">
                    {/* Name + Phone */}
                    <td className="px-4 py-3">
                      <p className="text-label font-medium text-text-primary">{member.fullName}</p>
                      <p className="text-caption text-text-muted">{member.phone}</p>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <RoleBadge role={member.role} />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'px-2 py-0.5 rounded-full text-caption font-medium',
                          member.isActive
                            ? 'bg-success/10 text-success'
                            : 'bg-surface-2 text-text-muted',
                        ].join(' ')}
                      >
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Last Login */}
                    <td className="px-4 py-3 text-caption text-text-muted whitespace-nowrap">
                      {member.lastLoginAt
                        ? new Date(member.lastLoginAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })
                        : 'Never'}
                    </td>

                    {/* Actions — hidden for SUPER_ADMIN rows */}
                    <td className="px-4 py-3 text-right">
                      {member.role !== 'SUPER_ADMIN' && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingStaff(member)}
                          >
                            Edit Role
                          </Button>
                          {member.isActive && (
                            <Button
                              variant="danger"
                              size="sm"
                              loading={deactivateMutation.isPending && deactivateMutation.variables === member.id}
                              onClick={() => { void handleDeactivate(member); }}
                            >
                              Deactivate
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {meta && (
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={meta.limit}
            onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
          />
        )}
      </div>

      {/* Invite modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      {/* Edit Role modal */}
      <EditRoleModal
        staff={editingStaff}
        onClose={() => setEditingStaff(null)}
      />
    </div>
  );
}
