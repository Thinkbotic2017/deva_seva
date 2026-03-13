/**
 * Public portal API — no authentication required.
 * Uses plain fetch instead of the Axios apiClient to avoid the auth interceptor.
 */

const BASE = '/api/v1/public';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublicTemple {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  city?: string;
  state?: string;
  upiId?: string;
  razorpayKeyId?: string;
}

export interface PublicCategory {
  id: string;
  name: string;
  description?: string;
  is80gEligible: boolean;
}

export interface PricingTier {
  name: string;
  price: number;
  description?: string;
}

export interface TimeSlot {
  time: string;
  label: string;
  maxBookings: number;
}

export interface PublicSevaType {
  id: string;
  name: string;
  nameHi?: string;
  description?: string;
  pricingTiers: PricingTier[];
  availableTimeSlots: TimeSlot[];
  durationMinutes: number;
  requiresSankalpa: boolean;
  imageUrl?: string;
}

export interface PublicPortalData {
  temple: PublicTemple;
  categories: PublicCategory[];
  sevaTypes: PublicSevaType[];
}

export interface InitiateResult {
  razorpayOrderId: string;
  razorpayKeyId: string;
  amountPaise: number;
  donationId?: string;
  bookingId?: string;
}

export interface PublicDonatePayload {
  categoryId: string;
  donorName: string;
  donorPhone?: string;
  amount: number;
  pan?: string;
}

export interface PublicSankalpaPerson {
  name: string;
  gotra?: string;
  nakshatra?: string;
}

export interface PublicSevaPayload {
  sevaTypeId: string;
  devoteeName: string;
  devoteePhone?: string;
  sevaDate: string;
  timeSlot: string;
  tierName?: string;
  amount: number;
  sankalpaName?: string;
  gotra?: string;
  nakshatra?: string;
  sankalpaPurpose?: string;
  additionalNames?: PublicSankalpaPerson[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) {
    // NestJS error envelope: { error: { code, message } }
    // Razorpay pass-through may also have: { error: { description } }
    const msg =
      json?.error?.message ??
      json?.error?.description ??
      json?.message ??
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  // ResponseInterceptor wraps in { success: true, data: T }
  return (json.data ?? json) as T;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** Fetches temple info, donation categories, and seva types for the portal. */
export async function getPublicPortalData(slug: string): Promise<PublicPortalData> {
  return publicFetch<PublicPortalData>(`/${slug}`);
}

/** Initiates an online donation and returns Razorpay order details. */
export async function initiateDonation(
  slug: string,
  payload: PublicDonatePayload,
): Promise<InitiateResult> {
  return publicFetch<InitiateResult>(`/${slug}/donate/initiate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Creates a PENDING seva booking and returns Razorpay order details. */
export async function initiateSeva(
  slug: string,
  payload: PublicSevaPayload,
): Promise<InitiateResult> {
  return publicFetch<InitiateResult>(`/${slug}/seva/initiate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
