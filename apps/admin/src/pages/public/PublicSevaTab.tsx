import { useState } from 'react';
import type { PublicSevaType, PublicTemple, InitiateResult, PublicSevaPayload, PricingTier } from '@/api/public.api';
import { initiateSeva } from '@/api/public.api';

interface Props {
  temple: PublicTemple;
  sevaTypes: PublicSevaType[];
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('razorpay-script')) { resolve(); return; }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout. Please refresh and try again.'));
    document.head.appendChild(script);
  });
}

/** Returns today's date in YYYY-MM-DD format using IST. */
function todayIST(): string {
  const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const yyyy = nowIST.getUTCFullYear();
  const mm = String(nowIST.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(nowIST.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const inputClass =
  'w-full px-4 py-3 rounded-lg border border-border-default bg-bg-surface-2 text-text-primary ' +
  'placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 ' +
  'focus:border-brand-primary transition-all';

const labelClass = 'block text-sm font-medium text-text-secondary mb-1.5';

export function PublicSevaTab({ temple, sevaTypes }: Props) {
  const firstSeva = sevaTypes[0];
  const [sevaTypeId, setSevaTypeId] = useState(firstSeva?.id ?? '');
  const [devoteeName, setDevoteeName] = useState('');
  const [devoteePhone, setDevoteePhone] = useState('');
  const [sevaDate, setSevaDate] = useState(todayIST());
  const [timeSlot, setTimeSlot] = useState(firstSeva?.availableTimeSlots[0]?.time ?? '');
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(firstSeva?.pricingTiers[0] ?? null);
  const [sankalpaName, setSankalpaName] = useState('');
  const [gotra, setGotra] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const currentSeva = sevaTypes.find((s) => s.id === sevaTypeId) ?? null;

  function onSevaTypeChange(id: string) {
    setSevaTypeId(id);
    const seva = sevaTypes.find((s) => s.id === id);
    if (seva) {
      setTimeSlot(seva.availableTimeSlots[0]?.time ?? '');
      setSelectedTier(seva.pricingTiers[0] ?? null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!devoteeName.trim()) { setError('Devotee name is required'); return; }
    if (!sevaDate) { setError('Select a seva date'); return; }
    if (!timeSlot) { setError('Select a time slot'); return; }
    if (!selectedTier) { setError('Select a pricing tier'); return; }

    const payload: PublicSevaPayload = {
      sevaTypeId,
      devoteeName: devoteeName.trim(),
      sevaDate,
      timeSlot,
      tierName: selectedTier.name,
      amount: selectedTier.price,
    };
    if (devoteePhone.trim()) payload.devoteePhone = devoteePhone.trim();
    if (sankalpaName.trim()) payload.sankalpaName = sankalpaName.trim();
    if (gotra.trim()) payload.gotra = gotra.trim();

    try {
      setLoading(true);
      await loadRazorpayScript();
      const result: InitiateResult = await initiateSeva(temple.slug, payload);

      const options = {
        key: result.razorpayKeyId,
        amount: result.amountPaise,
        currency: 'INR',
        name: temple.name,
        description: `${currentSeva?.name ?? 'Seva'} — ${selectedTier.name}`,
        order_id: result.razorpayOrderId,
        prefill: {
          name: devoteeName,
          contact: devoteePhone || undefined,
        },
        theme: { color: '#E8530A' },
        handler: () => {
          setSuccess(true);
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sevaTypes.length === 0) {
    return (
      <div className="max-w-lg mx-auto bg-bg-surface rounded-2xl shadow-modal border border-border-subtle p-6 md:p-8">
        <div className="text-center py-10 text-text-muted text-sm">
          No sevas are currently available for online booking.
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto bg-bg-surface rounded-2xl shadow-modal border border-border-subtle p-6 md:p-8">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-success-subtle flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-success-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Booking Confirmed!</h2>
          <p className="text-text-secondary text-sm mb-6">
            Your seva has been booked for {sevaDate}. A confirmation will be sent to your WhatsApp shortly.
          </p>
          <button
            onClick={() => { setSuccess(false); setDevoteeName(''); setDevoteePhone(''); setSankalpaName(''); setGotra(''); }}
            className="w-full py-4 rounded-xl bg-brand-primary text-white font-bold text-base hover:bg-brand-primary-hover active:scale-[0.98] transition-all"
          >
            Book Another Seva
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-bg-surface rounded-2xl shadow-modal border border-border-subtle p-6 md:p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Seva type */}
        <div>
          <label className={labelClass}>Seva Type</label>
          <select
            value={sevaTypeId}
            onChange={(e) => onSevaTypeChange(e.target.value)}
            className={inputClass}
            required
          >
            {sevaTypes.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.nameHi ? ` (${s.nameHi})` : ''}</option>
            ))}
          </select>
          {currentSeva?.description && (
            <p className="text-xs text-text-muted mt-1.5">{currentSeva.description}</p>
          )}
        </div>

        {/* Pricing tier */}
        {currentSeva && currentSeva.pricingTiers.length > 0 && (
          <div>
            <label className={labelClass}>Select Package</label>
            <div className="grid grid-cols-2 gap-2">
              {currentSeva.pricingTiers.map((tier) => (
                <button
                  key={tier.name}
                  type="button"
                  onClick={() => setSelectedTier(tier)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedTier?.name === tier.name
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                      : 'border-border-default text-text-primary hover:border-brand-primary/50 hover:bg-bg-surface-2'
                  }`}
                >
                  <div className="font-medium text-sm">{tier.name}</div>
                  <div className="text-brand-primary font-semibold text-sm">₹{tier.price.toLocaleString('en-IN')}</div>
                  {tier.description && <div className="text-xs text-text-muted mt-0.5">{tier.description}</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date */}
        <div>
          <label className={labelClass}>Seva Date</label>
          <input
            type="date"
            value={sevaDate}
            min={todayIST()}
            onChange={(e) => setSevaDate(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        {/* Time slot */}
        {currentSeva && currentSeva.availableTimeSlots.length > 0 && (
          <div>
            <label className={labelClass}>Time Slot</label>
            <div className="flex flex-wrap gap-2">
              {currentSeva.availableTimeSlots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => setTimeSlot(slot.time)}
                  className={
                    timeSlot === slot.time
                      ? 'px-4 py-2 rounded-full border-2 border-brand-primary bg-brand-primary/10 text-brand-primary text-sm font-semibold'
                      : 'px-4 py-2 rounded-full border border-border-default text-text-secondary text-sm font-medium hover:border-brand-primary hover:text-brand-primary transition-all cursor-pointer'
                  }
                >
                  {slot.label} ({slot.time})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Devotee name */}
        <div>
          <label className={labelClass}>Devotee Name</label>
          <input
            type="text"
            placeholder="Full name"
            value={devoteeName}
            onChange={(e) => setDevoteeName(e.target.value)}
            maxLength={200}
            className={inputClass}
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label className={labelClass}>
            WhatsApp Number <span className="text-text-muted font-normal">(for confirmation)</span>
          </label>
          <input
            type="tel"
            placeholder="10-digit mobile number"
            value={devoteePhone}
            onChange={(e) => setDevoteePhone(e.target.value)}
            maxLength={10}
            className={inputClass}
          />
        </div>

        {/* Sankalpa — only if required */}
        {currentSeva?.requiresSankalpa && (
          <>
            <div>
              <label className={labelClass}>Sankalpa Name</label>
              <input
                type="text"
                placeholder="Name for sankalpa"
                value={sankalpaName}
                onChange={(e) => setSankalpaName(e.target.value)}
                maxLength={200}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Gotra</label>
              <input
                type="text"
                placeholder="Gotra (optional)"
                value={gotra}
                onChange={(e) => setGotra(e.target.value)}
                maxLength={100}
                className={inputClass}
              />
            </div>
          </>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger-subtle border border-danger/20 text-danger-fg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedTier}
          className="w-full py-4 rounded-xl bg-brand-primary text-white font-bold text-base hover:bg-brand-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? 'Processing…' : `Book Seva — ₹${selectedTier?.price.toLocaleString('en-IN') ?? '—'}`}
        </button>
      </form>
    </div>
  );
}
