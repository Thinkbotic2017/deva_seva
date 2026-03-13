import { useState } from 'react';
import {
  useSuperAdminTemples,
  useMembershipPlans,
  useSuperAdminStats,
  useSuspendTemple,
  useActivateTemple,
  useChargePlan,
  useExtendPlan,
  useCreatePlan,
  useUpdatePlan,
  useDeactivatePlan,
  useInviteTempleAdmin,
  type TempleSummary,
  type MembershipPlan,
  type ChargePlanDto,
  type ExtendPlanDto,
  type CreatePlanDto,
  type InviteTempleAdminDto,
  type InvitedUser,
} from '@/api/superadmin.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: string | number | undefined): string {
  if (value === undefined || value === null) return '—';
  return '₹' + parseFloat(String(value)).toLocaleString('en-IN', {
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  });
}

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Shared modal shell ───────────────────────────────────────────────────────

function ModalShell({
  title, subtitle, onClose, children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-surface border border-border-subtle rounded-xl shadow-modal w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border-subtle">
          <div>
            <h2 className="text-h3 font-semibold text-text-primary">{title}</h2>
            {subtitle && <p className="text-caption text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-surface-2 transition-colors ml-4 flex-shrink-0"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Shared field primitives ──────────────────────────────────────────────────

const labelCls = 'block text-label text-text-secondary mb-1';
const inputCls = [
  'w-full border border-border-default rounded-md px-3 py-2 text-body',
  'bg-bg-surface-2 text-text-primary placeholder-text-muted',
  'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent',
  'transition-colors',
].join(' ');

function PlanBadge({ cycle }: { cycle?: string }) {
  if (!cycle) return null;
  const cls: Record<string, string> = {
    MONTHLY:     'bg-info-subtle    text-info-fg',
    QUARTERLY:   'bg-brand-primary/10 text-brand-primary',
    HALF_YEARLY: 'bg-warning-subtle text-warning-fg',
    YEARLY:      'bg-success-subtle text-success-fg',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-caption font-medium ${cls[cycle] ?? 'bg-bg-surface-3 text-text-secondary'}`}>
      {cycle.replace('_', ' ')}
    </span>
  );
}

function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div className="mb-4 p-3 bg-danger-subtle border border-danger-DEFAULT/30 text-danger-fg rounded-lg text-caption">
      {(error as Error).message}
    </div>
  );
}

function ModalActions({ onCancel, submitLabel, isPending, disabled }: {
  onCancel: () => void;
  submitLabel: string;
  isPending: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-3 pt-4 border-t border-border-subtle mt-4">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 py-2 border border-border-default rounded-full text-label text-text-secondary hover:bg-bg-surface-2 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isPending || disabled}
        className="flex-1 py-2 bg-brand-primary text-text-inverse rounded-full text-label font-medium hover:bg-brand-primary-hover disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}

// ─── Token copy box ───────────────────────────────────────────────────────────

function CopyBox({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div>
      {label && <p className="text-caption text-text-muted mb-1">{label}</p>}
      <div className="flex items-center gap-2 bg-bg-surface-2 border border-border-subtle rounded-lg px-3 py-2">
        <span className="text-caption text-text-primary break-all flex-1 font-mono">{value}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-caption text-brand-primary hover:text-brand-primary-hover font-medium flex-shrink-0 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// ─── ChargePlanModal ──────────────────────────────────────────────────────────

function ChargePlanModal({ temple, plans, onClose }: {
  temple: TempleSummary;
  plans: MembershipPlan[];
  onClose: () => void;
}) {
  const [planId, setPlanId] = useState(temple.planId ?? '');
  const [billingCycle, setBillingCycle] = useState(temple.planBillingCycle ?? 'MONTHLY');
  const [result, setResult] = useState<{ paymentLinkUrl: string; amount: number; planName: string } | null>(null);
  const { mutate, isPending, error } = useChargePlan();

  const activePlans = plans.filter((p) => p.isActive);
  const selectedPlan = activePlans.find((p) => p.id === planId);

  if (result) {
    return (
      <ModalShell title="Payment Link Created" onClose={onClose}>
        <p className="text-body text-text-secondary mb-3">
          Plan: <strong className="text-text-primary">{result.planName}</strong> — {formatCurrency(result.amount)}
        </p>
        <CopyBox value={result.paymentLinkUrl} label="Share this link with the temple admin:" />
        <p className="text-caption text-text-muted mt-2 mb-5">Link expires after payment is complete.</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-brand-primary text-text-inverse rounded-full text-label font-medium hover:bg-brand-primary-hover transition-colors"
        >
          Done
        </button>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Charge Temple" subtitle={temple.name} onClose={onClose}>
      <ErrorBanner error={error} />
      <form onSubmit={(e) => { e.preventDefault(); if (!planId) return; mutate({ id: temple.id, dto: { planId, billingCycle } as ChargePlanDto }, { onSuccess: (d) => setResult(d) }); }} className="space-y-4">
        <div>
          <label className={labelCls}>Plan</label>
          <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={inputCls} required>
            <option value="">Select plan…</option>
            {activePlans.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Billing Cycle</label>
          <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)} className={inputCls}>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="HALF_YEARLY">Half-Yearly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>
        {selectedPlan && (
          <p className="text-caption text-text-muted">
            Amount: <strong className="text-text-primary">{formatCurrency(selectedPlan.price)}</strong> ({billingCycle.replace('_', ' ').toLowerCase()})
          </p>
        )}
        <ModalActions onCancel={onClose} submitLabel="Create Payment Link" isPending={isPending} disabled={!planId} />
      </form>
    </ModalShell>
  );
}

// ─── ExtendPlanModal ──────────────────────────────────────────────────────────

function ExtendPlanModal({ temple, onClose }: { temple: TempleSummary; onClose: () => void }) {
  const [months, setMonths] = useState(1);
  const [reason, setReason] = useState('');
  const { mutate, isPending, error } = useExtendPlan();

  return (
    <ModalShell title="Extend Plan" subtitle={temple.name} onClose={onClose}>
      {temple.planValidUntil && (
        <p className="text-body text-text-secondary mb-4">
          Current expiry: <strong className="text-text-primary">{formatDate(temple.planValidUntil)}</strong>
        </p>
      )}
      <ErrorBanner error={error} />
      <form onSubmit={(e) => { e.preventDefault(); mutate({ id: temple.id, dto: { months, reason } as ExtendPlanDto }, { onSuccess: onClose }); }} className="space-y-4">
        <div>
          <label className={labelCls}>Extend by (months)</label>
          <input type="number" min={1} max={24} value={months} onChange={(e) => setMonths(parseInt(e.target.value, 10))} className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Reason</label>
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Trial extension, payment pending…" className={inputCls} required />
        </div>
        <ModalActions onCancel={onClose} submitLabel={`Extend ${months}m`} isPending={isPending} disabled={!reason.trim()} />
      </form>
    </ModalShell>
  );
}

// ─── PlanFormModal ────────────────────────────────────────────────────────────

function PlanFormModal({ plan, onClose }: { plan?: MembershipPlan; onClose: () => void }) {
  const [name, setName]               = useState(plan?.name ?? '');
  const [billingCycle, setBillingCycle] = useState(plan?.billingCycle ?? 'MONTHLY');
  const [price, setPrice]             = useState(plan ? parseFloat(plan.price).toString() : '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [featuresRaw, setFeaturesRaw] = useState(plan ? plan.features.join('\n') : '');
  const [sortOrder, setSortOrder]     = useState(plan?.sortOrder ?? 0);

  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const isPending  = createPlan.isPending || updatePlan.isPending;
  const error      = createPlan.error ?? updatePlan.error;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const features = featuresRaw.split('\n').map((f) => f.trim()).filter(Boolean);
    const dto: CreatePlanDto = { name, billingCycle, price: parseFloat(price), description: description || undefined, features, sortOrder };
    if (plan) {
      updatePlan.mutate({ id: plan.id, dto }, { onSuccess: onClose });
    } else {
      createPlan.mutate(dto, { onSuccess: onClose });
    }
  }

  return (
    <ModalShell title={plan ? 'Edit Plan' : 'New Plan'} onClose={onClose}>
      <ErrorBanner error={error} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Billing Cycle</label>
            <select value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)} className={inputCls}>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="HALF_YEARLY">Half-Yearly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Price (₹)</label>
            <input type="number" min={0} step={0.01} value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} required />
          </div>
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>
            Features <span className="text-text-muted font-normal">(one per line)</span>
          </label>
          <textarea
            value={featuresRaw}
            onChange={(e) => setFeaturesRaw(e.target.value)}
            rows={4}
            placeholder={"Up to 500 devotees\nDonation receipts\nSeva booking"}
            className={`${inputCls} resize-none`}
          />
        </div>
        <div>
          <label className={labelCls}>Sort Order</label>
          <input type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10))} className={inputCls} />
        </div>
        <ModalActions onCancel={onClose} submitLabel={plan ? 'Save Changes' : 'Create Plan'} isPending={isPending} />
      </form>
    </ModalShell>
  );
}

// ─── InviteAdminModal ─────────────────────────────────────────────────────────

function InviteAdminModal({ temple, onClose }: { temple: TempleSummary; onClose: () => void }) {
  const [phone, setPhone]       = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [result, setResult]     = useState<InvitedUser | null>(null);
  const { mutate, isPending, error } = useInviteTempleAdmin();

  if (result) {
    return (
      <ModalShell title="Admin Invited" onClose={onClose}>
        <p className="text-body text-text-secondary mb-4">
          <strong className="text-text-primary">{result.fullName}</strong> ({result.phone}) has been added as ADMIN for{' '}
          <strong className="text-text-primary">{temple.name}</strong>.
        </p>
        {result.inviteToken && (
          <CopyBox value={result.inviteToken} label="One-time invite token (share securely):" />
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full py-2 bg-brand-primary text-text-inverse rounded-full text-label font-medium hover:bg-brand-primary-hover transition-colors"
        >
          Done
        </button>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Invite Temple Admin" subtitle={temple.name} onClose={onClose}>
      <ErrorBanner error={error} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const dto: InviteTempleAdminDto = { phone: phone.replace(/\D/g, ''), fullName, email: email || undefined };
          mutate({ id: temple.id, dto }, { onSuccess: (data) => setResult(data) });
        }}
        className="space-y-4"
      >
        <div>
          <label className={labelCls}>Full Name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Ramesh Kumar" className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Mobile Number</label>
          <input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="98765 43210" className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Email <span className="text-text-muted font-normal">(optional)</span></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@temple.org" className={inputCls} />
        </div>
        <ModalActions onCancel={onClose} submitLabel="Invite Admin" isPending={isPending} disabled={!fullName.trim() || phone.length !== 10} />
      </form>
    </ModalShell>
  );
}

// ─── Temples Tab ──────────────────────────────────────────────────────────────

function TemplesTab({ plans }: { plans: MembershipPlan[] }) {
  const { data: temples, isLoading, error } = useSuperAdminTemples();
  const suspendTemple  = useSuspendTemple();
  const activateTemple = useActivateTemple();
  const [chargeTarget, setChargeTarget]           = useState<TempleSummary | null>(null);
  const [extendTarget, setExtendTarget]           = useState<TempleSummary | null>(null);
  const [inviteAdminTarget, setInviteAdminTarget] = useState<TempleSummary | null>(null);

  if (isLoading) return <div className="py-12 text-center text-text-muted text-body">Loading temples…</div>;
  if (error)     return <div className="py-12 text-center text-danger-DEFAULT text-body">{(error as Error).message}</div>;

  return (
    <>
      {inviteAdminTarget && <InviteAdminModal temple={inviteAdminTarget} onClose={() => setInviteAdminTarget(null)} />}
      {chargeTarget      && <ChargePlanModal  temple={chargeTarget}      plans={plans} onClose={() => setChargeTarget(null)} />}
      {extendTarget      && <ExtendPlanModal  temple={extendTarget}      onClose={() => setExtendTarget(null)} />}

      {/* ── Desktop table ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-surface-2">
              {['Temple', 'Plan / Billing', 'Valid Until', 'Donations', 'Devotees', 'Status', 'Actions'].map((h) => (
                <th key={h} className="py-3 px-4 text-left text-caption text-text-muted font-medium uppercase tracking-wide first:text-left last:text-right">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {temples?.map((temple) => (
              <tr key={temple.id} className="border-b border-border-subtle hover:bg-bg-surface-2 transition-colors">
                <td className="py-3 px-4">
                  <p className="text-label font-medium text-text-primary">{temple.name}</p>
                  <p className="text-caption text-text-muted">{temple.slug}{temple.city ? ` · ${temple.city}` : ''}</p>
                </td>
                <td className="py-3 px-4">
                  <p className="text-body text-text-secondary">{temple.plan}</p>
                  {temple.planBillingCycle && <PlanBadge cycle={temple.planBillingCycle} />}
                </td>
                <td className="py-3 px-4 text-body text-text-secondary">{formatDate(temple.planValidUntil)}</td>
                <td className="py-3 px-4 text-right text-body text-text-secondary">{temple.donationCount.toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-body text-text-secondary">{temple.devoteeCount.toLocaleString()}</td>
                <td className="py-3 px-4">
                  {temple.isActive ? (
                    <span className="badge badge-success">Active</span>
                  ) : (
                    <span className="badge badge-danger" title={temple.suspensionReason}>Suspended</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1 flex-wrap">
                    <ActionBtn color="brand" onClick={() => setInviteAdminTarget(temple)}>Invite Admin</ActionBtn>
                    <ActionBtn color="warning" onClick={() => setChargeTarget(temple)}>Charge</ActionBtn>
                    <ActionBtn color="info" onClick={() => setExtendTarget(temple)}>Extend</ActionBtn>
                    {temple.isActive ? (
                      <ActionBtn color="danger" onClick={() => {
                        const reason = prompt('Suspension reason (optional):') ?? undefined;
                        suspendTemple.mutate({ id: temple.id, reason });
                      }}>Suspend</ActionBtn>
                    ) : (
                      <ActionBtn color="success" onClick={() => activateTemple.mutate(temple.id)}>Activate</ActionBtn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {temples?.length === 0 && (
          <p className="py-12 text-center text-text-muted text-body">No temples found.</p>
        )}
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-3">
        {temples?.map((temple) => (
          <div key={temple.id} className="rounded-lg bg-bg-surface border border-border-subtle p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-label font-medium text-text-primary">{temple.name}</p>
                <p className="text-caption text-text-muted">{temple.slug}{temple.city ? ` · ${temple.city}` : ''}</p>
              </div>
              {temple.isActive
                ? <span className="badge badge-success flex-shrink-0">Active</span>
                : <span className="badge badge-danger flex-shrink-0">Suspended</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="badge badge-default">{temple.plan}</span>
              {temple.planBillingCycle && <PlanBadge cycle={temple.planBillingCycle} />}
              {temple.planValidUntil && (
                <span className="badge badge-default">Until {formatDate(temple.planValidUntil)}</span>
              )}
            </div>
            <div className="flex gap-3 text-caption text-text-muted mb-3">
              <span>{temple.donationCount.toLocaleString()} donations</span>
              <span>·</span>
              <span>{temple.devoteeCount.toLocaleString()} devotees</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <ActionBtn color="brand" onClick={() => setInviteAdminTarget(temple)}>Invite Admin</ActionBtn>
              <ActionBtn color="warning" onClick={() => setChargeTarget(temple)}>Charge</ActionBtn>
              <ActionBtn color="info" onClick={() => setExtendTarget(temple)}>Extend</ActionBtn>
              {temple.isActive ? (
                <ActionBtn color="danger" onClick={() => {
                  const reason = prompt('Suspension reason (optional):') ?? undefined;
                  suspendTemple.mutate({ id: temple.id, reason });
                }}>Suspend</ActionBtn>
              ) : (
                <ActionBtn color="success" onClick={() => activateTemple.mutate(temple.id)}>Activate</ActionBtn>
              )}
            </div>
          </div>
        ))}
        {temples?.length === 0 && (
          <p className="py-12 text-center text-text-muted text-body">No temples found.</p>
        )}
      </div>
    </>
  );
}

// Tiny inline action button
function ActionBtn({ color, onClick, children }: {
  color: 'brand' | 'warning' | 'info' | 'danger' | 'success';
  onClick: () => void;
  children: React.ReactNode;
}) {
  const cls: Record<string, string> = {
    brand:   'text-brand-primary   hover:bg-brand-primary/10',
    warning: 'text-warning-DEFAULT hover:bg-warning-subtle',
    info:    'text-info-DEFAULT    hover:bg-info-subtle',
    danger:  'text-danger-DEFAULT  hover:bg-danger-subtle',
    success: 'text-success-DEFAULT hover:bg-success-subtle',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-caption font-medium rounded transition-colors ${cls[color]}`}
    >
      {children}
    </button>
  );
}

// ─── Plans Tab ────────────────────────────────────────────────────────────────

function PlansTab() {
  const { data: plans, isLoading, error } = useMembershipPlans();
  const deactivatePlan = useDeactivatePlan();
  const [planForm, setPlanForm] = useState<{ open: boolean; plan?: MembershipPlan }>({ open: false });

  if (isLoading) return <div className="py-12 text-center text-text-muted text-body">Loading plans…</div>;
  if (error)     return <div className="py-12 text-center text-danger-DEFAULT text-body">{(error as Error).message}</div>;

  return (
    <>
      {planForm.open && <PlanFormModal plan={planForm.plan} onClose={() => setPlanForm({ open: false })} />}

      <div className="flex items-center justify-between mb-4">
        <p className="text-caption text-text-muted">{plans?.length ?? 0} plans</p>
        <button
          type="button"
          onClick={() => setPlanForm({ open: true })}
          className="px-4 py-2 bg-brand-primary text-text-inverse rounded-full text-label font-medium hover:bg-brand-primary-hover transition-colors"
        >
          + New Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans?.map((plan) => (
          <div
            key={plan.id}
            className={`border rounded-xl p-4 ${
              plan.isActive
                ? 'border-border-default bg-bg-surface'
                : 'border-border-subtle bg-bg-surface-2 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-label font-semibold text-text-primary">{plan.name}</h3>
                {plan.description && (
                  <p className="text-caption text-text-muted mt-0.5">{plan.description}</p>
                )}
              </div>
              <PlanBadge cycle={plan.billingCycle} />
            </div>

            <p className="text-h2 font-bold text-brand-primary mb-3">
              {formatCurrency(plan.price)}
            </p>

            {plan.features.length > 0 && (
              <ul className="space-y-1 mb-4">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-caption text-text-secondary flex items-start gap-1.5">
                    <span className="text-success-DEFAULT mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => setPlanForm({ open: true, plan })}
                className="flex-1 py-1.5 border border-border-default rounded-full text-caption text-text-secondary hover:bg-bg-surface-2 transition-colors"
              >
                Edit
              </button>
              {plan.isActive && (
                <button
                  type="button"
                  onClick={() => { if (confirm(`Deactivate plan "${plan.name}"?`)) deactivatePlan.mutate(plan.id); }}
                  className="flex-1 py-1.5 border border-danger-DEFAULT/30 text-danger-DEFAULT rounded-full text-caption hover:bg-danger-subtle transition-colors"
                >
                  Deactivate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {plans?.length === 0 && (
        <p className="py-12 text-center text-text-muted text-body">No plans yet. Create one above.</p>
      )}
    </>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab() {
  const { data: stats, isLoading, error } = useSuperAdminStats();

  if (isLoading) return <div className="py-12 text-center text-text-muted text-body">Loading stats…</div>;
  if (error)     return <div className="py-12 text-center text-danger-DEFAULT text-body">{(error as Error).message}</div>;

  const cards = [
    { label: 'Total Temples',  value: stats?.totalTemples.toLocaleString()  ?? '—' },
    { label: 'Active Temples', value: stats?.activeTemples.toLocaleString() ?? '—' },
    { label: 'Total Devotees', value: stats?.totalDevotees.toLocaleString() ?? '—' },
    { label: 'Total Donations',value: stats?.totalDonations.toLocaleString() ?? '—' },
    { label: 'Total Revenue',  value: stats ? formatCurrency(stats.totalRevenue) : '—' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-bg-surface border border-border-subtle rounded-xl p-5">
          <p className="text-caption text-text-muted mb-1">{card.label}</p>
          <p className="text-h2 font-bold text-text-primary">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = ['Temples', 'Plans', 'Stats'] as const;
type Tab = (typeof TABS)[number];

export function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Temples');
  const { data: plans } = useMembershipPlans();

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <div>
        <h1 className="text-h1 font-bold text-text-primary">Super Admin</h1>
        <p className="text-body text-text-muted mt-1">Platform-wide administration — billing, plans, and temple management</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border-subtle">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2.5 text-label font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-text-muted hover:text-text-primary',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'Temples' && <TemplesTab plans={plans ?? []} />}
        {activeTab === 'Plans'   && <PlansTab />}
        {activeTab === 'Stats'   && <StatsTab />}
      </div>
    </div>
  );
}
