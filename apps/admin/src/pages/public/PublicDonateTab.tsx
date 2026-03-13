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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-orange-900 mb-2">Thank you, {donorName}!</h2>
        <p className="text-gray-500 text-sm mb-6">Your donation has been received. A receipt will be sent to your WhatsApp shortly.</p>
        <button
          onClick={() => { setSuccess(false); setAmount(''); setDonorName(''); setDonorPhone(''); setPan(''); }}
          className="px-6 py-2 rounded-full bg-orange-500 text-white text-sm font-medium hover:bg-orange-700 transition-colors"
        >
          Make Another Donation
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Donation Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          required
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.is80gEligible ? ' (80G eligible)' : ''}</option>
          ))}
        </select>
      </div>

      {/* Quick amount buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₹)</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {quickAmounts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(String(q))}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                amount === String(q)
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-gray-300 text-gray-600 hover:border-orange-400 hover:text-orange-600'
              }`}
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
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          required
        />
      </div>

      {/* Donor name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
        <input
          type="text"
          placeholder="Full name"
          value={donorName}
          onChange={(e) => setDonorName(e.target.value)}
          maxLength={200}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          required
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          WhatsApp Number <span className="text-gray-400 font-normal">(for receipt)</span>
        </label>
        <input
          type="tel"
          placeholder="10-digit mobile number"
          value={donorPhone}
          onChange={(e) => setDonorPhone(e.target.value)}
          maxLength={10}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* PAN */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          PAN Number <span className="text-gray-400 font-normal">(optional, for 80G)</span>
        </label>
        <input
          type="text"
          placeholder="ABCDE1234F"
          value={pan}
          onChange={(e) => setPan(e.target.value.toUpperCase())}
          maxLength={10}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 uppercase focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-full bg-orange-500 text-white font-medium text-sm hover:bg-orange-700 transition-colors disabled:opacity-60"
      >
        {loading ? 'Processing…' : `Donate ₹${amount || '—'}`}
      </button>
    </form>
  );
}
