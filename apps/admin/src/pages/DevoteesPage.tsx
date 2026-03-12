import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/ui/Drawer';
import { Pagination } from '@/components/ui/Pagination';
import {
  useDevotees, useDevoteeDetail, useUpdateDevotee,
  type DevoteeFilters, type Devotee, type UpdateDevoteePayload,
} from '@/api/devotees.api';

// ─── Tier badge variant ───────────────────────────────────────────────────────

const TIER_VARIANT = {
  REGULAR:      'neutral',
  PATRON:       'info',
  VIP:          'warning',
  LIFE_TRUSTEE: 'success',
} as const;

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-surface-2 rounded animate-pulse" style={{ width: `${55 + (j * 13) % 45}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ─── Devotee detail drawer ────────────────────────────────────────────────────

function DevoteeDetailDrawer({
  devoteeId,
  onClose,
}: {
  devoteeId: string | null;
  onClose: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateDevoteePayload>({});
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof UpdateDevoteePayload, string>>>({});

  const { data: devotee, isLoading: detailLoading } = useDevoteeDetail(devoteeId);
  const updateMutation = useUpdateDevotee();

  function openEdit() {
    if (!devotee) return;
    setEditForm({
      name: devotee.name,
      email: devotee.email ?? '',
      city: devotee.city ?? '',
      state: devotee.state ?? '',
      gotra: devotee.gotra ?? '',
      pan: '',
    });
    setEditErrors({});
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditErrors({});
  }

  function setField<K extends keyof UpdateDevoteePayload>(key: K, value: string) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
    setEditErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSave() {
    if (!devoteeId || !devotee) return;

    const errors: Partial<Record<keyof UpdateDevoteePayload, string>> = {};
    if (!editForm.name?.trim()) errors.name = 'Name is required';
    if (editForm.pan && !/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/.test(editForm.pan)) {
      errors.pan = 'PAN must be in format AAAAA9999A';
    }
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    const payload: UpdateDevoteePayload = {
      name: editForm.name?.trim(),
      email: editForm.email?.trim() || undefined,
      city: editForm.city?.trim() || undefined,
      state: editForm.state?.trim() || undefined,
      gotra: editForm.gotra?.trim() || undefined,
      pan: editForm.pan?.trim() || undefined,
    };

    await updateMutation.mutateAsync({ id: devoteeId, payload });
    setIsEditing(false);
  }

  // Stats with safe fallbacks — the detail API nests these under `stats`
  const totalDonated = parseFloat(devotee?.stats?.totalDonated ?? '0') || 0;
  const donationCount = parseInt(String(devotee?.stats?.donationCount ?? '0'), 10) || 0;
  const sevaCount = parseInt(String(devotee?.stats?.sevaCount ?? '0'), 10) || 0;
  const lastDonationAt = devotee?.stats?.lastDonationAt
    ? new Date(devotee.stats.lastDonationAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null;

  return (
    <Drawer isOpen={devoteeId !== null} onClose={onClose} title="Devotee Profile">
      {detailLoading ? (
        <div className="p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-5 bg-surface-2 rounded animate-pulse w-3/4" />
          ))}
        </div>
      ) : devotee ? (
        isEditing ? (
          /* ── Edit form ──────────────────────────────────────────────── */
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <button
                className="text-caption text-text-muted hover:text-text-primary transition-colors"
                onClick={cancelEdit}
              >
                ← Back
              </button>
              <span className="text-label text-text-secondary">Edit Profile</span>
            </div>

            <Input
              label="Full Name *"
              value={editForm.name ?? ''}
              onChange={(e) => setField('name', e.target.value)}
              error={editErrors.name}
            />

            <Input
              label="Phone"
              value={devotee.phone}
              readOnly
              hint="Phone number cannot be changed"
              className="opacity-60"
            />

            <Input
              label="Email"
              type="email"
              value={editForm.email ?? ''}
              onChange={(e) => setField('email', e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                value={editForm.city ?? ''}
                onChange={(e) => setField('city', e.target.value)}
              />
              <Input
                label="State"
                value={editForm.state ?? ''}
                onChange={(e) => setField('state', e.target.value)}
              />
            </div>

            <Input
              label="Gotra"
              value={editForm.gotra ?? ''}
              onChange={(e) => setField('gotra', e.target.value)}
            />

            <Input
              label="PAN (optional — leave blank to keep existing)"
              placeholder="ABCDE1234F"
              value={editForm.pan ?? ''}
              onChange={(e) => setField('pan', e.target.value.toUpperCase())}
              maxLength={10}
              error={editErrors.pan}
              hint={devotee.panNumberMasked ? `Current: ${devotee.panNumberMasked}` : undefined}
            />

            {updateMutation.isError && (
              <p className="text-caption text-danger">Failed to save. Please try again.</p>
            )}

            <div className="flex gap-3 pt-2 border-t border-border">
              <Button variant="ghost" className="flex-1" onClick={cancelEdit} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button className="flex-1" loading={updateMutation.isPending} onClick={() => { void handleSave(); }}>
                Save Changes
              </Button>
            </div>
          </div>
        ) : (
          /* ── Profile view ───────────────────────────────────────────── */
          <div>
            {/* Profile */}
            <div className="p-6 border-b border-border space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                  {devotee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-h3 text-text-primary">{devotee.name}</h3>
                  <p className="text-caption text-text-muted">{devotee.phone}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Badge label={devotee.tier} variant={TIER_VARIANT[devotee.tier]} />
                  <Button size="sm" variant="secondary" onClick={openEdit}>
                    Edit
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <InfoRow label="Email" value={devotee.email} />
                <InfoRow label="City" value={devotee.city} />
                <InfoRow label="PAN" value={devotee.panNumberMasked} />
                <InfoRow label="Gotra" value={devotee.gotra} />
                <InfoRow
                  label="Member Since"
                  value={new Date(devotee.memberSince ?? devotee.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                />
                <InfoRow label="Last Donation" value={lastDonationAt} />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <StatBox label="Total Donated" value={`₹${totalDonated.toLocaleString('en-IN')}`} />
                <StatBox label="Donations" value={String(donationCount)} />
                <StatBox label="Sevas" value={String(sevaCount)} />
              </div>

              {devotee.notes && (
                <p className="text-caption text-text-muted bg-surface-2 rounded-md p-3 mt-1">
                  {devotee.notes}
                </p>
              )}
            </div>

            {/* Donation history — sourced from recentDonations in the detail response */}
            <div className="p-6">
              <h4 className="text-label font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Donation History
              </h4>

              {!devotee.recentDonations.length ? (
                <p className="text-caption text-text-muted">No donations yet</p>
              ) : (
                <div className="space-y-2">
                  {devotee.recentDonations.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-md bg-surface-2">
                      <div>
                        <p className="text-body text-text-primary">
                          {d.category?.name ?? 'Donation'}
                        </p>
                        <p className="text-caption text-text-muted">
                          {new Date(d.paymentDate).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })} · {d.mode}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-label font-semibold text-text-primary">
                          ₹{parseFloat(d.amount).toLocaleString('en-IN')}
                        </p>
                        <Badge label={d.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      ) : null}
    </Drawer>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-caption text-text-muted">{label}</p>
      <p className="text-body text-text-primary">{value ?? '—'}</p>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-2 rounded-md p-3 text-center">
      <p className="text-h3 font-bold text-text-primary">{value}</p>
      <p className="text-caption text-text-muted mt-0.5">{label}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DevoteesPage() {
  const [filters, setFilters] = useState<DevoteeFilters>({ page: 1, limit: 20 });
  const [selectedDevoteeId, setSelectedDevoteeId] = useState<string | null>(null);

  const { data, isLoading, isError } = useDevotees(filters);
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-h1 font-bold text-text-primary">Devotees</h1>
        {meta && (
          <p className="mt-0.5 text-caption text-text-muted">{meta.total} registered devotees</p>
        )}
      </div>

      {/* Search */}
      <div className="flex gap-3 rounded-lg bg-surface border border-border p-4">
        <div className="flex-1 max-w-sm">
          <Input
            label="Search"
            placeholder="Name or phone number…"
            value={filters.search ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value || undefined, page: 1 }))
            }
          />
        </div>
        <div className="min-w-[140px]">
          <Input
            label="City"
            placeholder="Filter by city"
            value={filters.city ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, city: e.target.value || undefined, page: 1 }))
            }
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
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Phone</th>
                <th className="px-4 py-3 text-left text-caption text-text-muted font-medium uppercase tracking-wide">Tier</th>
                <th className="px-4 py-3 text-right text-caption text-text-muted font-medium uppercase tracking-wide">Total Donated</th>
                <th className="px-4 py-3 text-center text-caption text-text-muted font-medium uppercase tracking-wide">Donations</th>
                <th className="px-4 py-3 text-center text-caption text-text-muted font-medium uppercase tracking-wide">Sevas</th>
              </tr>
            </thead>

            {isLoading ? (
              <TableSkeleton />
            ) : isError ? (
              <tbody>
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-danger text-body">
                    Failed to load devotees. Please try again.
                  </td>
                </tr>
              </tbody>
            ) : !data?.data.length ? (
              <tbody>
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-text-muted text-body">
                    No devotees found
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {data.data.map((d: Devotee) => (
                  <tr
                    key={d.id}
                    className="border-b border-border hover:bg-surface-2 transition-colors cursor-pointer"
                    onClick={() => setSelectedDevoteeId(d.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold flex-shrink-0">
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-label text-text-primary">{d.name}</p>
                          {d.city && <p className="text-caption text-text-muted">{d.city}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-body text-text-secondary">{d.phone}</td>
                    <td className="px-4 py-3">
                      <Badge label={d.tier} variant={TIER_VARIANT[d.tier]} />
                    </td>
                    <td className="px-4 py-3 text-right text-label font-semibold text-text-primary">
                      ₹{(parseFloat(d.totalDonationAmount ?? '0') || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center text-body text-text-secondary">
                      {d.donationCount}
                    </td>
                    <td className="px-4 py-3 text-center text-body text-text-secondary">
                      {d.sevaCount}
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

      {/* Detail drawer */}
      <DevoteeDetailDrawer
        devoteeId={selectedDevoteeId}
        onClose={() => setSelectedDevoteeId(null)}
      />
    </div>
  );
}
