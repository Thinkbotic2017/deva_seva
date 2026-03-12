/**
 * Shared interfaces used across apps and packages.
 */
import { UserRole } from './enums';
/** JWT payload decoded from the access token. */
export interface JwtPayload {
    /** User UUID (subject). */
    sub: string;
    /** Temple UUID this user belongs to. */
    templeId: string;
    /** User's role — drives authorization checks. */
    role: UserRole;
    /** Phone number (for audit logs). */
    phone: string;
}
/** Standard paginated result envelope returned by all list endpoints. */
export interface PaginatedResult<T> {
    data: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
/** Standard API success response envelope. */
export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
    requestId: string;
}
/** Standard API error response envelope. */
export interface ApiErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
    };
    requestId: string;
}
/** Razorpay order creation result. */
export interface RazorpayOrderResult {
    razorpayOrderId: string;
    razorpayKeyId: string;
    /** Amount in PAISE — already multiplied by 100 before this point. */
    amountInPaise: number;
    donationId: string;
}
/** Pricing tier for seva types — stored as jsonb. */
export interface PricingTier {
    name: string;
    price: number;
    description: string;
}
/** Time slot for seva types — stored as jsonb. */
export interface TimeSlot {
    time: string;
    label: string;
    maxBookings: number;
}
/** Preparation checklist item for festivals — stored as jsonb. */
export interface ChecklistItem {
    task: string;
    daysBeforeEvent: number;
    isDone: boolean;
}
/** Additional sankalpa name for seva bookings — stored as jsonb. */
export interface SankalpaPerson {
    name: string;
    gotra: string;
    nakshatra: string;
}
