import { useState } from 'react';
import type { PublicCategory, PublicTemple, InitiateResult, PublicDonatePayload } from '@/api/public.api';
import { initiateDonation } from '@/api/public.api';

interface Props {
  temple: PublicTemple;
  categories: PublicCategory[];
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

const inputClass =
  'w-full px-4 py-3 rounded-lg border border-border-default bg-bg-surface-2 text-text-primary ' +
  'placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 ' +
  'focus:border-brand-primary transition-all';

const labelClass = 'block text-sm font-medium text-text-secondary mb-1.5';

export function PublicDonateTab({ temple, categories }: Props) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [pan, setPan] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const quickAmounts = [101, 501, 1001, 2100, 5100, 11000];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);
    if (!donorName.trim()) { setError('Donor name is required'); return; }
    if (!amountNum || amountNum < 1) { setError('Enter a valid amount (min ₹1)'); return; }
    if (!categoryId) { setError('Select a donation category'); return; }

    const payload: PublicDonatePayload = {
      categoryId,
      donorName: donorName.trim(),
      amount: amountNum,
    };
    if (donorPhone.trim()) payload.donorPhone = donorPhone.trim();
    if (pan.trim()) payload.pan = pan.trim().toUpperCase();

    try {
      setLoading(true);
      await loadRazorpayScript();
      const result: InitiateResult = await initiateDonation(temple.slug, payload);

      const options = {
        key: result.razorpayKeyId,
        amount: result.amountPaise,
        currency: 'INR',
        name: temple.name,
        description: categories.find((c) => c.id === categoryId)?.name ?? 'Donation',
        order_id: result.razorpayOrderId,
        prefill: {
          name: donorName,
          contact: donorPhone || undefined,
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

  if (success) {
    return (
      <div className="max-w-lg mx-auto bg-bg-surface rounded-2xl shadow-modal border border-border-subtle p-6 md:p-8">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-full bg-success-subtle flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-success-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Thank you, {donorName}!</h2>
          <p className="text-text-secondary text-sm mb-6">Your donation has been received. A receipt will be sent to your WhatsApp shortly.</p>
          <button
            onClick={() => { setSuccess(false); setAmount(''); setDonorName(''); setDonorPhone(''); setPan(''); }}
            className="w-full py-4 rounded-xl bg-brand-primary text-white font-bold text-base hover:bg-brand-primary-hover active:scale-[0.98] transition-all"
          >
            Make Another Donation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-bg-surface rounded-2xl shadow-modal border border-border-subtle p-6 md:p-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category */}
        <div>
          <label className={labelClass}>Donation Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.is80gEligible ? ' (80G eligible)' : ''}</option>
            ))}
          </select>
        </div>

        {/* Quick amount buttons */}
        <div>
          <label className={labelClass}>Amount (₹)</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {quickAmounts.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q))}
                className={
                  amount === String(q)
                    ? 'px-4 py-2 rounded-full border-2 border-brand-primary bg-brand-primary/10 text-brand-primary text-sm font-semibold'
                    : 'px-4 py-2 rounded-full border border-border-default text-text-secondary text-sm font-medium hover:border-brand-primary hover:text-brand-primary transition-all cursor-pointer'
                }
              >
                ₹{q.toLocaleString('en-IN')}
              </button>
            ))}
          </div>
          <input
            type="number"
            min="1"
            step="0.01"
            placeholder="Or enter custom amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
            required
          />
        </div>

        {/* Donor name */}
        <div>
          <label className={labelClass}>Your Name</label>
          <input
            type="text"
            placeholder="Full name"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            maxLength={200}
            className={inputClass}
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label className={labelClass}>
            WhatsApp Number <span className="text-text-muted font-normal">(for receipt)</span>
          </label>
          <input
            type="tel"
            placeholder="10-digit mobile number"
            value={donorPhone}
            onChange={(e) => setDonorPhone(e.target.value)}
            maxLength={10}
            className={inputClass}
          />
        </div>

        {/* PAN */}
        <div>
          <label className={labelClass}>
            PAN Number <span className="text-text-muted font-normal">(optional, for 80G)</span>
          </label>
          <input
            type="text"
            placeholder="ABCDE1234F"
            value={pan}
            onChange={(e) => setPan(e.target.value.toUpperCase())}
            maxLength={10}
            className={`${inputClass} uppercase`}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-danger-subtle border border-danger/20 text-danger-fg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl bg-brand-primary text-white font-bold text-base hover:bg-brand-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? 'Processing…' : `Donate ₹${amount || '—'}`}
        </button>
      </form>
    </div>
  );
}
