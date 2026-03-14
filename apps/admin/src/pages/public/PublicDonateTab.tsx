import { useState } from 'react';
import { LockKeyhole, FileCheck, MessageCircle, CheckCircle } from 'lucide-react';
import { fmtINR } from '@/lib/format';
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

const quickAmounts = [101, 501, 1001, 2100, 5100, 11000];

export function PublicDonateTab({ temple, categories }: Props) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [pan, setPan] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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
      setIsLoading(true);
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
          setIsSuccess(true);
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="max-w-lg mx-auto bg-bg-surface rounded-2xl shadow-modal border border-border-subtle p-8 md:p-10">
        <div className="flex flex-col items-center justify-center text-center">

          {/* Animated checkmark */}
          <div className="relative w-24 h-24 mb-6" aria-hidden="true">
            <div className="absolute inset-0 rounded-full bg-brand-primary/10 animate-pulse" />
            <div className="absolute inset-3 rounded-full bg-brand-primary-subtle flex items-center justify-center">
              <CheckCircle size={32} className="text-brand-primary" strokeWidth={1.75} />
            </div>
          </div>

          <h2 className="text-h2 font-bold text-text-primary mb-2">
            Thank you, {donorName}!
          </h2>
          <p className="text-text-secondary text-sm mb-8 max-w-xs leading-relaxed">
            Your donation has been received. An 80G receipt will be sent to your WhatsApp shortly.
          </p>

          <button
            onClick={() => {
              setIsSuccess(false);
              setAmount('');
              setDonorName('');
              setDonorPhone('');
              setPan('');
            }}
            className="w-full py-4 rounded-xl bg-brand-primary text-white font-bold text-base hover:bg-brand-primary-hover active:scale-[0.98] transition-all cursor-pointer"
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

        {/* ── Category ─────────────────────────────────────────────── */}
        <div>
          <label className={labelClass}>Donation Category</label>
          {categories.length <= 6 ? (
            /* Horizontal chip row for small sets */
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: 'none' }}
              role="group"
              aria-label="Donation categories"
            >
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={[
                    'flex-shrink-0 px-3.5 py-2 rounded-full border text-sm font-medium',
                    'transition-all duration-150 cursor-pointer whitespace-nowrap',
                    categoryId === c.id
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                      : 'border-border-default text-text-secondary hover:border-brand-primary/50 hover:text-text-primary',
                  ].join(' ')}
                >
                  {c.name}
                  {c.is80gEligible && (
                    <span className="ml-1.5 text-xs text-info font-medium">80G</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            /* Dropdown for large sets */
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputClass}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.is80gEligible ? ' (80G eligible)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* ── Quick-amount chips + custom input ────────────────────── */}
        <div>
          <label className={labelClass}>Amount (₹)</label>
          <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Quick amount options">
            {quickAmounts.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q))}
                className={[
                  'px-4 py-2 rounded-full border text-sm font-semibold transition-all duration-150 cursor-pointer',
                  amount === String(q)
                    ? 'border-2 border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border border-border-default text-text-secondary hover:border-brand-primary/50 hover:text-brand-primary',
                ].join(' ')}
              >
                ₹{fmtINR(q)}
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

        {/* ── Donor name ───────────────────────────────────────────── */}
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

        {/* ── Phone ────────────────────────────────────────────────── */}
        <div>
          <label className={labelClass}>
            WhatsApp Number <span className="text-text-muted font-normal">(for receipt)</span>
          </label>
          <div className="relative">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            >
              <MessageCircle size={15} />
            </span>
            <input
              type="tel"
              placeholder="10-digit mobile number"
              value={donorPhone}
              onChange={(e) => setDonorPhone(e.target.value)}
              maxLength={10}
              className={`${inputClass} pl-10`}
            />
          </div>
        </div>

        {/* ── PAN ──────────────────────────────────────────────────── */}
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

        {/* ── Error ────────────────────────────────────────────────── */}
        {error && (
          <div
            className="p-3 rounded-lg bg-danger-subtle border border-danger/20 text-danger text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* ── Trust row ────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-4 text-xs text-text-muted flex-wrap">
          <span className="flex items-center gap-1">
            <LockKeyhole size={11} aria-hidden="true" />
            Secure
          </span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            <FileCheck size={11} aria-hidden="true" />
            80G Receipt
          </span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            <MessageCircle size={11} aria-hidden="true" />
            WhatsApp
          </span>
        </div>

        {/* ── Submit ───────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 rounded-xl bg-brand-primary text-white font-bold text-base hover:bg-brand-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? 'Processing…' : `Donate ₹${amount || '—'}`}
        </button>
      </form>
    </div>
  );
}
