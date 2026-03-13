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
      <div className="text-center py-10 text-gray-500 text-sm">
        No sevas are currently available for online booking.
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-orange-900 mb-2">Booking Confirmed!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Your seva has been booked for {sevaDate}. A confirmation will be sent to your WhatsApp shortly.
        </p>
        <button
          onClick={() => { setSuccess(false); setDevoteeName(''); setDevoteePhone(''); setSankalpaName(''); setGotra(''); }}
          className="px-6 py-2 rounded-full bg-orange-500 text-white text-sm font-medium hover:bg-orange-700 transition-colors"
        >
          Book Another Seva
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Seva type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Seva Type</label>
        <select
          value={sevaTypeId}
          onChange={(e) => onSevaTypeChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          required
        >
          {sevaTypes.map((s) => (
            <option key={s.id} value={s.id}>{s.name}{s.nameHi ? ` (${s.nameHi})` : ''}</option>
          ))}
        </select>
        {currentSeva?.description && (
          <p className="text-xs text-gray-400 mt-1">{currentSeva.description}</p>
        )}
      </div>

      {/* Pricing tier */}
      {currentSeva && currentSeva.pricingTiers.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Package</label>
          <div className="grid grid-cols-2 gap-2">
            {currentSeva.pricingTiers.map((tier) => (
              <button
                key={tier.name}
                type="button"
                onClick={() => setSelectedTier(tier)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedTier?.name === tier.name
                    ? 'border-orange-500 bg-orange-50 text-orange-900'
                    : 'border-gray-200 text-gray-900 hover:border-orange-300'
                }`}
              >
                <div className="font-medium text-sm">{tier.name}</div>
                <div className="text-orange-500 font-semibold">₹{tier.price.toLocaleString('en-IN')}</div>
                {tier.description && <div className="text-xs text-gray-400 mt-0.5">{tier.description}</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Seva Date</label>
        <input
          type="date"
          value={sevaDate}
          min={todayIST()}
          onChange={(e) => setSevaDate(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          required
        />
      </div>

      {/* Time slot */}
      {currentSeva && currentSeva.availableTimeSlots.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Time Slot</label>
          <div className="flex flex-wrap gap-2">
            {currentSeva.availableTimeSlots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                onClick={() => setTimeSlot(slot.time)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  timeSlot === slot.time
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-600'
                }`}
              >
                {slot.label} ({slot.time})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Devotee name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Devotee Name</label>
        <input
          type="text"
          placeholder="Full name"
          value={devoteeName}
          onChange={(e) => setDevoteeName(e.target.value)}
          maxLength={200}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          required
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          WhatsApp Number <span className="text-gray-400 font-normal">(for confirmation)</span>
        </label>
        <input
          type="tel"
          placeholder="10-digit mobile number"
          value={devoteePhone}
          onChange={(e) => setDevoteePhone(e.target.value)}
          maxLength={10}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Sankalpa — only if required */}
      {currentSeva?.requiresSankalpa && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sankalpa Name</label>
            <input
              type="text"
              placeholder="Name for sankalpa"
              value={sankalpaName}
              onChange={(e) => setSankalpaName(e.target.value)}
              maxLength={200}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gotra</label>
            <input
              type="text"
              placeholder="Gotra (optional)"
              value={gotra}
              onChange={(e) => setGotra(e.target.value)}
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !selectedTier}
        className="w-full py-3 rounded-full bg-orange-500 text-white font-medium text-sm hover:bg-orange-700 transition-colors disabled:opacity-60"
      >
        {loading ? 'Processing…' : `Book Seva — ₹${selectedTier?.price.toLocaleString('en-IN') ?? '—'}`}
      </button>
    </form>
  );
}
