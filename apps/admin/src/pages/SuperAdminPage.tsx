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
  return '₹' + parseFloat(String(value)).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function PlanBadge({ cycle }: { cycle?: string }) {
  if (!cycle) return null;
  const colors: Record<string, string> = {
    MONTHLY: 'bg-blue-100 text-blue-800',
    QUARTERLY: 'bg-purple-100 text-purple-800',
    HALF_YEARLY: 'bg-orange-100 text-orange-800',
    YEARLY: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[cycle] ?? 'bg-gray-100 text-gray-700'}`}>
      {cycle.replace('_', ' ')}
    </span>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

interface ChargePlanModalProps {
  temple: TempleSummary;
  plans: MembershipPlan[];
  onClose: () => void;
}

function ChargePlanModal({ temple, plans, onClose }: ChargePlanModalProps) {
  const [planId, setPlanId] = useState(temple.planId ?? '');
  const [billingCycle, setBillingCycle] = useState(temple.planBillingCycle ?? 'MONTHLY');
  const [result, setResult] = useState<{ paymentLinkUrl: string; amount: number; planName: string } | null>(null);
  const { mutate, isPending, error } = useChargePlan();

  const activePlans = plans.filter((p) => p.isActive);
  const selectedPlan = activePlans.find((p) => p.id === planId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!planId) return;
    const dto: ChargePlanDto = { planId, billingCycle };
    mutate(
      { id: temple.id, dto },
      {
        onSuccess: (data) => setResult(data),
      },
    );
  }

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Link Created</h2>
          <p className="text-sm text-gray-600 mb-2">
            Plan: <strong>{result.planName}</strong> — {formatCurrency(result.amount)}
          </p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
            <span className="text-xs text-gray-700 break-all flex-1">{result.paymentLinkUrl}</span>
            <button
              onClick={() => void navigator.clipboard.writeText(result.paymentLinkUrl)}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium shrink-0"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-6">Share this link with the temple admin to complete payment.</p>
          <button onClick={onClose} className="w-full py-2 bg-orange-500 text-white rounded-full font-medium text-sm hover:bg-orange-600 transition-colors">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Charge Temple</h2>
        <p className="text-sm text-gray-500 mb-5">{temple.name}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {(error as Error).message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="">Select plan…</option>
              {activePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatCurrency(p.price)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
            <select
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="HALF_YEARLY">Half-Yearly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          {selectedPlan && (
            <p className="text-xs text-gray-500">
              Amount: <strong>{formatCurrency(selectedPlan.price)}</strong> ({billingCycle.replace('_', ' ').toLowerCase()})
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !planId}
              className="flex-1 py-2 bg-orange-500 text-white rounded-full text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Creating…' : 'Create Payment Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ExtendPlanModalProps {
  temple: TempleSummary;
  onClose: () => void;
}

function ExtendPlanModal({ temple, onClose }: ExtendPlanModalProps) {
  const [months, setMonths] = useState(1);
  const [reason, setReason] = useState('');
  const { mutate, isPending, error } = useExtendPlan();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dto: ExtendPlanDto = { months, reason };
    mutate({ id: temple.id, dto }, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Extend Plan</h2>
        <p className="text-sm text-gray-500 mb-5">{temple.name}</p>

        {temple.planValidUntil && (
          <p className="text-sm text-gray-600 mb-4">
            Current expiry: <strong>{formatDate(temple.planValidUntil)}</strong>
          </p>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {(error as Error).message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Extend by (months)</label>
            <input
              type="number"
              min={1}
              max={24}
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value, 10))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Trial extension, payment pending…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !reason.trim()}
              className="flex-1 py-2 bg-orange-500 text-white rounded-full text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Extending…' : `Extend ${months}m`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Plan Form Modal ──────────────────────────────────────────────────────────

interface PlanFormModalProps {
  plan?: MembershipPlan;
  onClose: () => void;
}

function PlanFormModal({ plan, onClose }: PlanFormModalProps) {
  const [name, setName] = useState(plan?.name ?? '');
  const [billingCycle, setBillingCycle] = useState(plan?.billingCycle ?? 'MONTHLY');
  const [price, setPrice] = useState(plan ? parseFloat(plan.price).toString() : '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [featuresRaw, setFeaturesRaw] = useState(plan ? plan.features.join('\n') : '');
  const [sortOrder, setSortOrder] = useState(plan?.sortOrder ?? 0);

  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const isPending = createPlan.isPending || updatePlan.isPending;
  const error = createPlan.error ?? updatePlan.error;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const features = featuresRaw.split('\n').map((f) => f.trim()).filter(Boolean);
    const dto: CreatePlanDto = {
      name,
      billingCycle,
      price: parseFloat(price),
      description: description || undefined,
      features,
      sortOrder,
    };

    if (plan) {
      updatePlan.mutate({ id: plan.id, dto }, { onSuccess: onClose });
    } else {
      createPlan.mutate(dto, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">
          {plan ? 'Edit Plan' : 'New Plan'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {(error as Error).message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
              <select
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="HALF_YEARLY">Half-Yearly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Features <span className="text-gray-400 font-normal">(one per line)</span>
            </label>
            <textarea
              value={featuresRaw}
              onChange={(e) => setFeaturesRaw(e.target.value)}
              rows={4}
              placeholder="Up to 500 devotees&#10;Donation receipts&#10;Seva booking"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
            <input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2 bg-orange-500 text-white rounded-full text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Saving…' : plan ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Invite Admin Modal ───────────────────────────────────────────────────────

interface InviteAdminModalProps {
  temple: TempleSummary;
  onClose: () => void;
}

function InviteAdminModal({ temple, onClose }: InviteAdminModalProps) {
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<InvitedUser | null>(null);
  const { mutate, isPending, error } = useInviteTempleAdmin();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dto: InviteTempleAdminDto = {
      phone: phone.replace(/\D/g, ''),
      fullName,
      email: email || undefined,
    };
    mutate({ id: temple.id, dto }, { onSuccess: (data) => setResult(data) });
  }

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Invited</h2>
          <p className="text-sm text-gray-600 mb-1">
            <strong>{result.fullName}</strong> ({result.phone}) has been added as ADMIN for{' '}
            <strong>{temple.name}</strong>.
          </p>
          {result.inviteToken && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-1">One-time invite token (share securely):</p>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <span className="text-xs text-gray-700 break-all flex-1">{result.inviteToken}</span>
                <button
                  onClick={() => void navigator.clipboard.writeText(result.inviteToken!)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            className="mt-6 w-full py-2 bg-orange-500 text-white rounded-full font-medium text-sm hover:bg-orange-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Invite Temple Admin</h2>
        <p className="text-sm text-gray-500 mb-5">{temple.name}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {(error as Error).message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="98765 43210"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@temple.org"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !fullName.trim() || phone.length !== 10}
              className="flex-1 py-2 bg-orange-500 text-white rounded-full text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Inviting…' : 'Invite Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Temples Tab ──────────────────────────────────────────────────────────────

interface TemplesTabProps {
  plans: MembershipPlan[];
}

function TemplesTab({ plans }: TemplesTabProps) {
  const { data: temples, isLoading, error } = useSuperAdminTemples();
  const suspendTemple = useSuspendTemple();
  const activateTemple = useActivateTemple();
  const [chargeTarget, setChargeTarget] = useState<TempleSummary | null>(null);
  const [extendTarget, setExtendTarget] = useState<TempleSummary | null>(null);
  const [inviteAdminTarget, setInviteAdminTarget] = useState<TempleSummary | null>(null);

  if (isLoading) {
    return <div className="py-12 text-center text-gray-400 text-sm">Loading temples…</div>;
  }
  if (error) {
    return (
      <div className="py-12 text-center text-red-600 text-sm">{(error as Error).message}</div>
    );
  }

  return (
    <>
      {inviteAdminTarget && (
        <InviteAdminModal temple={inviteAdminTarget} onClose={() => setInviteAdminTarget(null)} />
      )}
      {chargeTarget && (
        <ChargePlanModal
          temple={chargeTarget}
          plans={plans}
          onClose={() => setChargeTarget(null)}
        />
      )}
      {extendTarget && (
        <ExtendPlanModal temple={extendTarget} onClose={() => setExtendTarget(null)} />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Temple</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Plan / Billing</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Valid Until</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Donations</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Devotees</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
              <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {temples?.map((temple) => (
              <tr key={temple.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900">{temple.name}</div>
                  <div className="text-xs text-gray-400">{temple.slug}{temple.city ? ` · ${temple.city}` : ''}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-gray-700">{temple.plan}</div>
                  {temple.planBillingCycle && (
                    <PlanBadge cycle={temple.planBillingCycle} />
                  )}
                </td>
                <td className="py-3 px-4 text-gray-600">{formatDate(temple.planValidUntil)}</td>
                <td className="py-3 px-4 text-right text-gray-700">{temple.donationCount.toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-gray-700">{temple.devoteeCount.toLocaleString()}</td>
                <td className="py-3 px-4">
                  {temple.isActive ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Active</span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800" title={temple.suspensionReason}>
                      Suspended
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setInviteAdminTarget(temple)}
                      className="px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded font-medium transition-colors"
                    >
                      Invite Admin
                    </button>
                    <button
                      onClick={() => setChargeTarget(temple)}
                      className="px-2 py-1 text-xs text-orange-600 hover:bg-orange-50 rounded font-medium transition-colors"
                    >
                      Charge
                    </button>
                    <button
                      onClick={() => setExtendTarget(temple)}
                      className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded font-medium transition-colors"
                    >
                      Extend
                    </button>
                    {temple.isActive ? (
                      <button
                        onClick={() => {
                          const reason = prompt('Suspension reason (optional):') ?? undefined;
                          suspendTemple.mutate({ id: temple.id, reason });
                        }}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded font-medium transition-colors"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => activateTemple.mutate(temple.id)}
                        className="px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded font-medium transition-colors"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {temples?.length === 0 && (
          <p className="py-12 text-center text-gray-400 text-sm">No temples found.</p>
        )}
      </div>
    </>
  );
}

// ─── Plans Tab ────────────────────────────────────────────────────────────────

function PlansTab() {
  const { data: plans, isLoading, error } = useMembershipPlans();
  const deactivatePlan = useDeactivatePlan();
  const [planForm, setPlanForm] = useState<{ open: boolean; plan?: MembershipPlan }>({ open: false });

  if (isLoading) {
    return <div className="py-12 text-center text-gray-400 text-sm">Loading plans…</div>;
  }
  if (error) {
    return <div className="py-12 text-center text-red-600 text-sm">{(error as Error).message}</div>;
  }

  return (
    <>
      {planForm.open && (
        <PlanFormModal
          plan={planForm.plan}
          onClose={() => setPlanForm({ open: false })}
        />
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{plans?.length ?? 0} plans</p>
        <button
          onClick={() => setPlanForm({ open: true })}
          className="px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          + New Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans?.map((plan) => (
          <div
            key={plan.id}
            className={`border rounded-xl p-4 ${plan.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
              </div>
              <PlanBadge cycle={plan.billingCycle} />
            </div>

            <p className="text-2xl font-bold text-orange-600 mb-3">
              {formatCurrency(plan.price)}
            </p>

            {plan.features.length > 0 && (
              <ul className="space-y-1 mb-4">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setPlanForm({ open: true, plan })}
                className="flex-1 py-1.5 border border-gray-300 rounded-full text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Edit
              </button>
              {plan.isActive && (
                <button
                  onClick={() => {
                    if (confirm(`Deactivate plan "${plan.name}"?`)) {
                      deactivatePlan.mutate(plan.id);
                    }
                  }}
                  className="flex-1 py-1.5 border border-red-200 text-red-600 rounded-full text-xs hover:bg-red-50 transition-colors"
                >
                  Deactivate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {plans?.length === 0 && (
        <p className="py-12 text-center text-gray-400 text-sm">No plans yet. Create one above.</p>
      )}
    </>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab() {
  const { data: stats, isLoading, error } = useSuperAdminStats();

  if (isLoading) {
    return <div className="py-12 text-center text-gray-400 text-sm">Loading stats…</div>;
  }
  if (error) {
    return <div className="py-12 text-center text-red-600 text-sm">{(error as Error).message}</div>;
  }

  const cards = [
    { label: 'Total Temples', value: stats?.totalTemples.toLocaleString() ?? '—' },
    { label: 'Active Temples', value: stats?.activeTemples.toLocaleString() ?? '—' },
    { label: 'Total Devotees', value: stats?.totalDevotees.toLocaleString() ?? '—' },
    { label: 'Total Donations', value: stats?.totalDonations.toLocaleString() ?? '—' },
    { label: 'Total Revenue', value: stats ? formatCurrency(stats.totalRevenue) : '—' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 mb-1">{card.label}</p>
          <p className="text-2xl font-bold text-gray-900">{card.value}</p>
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
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Super Admin</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide administration — billing, plans, and temple management</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'Temples' && <TemplesTab plans={plans ?? []} />}
      {activeTab === 'Plans' && <PlansTab />}
      {activeTab === 'Stats' && <StatsTab />}
    </div>
  );
}
