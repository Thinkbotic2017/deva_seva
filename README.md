# DevaSeva — Temple Management Platform

> Multi-tenant SaaS platform for Indian temples. Replaces paper ledgers, manual seva registers, and WhatsApp receipts with a unified system that delivers 80G-compliant PDF receipts to donors in under 30 seconds.

---

## Table of Contents

- [1. Project Overview](#1-project-overview)
  - [Tech Stack](#tech-stack)
  - [Monorepo Structure](#monorepo-structure)
- [2. Architecture Overview](#2-architecture-overview)
  - [Auth Strategy](#auth-strategy)
  - [Multi-Tenancy](#multi-tenancy)
  - [Role Hierarchy](#role-hierarchy)
- [3. Database Schema](#3-database-schema)
  - [Temple](#temple)
  - [User](#user)
  - [Session](#session)
  - [OtpSession](#otpsession)
  - [Donation](#donation)
  - [DonationCategory](#donationcategory)
  - [SevaBooking](#sevabooking)
  - [SevaType](#sevatype)
  - [Devotee](#devotee)
  - [FinanceLedger](#financeledger)
  - [FinanceCategory](#financecategory)
  - [Fund](#fund)
  - [MembershipPlan](#membershipplan)
  - [Entity Relationship Diagram](#entity-relationship-diagram)
- [4. API Reference](#4-api-reference)
  - [Auth](#auth)
  - [Donations](#donations)
  - [Sevas](#sevas)
  - [Devotees](#devotees)
  - [Finance](#finance)
  - [Reports](#reports)
  - [Dashboard](#dashboard)
  - [Temple](#temple-1)
  - [Users](#users)
  - [Public](#public)
  - [Webhooks](#webhooks)
  - [SuperAdmin](#superadmin)
  - [Health](#health)
- [5. Flow Diagrams](#5-flow-diagrams)
  - [5.1 Authentication Flow](#51-authentication-flow)
  - [5.2 Donation Flow](#52-donation-flow)
  - [5.3 Seva Booking Flow](#53-seva-booking-flow)
  - [5.4 Webhook Flow](#54-webhook-flow)
- [6. Page-by-Page Feature Breakdown](#6-page-by-page-feature-breakdown)
- [7. Local Development Setup](#7-local-development-setup)

---

## 1. Project Overview

DevaSeva is a financial-grade, multi-tenant SaaS platform built for Indian temples of all denominations. The platform manages:

- **Donations** — counter and online, with automatic 80G receipt generation and WhatsApp delivery
- **Seva Bookings** — time-slotted ritual reservations with Razorpay payment integration
- **Finance Ledger** — append-only double-entry bookkeeping with expense approval workflows
- **Devotee CRM** — per-temple patron profiles with donation and seva history
- **Staff Management** — role-based access control with OTP-only authentication

The critical flow that drives every design decision:

> Counter staff records a ₹5,100 cash donation → devotee receives a 80G-compliant PDF receipt on WhatsApp in under 30 seconds. No manual steps.

### Tech Stack

| Layer         | Package               | Version        | Notes                                                  |
| ------------- | --------------------- | -------------- | ------------------------------------------------------ |
| API Framework | NestJS                | 10.3.x         | Express adapter, decorator-based                       |
| ORM           | TypeORM               | 0.3.20         | Entity classes match DB schema exactly                 |
| Database      | PostgreSQL            | 15             | All money stored as `decimal(12,2)` or `decimal(14,2)` |
| Cache + Queue | Redis + Bull/BullMQ   | 7 / 4.12 + 5.4 | Receipt sequences, background jobs                     |
| Admin SPA     | React 18 + Vite       | 18.x           | Pure SPA, no SSR                                       |
| Server State  | TanStack Query        | v5             | Query keys pattern throughout                          |
| UI State      | Zustand               | v4             | Auth store only                                        |
| Styling       | Tailwind CSS          | 3.x            | HSL CSS custom property token system                   |
| Animations    | Framer Motion         | 11.x           | Admin app only                                         |
| Auth          | Passport-JWT (RS256)  | 10.x           | RS256 asymmetric; OTP passwordless                     |
| Payments      | Razorpay Node SDK     | 2.9.x          | HMAC webhook verification enforced                     |
| WhatsApp      | Gupshup BSP REST      | —              | Direct HTTP, no SDK                                    |
| File Storage  | AWS S3 SDK v3         | 3.540.x        | ap-south-1; S3 keys stored, never URLs                 |
| PDF           | Puppeteer             | 22.x           | Server-side headless Chrome for receipts               |
| Email         | AWS SES SDK v3        | 3.540.x        | Invite emails, annual 80G summaries                    |
| Rate Limiting | NestJS Throttler      | 6.5.x          | 100 req/60s global; per-route overrides                |
| Validation    | class-validator + Joi | —              | DTO validation + env schema at startup                 |
| Monorepo      | Turborepo + pnpm      | 1.13 + 8       | Workspace packages                                     |
| Shared Types  | `@devaseva/types`     | workspace      | Enums, interfaces, base entities                       |

### Monorepo Structure

```
devaseva/
├── apps/
│   ├── api/          # NestJS backend — all business logic, queues, webhooks
│   └── admin/        # React 18 + Vite — temple staff dashboard (SPA)
├── packages/
│   └── types/        # Shared TypeScript enums, interfaces, base entities
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

---

## 2. Architecture Overview

The platform uses a layered architecture with strict tenant isolation. Every authenticated request carries a JWT containing `templeId`, which is applied as a WHERE clause on every tenant-scoped query — the service layer enforces this, never the controller.

```mermaid
graph TD
    subgraph Clients
        A[React Admin SPA<br/>apps/admin]
        B[Public Portal<br/>Devotee-facing iframe]
    end

    subgraph API["NestJS API (apps/api)"]
        C[Controllers<br/>thin routing]
        D[Services<br/>business logic]
        E[BullMQ Workers<br/>receipt · WhatsApp · reminders]
    end

    subgraph Stores
        F[(PostgreSQL 15<br/>primary data store)]
        G[(Redis 7<br/>queues · receipt sequences · rate limits)]
    end

    subgraph External
        H[Razorpay<br/>payment gateway]
        I[Gupshup BSP<br/>WhatsApp delivery]
        J[AWS S3<br/>receipt PDFs · media]
    end

    A -->|JWT Bearer| C
    B -->|Public endpoints| C
    C --> D
    D --> F
    D --> G
    D --> E
    E -->|Puppeteer PDF| J
    E -->|REST API| I
    H -->|HMAC webhook| C
```

**Request lifecycle:**

1. `RequestIdMiddleware` assigns a UUID to every request (returned in all responses as `requestId`)
2. `TenantMiddleware` attaches `templeId` from the JWT to `req.user`
3. `JwtAuthGuard` (global) rejects requests without a valid access token; `@Public()` decorator bypasses it
4. `RolesGuard` checks the user's role against `@Roles()` on the handler
5. `ValidationPipe` (global) strips unknown fields and transforms/validates all DTOs
6. `ResponseInterceptor` wraps every successful response in `{ success: true, data, requestId }`
7. `HttpExceptionFilter` formats all errors to `{ success: false, error: { code, message }, requestId }`
8. `AuditInterceptor` writes an audit log row for every CREATE/UPDATE/DELETE mutation

### Auth Strategy

- **Access token**: RS256 JWT, 15-minute TTL. Contains `{ sub, templeId, role, phone }`.
- **Refresh token**: Opaque random string. Stored as `bcrypt(token, 10)` in the `sessions` table. 30-day sliding window.
- **OTP**: 6-digit code, 10-minute TTL, bcrypt-hashed before storage. Max 3 attempts before session lock. Rate-limited to 5 requests per phone per hour via Redis.
- **Token refresh**: Client sends the opaque refresh token. Server decodes it to extract `userId` — templeId is **never** read from the request body.

### Multi-Tenancy

Every table except `temples`, `otp_sessions`, `sessions`, and `membership_plans` extends `TenantBaseEntity`, which adds a non-nullable `temple_id uuid` column. The security guarantee:

- `templeId` is **always** sourced from `req.user.templeId` (JWT payload)
- Every service method that queries tenant data accepts `templeId` as its first parameter
- No query on a tenant-scoped table may omit the `WHERE temple_id = :templeId` clause

### Role Hierarchy

```
SUPER_ADMIN          ← Platform operator; accesses /superadmin/* only
  └── ADMIN          ← Temple owner; full access within their temple
        ├── ACCOUNTANT       ← Finance read/write; no staff management
        ├── COUNTER_STAFF    ← Donations + seva bookings only
        ├── HEAD_PRIEST      ← Seva bookings + day sheet
        ├── PRIEST           ← Day sheet read; complete assigned sevas
        ├── TRUSTEE          ← Expense approval; finance read
        └── INVENTORY_MANAGER ← Inventory module only
```

---

## 3. Database Schema

All monetary columns use `decimal(12,2)` or `decimal(14,2)`. TypeORM returns these as strings — always `parseFloat()` before arithmetic. Soft-delete (`deleted_at`) is used on all financial tables; hard-delete is never performed.

### Temple

| Column                             | Type          | Nullable | Description                                             |
| ---------------------------------- | ------------- | -------- | ------------------------------------------------------- |
| id                                 | uuid          | No       | Primary key                                             |
| name                               | varchar(200)  | No       | Display name                                            |
| slug                               | varchar(100)  | No       | URL slug; globally unique                               |
| category                           | enum          | Yes      | HINDU \| JAIN \| SIKH \| BUDDHIST \| CHRISTIAN \| OTHER |
| description                        | text          | Yes      | Public-facing description                               |
| logo_url                           | varchar       | Yes      | S3 key (not a URL)                                      |
| banner_url                         | varchar       | Yes      | S3 key (not a URL)                                      |
| address_line1/2                    | varchar       | Yes      | Street address                                          |
| city, state                        | varchar       | Yes      | Location                                                |
| pin_code                           | varchar(6)    | Yes      | Indian postal code                                      |
| phone_primary                      | varchar(15)   | Yes      | Contact number                                          |
| phone_whatsapp                     | varchar(15)   | Yes      | WhatsApp number for broadcasts                          |
| email                              | varchar       | Yes      | Contact email                                           |
| pan_number                         | varchar       | Yes      | Temple PAN (not encrypted — public)                     |
| trust_reg_number                   | varchar       | Yes      | Trust registration number                               |
| number_80g                         | varchar       | Yes      | 80G registration number                                 |
| number_80g_expiry                  | date          | Yes      | Expiry of 80G registration                              |
| is_80g_registered                  | boolean       | No       | Defaults false                                          |
| fcra_number                        | varchar       | Yes      | FCRA registration (foreign donations)                   |
| receipt_prefix                     | varchar(20)   | No       | Default 'RCPT'                                          |
| upi_id                             | varchar       | Yes      | UPI ID for QR codes                                     |
| razorpay_key_id                    | varchar       | Yes      | Razorpay public key                                     |
| razorpay_key_secret                | varchar       | Yes      | Encrypted at application layer                          |
| plan                               | enum          | No       | STARTER \| GROWTH \| ENTERPRISE                         |
| plan_id                            | uuid          | Yes      | FK to membership_plans                                  |
| plan_valid_until                   | timestamptz   | Yes      | Plan expiry                                             |
| plan_billing_cycle                 | varchar       | Yes      | MONTHLY \| QUARTERLY \| YEARLY                          |
| plan_amount                        | decimal(10,2) | Yes      | Subscription amount paid                                |
| plan_auto_renew                    | boolean       | No       | Defaults false                                          |
| is_active                          | boolean       | No       | False = suspended                                       |
| suspension_reason                  | varchar       | Yes      | Set on suspension                                       |
| settings                           | jsonb         | No       | Feature flags, notification prefs                       |
| timezone                           | varchar       | No       | Default 'Asia/Kolkata'                                  |
| primary_language                   | varchar(5)    | No       | Default 'hi'                                            |
| created_at, updated_at, deleted_at | timestamptz   | —        | Audit timestamps                                        |

### User

| Column                             | Type         | Nullable | Description                           |
| ---------------------------------- | ------------ | -------- | ------------------------------------- |
| id                                 | uuid         | No       | Primary key                           |
| temple_id                          | uuid         | No       | Tenant FK                             |
| phone                              | varchar(15)  | No       | Unique per (temple_id, phone)         |
| full_name                          | varchar(200) | No       | Display name                          |
| email                              | varchar      | Yes      | Optional contact                      |
| profile_photo_url                  | varchar      | Yes      | S3 key                                |
| role                               | enum         | No       | UserRole enum; default COUNTER_STAFF  |
| is_active                          | boolean      | No       | False = deactivated                   |
| last_login_at                      | timestamptz  | Yes      | Updated on each successful verify-otp |
| invited_by                         | uuid         | Yes      | Self-referential FK to users          |
| invite_token                       | varchar      | Yes      | One-time token, 48h TTL               |
| invite_accepted_at                 | timestamptz  | Yes      | Cleared after acceptance              |
| preferred_language                 | varchar(5)   | No       | Default 'hi'                          |
| permissions                        | jsonb        | No       | Fine-grained permission overrides     |
| created_at, updated_at, deleted_at | timestamptz  | —        | Audit timestamps                      |

### Session

| Column                 | Type        | Nullable | Description                            |
| ---------------------- | ----------- | -------- | -------------------------------------- |
| id                     | uuid        | No       | Primary key                            |
| user_id                | uuid        | No       | FK → users; CASCADE delete             |
| temple_id              | uuid        | No       | Denormalised for fast lookup           |
| refresh_token_hash     | varchar     | No       | bcrypt(refreshToken). Never raw token. |
| device_info            | varchar     | Yes      | User-agent or device label             |
| ip_address             | varchar     | Yes      | IP at session creation                 |
| expires_at             | timestamptz | No       | 30-day sliding window                  |
| is_revoked             | boolean     | No       | True after logout                      |
| last_used_at           | timestamptz | Yes      | Updated on each successful refresh     |
| created_at, updated_at | timestamptz | —        | Audit timestamps                       |

### OtpSession

| Column     | Type        | Nullable | Description                               |
| ---------- | ----------- | -------- | ----------------------------------------- |
| id         | uuid        | No       | Primary key                               |
| phone      | varchar(15) | No       | Phone number the OTP was sent to          |
| otp_hash   | varchar     | No       | bcrypt(otp, 10). Never raw OTP.           |
| purpose    | enum        | No       | LOGIN \| INVITE_ACCEPT                    |
| expires_at | timestamptz | No       | 10-minute TTL                             |
| attempts   | integer     | No       | Incremented on failed verify; locked at 3 |
| is_used    | boolean     | No       | True after successful verification        |
| ip_address | varchar     | Yes      | Requester IP                              |
| created_at | timestamptz | No       | —                                         |

### Donation

| Column                             | Type          | Nullable | Description                                                         |
| ---------------------------------- | ------------- | -------- | ------------------------------------------------------------------- |
| id                                 | uuid          | No       | Primary key                                                         |
| temple_id                          | uuid          | No       | Tenant FK                                                           |
| receipt_number                     | varchar(50)   | Yes      | Auto-generated; partial unique per temple                           |
| devotee_id                         | uuid          | Yes      | FK → devotees (optional link)                                       |
| category_id                        | uuid          | No       | FK → donation_categories                                            |
| donor_name                         | varchar(200)  | No       | Captured at donation time                                           |
| donor_phone                        | varchar(15)   | Yes      | For WhatsApp receipt delivery                                       |
| donor_pan_encrypted                | varchar       | Yes      | AES-256-GCM ciphertext (never raw PAN)                              |
| donor_pan_masked                   | varchar(12)   | Yes      | Safe for display, e.g. "ABCXX1234X"                                 |
| amount                             | decimal(12,2) | No       | Always positive                                                     |
| mode                               | enum          | No       | CASH \| UPI \| CARD \| CHEQUE \| NEFT \| DD \| ONLINE               |
| status                             | enum          | No       | PENDING → CONFIRMED → RECEIPT_GENERATED → RECEIPT_SENT \| CANCELLED |
| is_80g_eligible                    | boolean       | No       | Temple 80G registered AND category eligible                         |
| is_anonymous                       | boolean       | No       | Suppresses donor name on receipt                                    |
| razorpay_order_id                  | varchar       | Yes      | Set for online donations                                            |
| razorpay_payment_id                | varchar       | Yes      | Set after payment.captured webhook                                  |
| payment_reference                  | varchar       | Yes      | UPI txn ID, cheque no, DD no                                        |
| payment_date                       | date          | No       | Date of transaction                                                 |
| receipt_pdf_s3_key                 | varchar       | Yes      | S3 key; pre-sign at serve time                                      |
| receipt_generated_at               | timestamptz   | Yes      | —                                                                   |
| receipt_sent_at                    | timestamptz   | Yes      | —                                                                   |
| fund_id                            | uuid          | Yes      | Optional fund routing                                               |
| recorded_by                        | uuid          | Yes      | FK → users                                                          |
| fiscal_year                        | varchar(10)   | No       | 'YYYY-YY' derived from payment_date                                 |
| notes                              | text          | Yes      | Free-form notes                                                     |
| created_at, updated_at, deleted_at | timestamptz   | —        | Soft-delete only                                                    |

### DonationCategory

| Column                             | Type         | Nullable | Description                                |
| ---------------------------------- | ------------ | -------- | ------------------------------------------ |
| id                                 | uuid         | No       | Primary key                                |
| temple_id                          | uuid         | No       | Tenant FK                                  |
| name                               | varchar(200) | No       | e.g. "Annadanam", "Temple Renovation"      |
| description                        | text         | Yes      | —                                          |
| is_80g_eligible                    | boolean      | No       | Qualifies donations for 80G exemption      |
| is_active                          | boolean      | No       | Inactive categories hidden from counter UI |
| sort_order                         | integer      | No       | Display order                              |
| color                              | varchar(7)   | No       | Hex colour for UI; default '#E8530A'       |
| fund_id                            | uuid         | Yes      | Optional routing to a Fund                 |
| created_at, updated_at, deleted_at | timestamptz  | —        | —                                          |

### SevaBooking

| Column                             | Type          | Nullable | Description                                                     |
| ---------------------------------- | ------------- | -------- | --------------------------------------------------------------- |
| id                                 | uuid          | No       | Primary key                                                     |
| temple_id                          | uuid          | No       | Tenant FK                                                       |
| booking_number                     | varchar(50)   | Yes      | Auto-generated; partial unique per temple                       |
| seva_type_id                       | uuid          | No       | FK → seva_types                                                 |
| devotee_id                         | uuid          | Yes      | FK → devotees (optional)                                        |
| devotee_name                       | varchar(200)  | No       | Captured at booking time                                        |
| devotee_phone                      | varchar(15)   | Yes      | For WhatsApp confirmation                                       |
| seva_date                          | date          | No       | Date of the ritual                                              |
| time_slot                          | varchar(10)   | No       | 24-hour HH:MM format                                            |
| tier_name                          | varchar(100)  | Yes      | Selected pricing tier                                           |
| amount                             | decimal(10,2) | No       | Booking amount                                                  |
| payment_mode                       | enum          | Yes      | CASH \| UPI \| CARD \| ONLINE                                   |
| status                             | enum          | No       | PENDING_PAYMENT → CONFIRMED → COMPLETED \| CANCELLED \| NO_SHOW |
| sankalpa_name                      | varchar(200)  | Yes      | Primary devotee's sankalpa name                                 |
| gotra                              | varchar(100)  | Yes      | Gotra                                                           |
| nakshatra                          | varchar(50)   | Yes      | Nakshatra                                                       |
| sankalpa_purpose                   | text          | Yes      | Free-form intent                                                |
| additional_names                   | jsonb         | No       | Array of `{ name, gotra, nakshatra }`                           |
| priest_id                          | uuid          | Yes      | Assigned priest                                                 |
| razorpay_order_id                  | varchar       | Yes      | For online bookings                                             |
| razorpay_payment_id                | varchar       | Yes      | After payment.captured                                          |
| confirmation_sent_at               | timestamptz   | Yes      | —                                                               |
| reminder_sent_at                   | timestamptz   | Yes      | —                                                               |
| completed_at                       | timestamptz   | Yes      | —                                                               |
| cancelled_at                       | timestamptz   | Yes      | —                                                               |
| cancellation_reason                | varchar       | Yes      | —                                                               |
| refund_amount                      | decimal(10,2) | Yes      | If refund issued                                                |
| recorded_by                        | uuid          | Yes      | FK → users                                                      |
| fiscal_year                        | varchar(10)   | No       | 'YYYY-YY' derived from seva_date                                |
| created_at, updated_at, deleted_at | timestamptz   | —        | —                                                               |

### SevaType

| Column                             | Type         | Nullable | Description                                         |
| ---------------------------------- | ------------ | -------- | --------------------------------------------------- |
| id                                 | uuid         | No       | Primary key                                         |
| temple_id                          | uuid         | No       | Tenant FK                                           |
| name                               | varchar(200) | No       | Primary name                                        |
| name_hi                            | varchar(200) | Yes      | Hindi transliteration                               |
| name_local                         | varchar(200) | Yes      | Regional language                                   |
| description                        | text         | Yes      | —                                                   |
| duration_minutes                   | integer      | No       | Default 60                                          |
| frequency                          | enum         | No       | DAILY \| WEEKLY \| MONTHLY \| FESTIVAL \| ON_DEMAND |
| pricing_tiers                      | jsonb        | No       | `[{ name, price, description }]`                    |
| max_bookings_per_slot              | integer      | No       | Default 1                                           |
| advance_booking_days               | integer      | No       | Default 30                                          |
| requires_sankalpa                  | boolean      | No       | Collect sankalpa details at booking                 |
| image_url                          | varchar      | Yes      | S3 key                                              |
| is_active                          | boolean      | No       | Default true                                        |
| is_online_bookable                 | boolean      | No       | Available on public portal                          |
| available_days                     | jsonb        | No       | `[0..6]` (0 = Sunday)                               |
| available_time_slots               | jsonb        | No       | `[{ time, label, maxBookings }]`                    |
| sort_order                         | integer      | No       | Display order                                       |
| created_at, updated_at, deleted_at | timestamptz  | —        | —                                                   |

### Devotee

| Column                               | Type         | Nullable | Description                                  |
| ------------------------------------ | ------------ | -------- | -------------------------------------------- |
| id                                   | uuid         | No       | Primary key                                  |
| temple_id                            | uuid         | No       | Tenant FK                                    |
| name                                 | varchar(200) | No       | Full name                                    |
| phone                                | varchar(15)  | No       | Unique per (temple_id, phone); CRM key       |
| email                                | varchar      | Yes      | —                                            |
| gender                               | enum         | Yes      | MALE \| FEMALE \| OTHER                      |
| date_of_birth                        | date         | Yes      | —                                            |
| anniversary_date                     | date         | Yes      | —                                            |
| pan_number_encrypted                 | varchar      | Yes      | AES-256-GCM; never returned in API responses |
| pan_number_masked                    | varchar(12)  | Yes      | Safe display value, e.g. "ABCXX1234X"        |
| address_line1, city, state, pin_code | varchar      | Yes      | Address                                      |
| gotra                                | varchar(100) | Yes      | —                                            |
| nakshatra                            | varchar(50)  | Yes      | —                                            |
| rashi                                | varchar(50)  | Yes      | —                                            |
| tier                                 | enum         | No       | REGULAR \| PATRON \| VIP \| LIFE_TRUSTEE     |
| family_head_id                       | uuid         | Yes      | Self-referential; groups family donations    |
| whatsapp_opted_out                   | boolean      | No       | Default false                                |
| sms_opted_out                        | boolean      | No       | Default false                                |
| photo_url                            | varchar      | Yes      | S3 key                                       |
| member_since                         | date         | Yes      | —                                            |
| notes                                | text         | Yes      | —                                            |
| referred_by                          | uuid         | Yes      | FK → devotees                                |
| created_at, updated_at, deleted_at   | timestamptz  | —        | —                                            |

> **Note:** `donationCount`, `totalDonated`, `sevaCount`, `lastDonationAt` are computed at query time via subqueries — not stored columns.

### FinanceLedger

| Column                             | Type          | Nullable | Description                                 |
| ---------------------------------- | ------------- | -------- | ------------------------------------------- |
| id                                 | uuid          | No       | Primary key                                 |
| temple_id                          | uuid          | No       | Tenant FK                                   |
| type                               | enum          | No       | INCOME \| EXPENSE                           |
| amount                             | decimal(14,2) | No       | Always positive; sign determined by type    |
| entry_date                         | date          | No       | Transaction date                            |
| description                        | varchar(500)  | No       | Human-readable description                  |
| category_id                        | uuid          | Yes      | FK → finance_categories                     |
| fund_id                            | uuid          | Yes      | FK → funds                                  |
| donation_id                        | uuid          | Yes      | Set when auto-posted from a donation        |
| seva_booking_id                    | uuid          | Yes      | Set when auto-posted from a booking         |
| inventory_transaction_id           | uuid          | Yes      | Set when auto-posted from inventory         |
| expense_status                     | enum          | Yes      | PENDING_APPROVAL \| APPROVED \| REJECTED    |
| approved_by                        | uuid          | Yes      | FK → users                                  |
| approved_at                        | timestamptz   | Yes      | —                                           |
| vendor_id                          | uuid          | Yes      | For inventory purchase expenses             |
| payment_mode                       | varchar       | Yes      | —                                           |
| reference_number                   | varchar       | Yes      | Invoice or payment reference                |
| is_auto_posted                     | boolean       | No       | True = system-generated; false = manual     |
| recorded_by                        | uuid          | Yes      | FK → users                                  |
| fiscal_year                        | varchar(10)   | No       | 'YYYY-YY'                                   |
| created_at, updated_at, deleted_at | timestamptz   | —        | Financial fields are immutable after insert |

> **Immutability rule:** Only `expense_status`, `approved_by`, and `approved_at` may be updated after insert. All other fields are write-once.

### FinanceCategory

| Column                 | Type         | Nullable | Description                                |
| ---------------------- | ------------ | -------- | ------------------------------------------ |
| id                     | uuid         | No       | Primary key                                |
| temple_id              | uuid         | No       | Tenant FK                                  |
| name                   | varchar(200) | No       | e.g. "Salary", "Electricity", "Donations"  |
| type                   | enum         | No       | INCOME \| EXPENSE                          |
| is_system              | boolean      | No       | System-seeded; cannot be deleted by admins |
| is_active              | boolean      | No       | Default true                               |
| sort_order             | integer      | No       | Display order                              |
| color                  | varchar(7)   | No       | Hex colour                                 |
| created_at, updated_at | timestamptz  | —        | No deleted_at on this table                |

### Fund

| Column                             | Type          | Nullable | Description                           |
| ---------------------------------- | ------------- | -------- | ------------------------------------- |
| id                                 | uuid          | No       | Primary key                           |
| temple_id                          | uuid          | No       | Tenant FK                             |
| name                               | varchar(200)  | No       | e.g. "Temple Renovation", "Annadanam" |
| description                        | text          | Yes      | —                                     |
| is_active                          | boolean       | No       | Default true                          |
| target_amount                      | decimal(14,2) | Yes      | Optional fundraising goal             |
| color                              | varchar(7)    | No       | Hex colour; default '#1455A0'         |
| sort_order                         | integer       | No       | —                                     |
| created_at, updated_at, deleted_at | timestamptz   | —        | —                                     |

> **No `current_balance` column.** Fund balances are always computed live via `SUM(amount)` on `finance_ledger WHERE fund_id = :id`.

### MembershipPlan

| Column                 | Type          | Nullable | Description                                   |
| ---------------------- | ------------- | -------- | --------------------------------------------- |
| id                     | uuid          | No       | Primary key                                   |
| name                   | varchar(100)  | No       | Plan display name                             |
| billing_cycle          | varchar(20)   | No       | MONTHLY \| QUARTERLY \| HALF_YEARLY \| YEARLY |
| price                  | decimal(10,2) | No       | Subscription price in INR                     |
| description            | text          | Yes      | —                                             |
| features               | jsonb         | No       | String array of feature bullets               |
| is_active              | boolean       | No       | False = soft-deactivated                      |
| sort_order             | integer       | No       | Display order                                 |
| created_at, updated_at | timestamptz   | —        | Not tenant-scoped; platform-global            |

### Entity Relationship Diagram

```mermaid
erDiagram
    Temple ||--o{ User : "has staff"
    Temple ||--o{ DonationCategory : "defines"
    Temple ||--o{ Donation : "receives"
    Temple ||--o{ SevaType : "offers"
    Temple ||--o{ SevaBooking : "records"
    Temple ||--o{ Devotee : "tracks"
    Temple ||--o{ FinanceLedger : "maintains"
    Temple ||--o{ FinanceCategory : "defines"
    Temple ||--o{ Fund : "manages"
    Temple }o--|| MembershipPlan : "subscribes to"

    DonationCategory }o--|| Fund : "routes to"
    Donation }o--|| DonationCategory : "belongs to"
    Donation }o--o| Devotee : "linked to"
    Donation }o--o| Fund : "routed to"
    Donation }o--o| User : "recorded by"

    SevaBooking }o--|| SevaType : "books"
    SevaBooking }o--o| Devotee : "linked to"
    SevaBooking }o--o| User : "recorded by"

    FinanceLedger }o--o| FinanceCategory : "categorised by"
    FinanceLedger }o--o| Fund : "routed to"
    FinanceLedger }o--o| Donation : "auto-posted from"
    FinanceLedger }o--o| SevaBooking : "auto-posted from"
    FinanceLedger }o--o| User : "recorded by"

    User ||--o{ Session : "has sessions"
    OtpSession }o--|| User : "authenticates"
```

---

## 4. API Reference

**Base URL:** `/api/v1`
**Auth header:** `Authorization: Bearer <accessToken>` on all protected routes
**Response envelope (success):** `{ success: true, data: T, requestId: string }`
**Response envelope (error):** `{ success: false, error: { code, message }, requestId: string }`
**Pagination default:** `limit=20`, max `limit=100`. Response: `{ data: T[], meta: { page, limit, total, totalPages } }`

---

### Auth

| Method | Path                | Auth   | Roles | Description                                                                                                                                           |
| ------ | ------------------- | ------ | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/request-otp` | Public | —     | Request OTP. Body: `{ phone: string }`. Returns `{ sessionId, expiresAt }`. Rate-limited: 5/hour per phone. OTP delivered out-of-band (WhatsApp/SMS). |
| POST   | `/auth/verify-otp`  | Public | —     | Verify OTP. Body: `{ sessionId, phone, otp }`. Returns `{ accessToken, refreshToken, expiresIn, user }`.                                              |
| POST   | `/auth/refresh`     | Public | —     | Issue new access token. Body: `{ refreshToken }`. `userId`/`templeId` decoded from token — never from body.                                           |
| GET    | `/auth/me`          | JWT    | Any   | Current user profile + temple details.                                                                                                                |
| POST   | `/auth/logout`      | JWT    | Any   | Revoke single session. Body: `{ refreshToken }`.                                                                                                      |
| POST   | `/auth/logout-all`  | JWT    | Any   | Revoke all sessions for current user.                                                                                                                 |

---

### Donations

| Method | Path                            | Auth   | Roles                            | Description                                                                                                                                                                                  |
| ------ | ------------------------------- | ------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/donations`                    | JWT    | ADMIN, COUNTER_STAFF, ACCOUNTANT | Create donation. `templeId` from JWT only. Triggers receipt generation queue.                                                                                                                |
| GET    | `/donations`                    | JWT    | Any                              | Paginated list. Query: `page, limit, fromDate, toDate, categoryId, mode, status, search, fiscalYear`.                                                                                        |
| GET    | `/donations/categories`         | JWT    | Any                              | Active donation categories. `?includeInactive=true` for ADMIN/ACCOUNTANT.                                                                                                                    |
| POST   | `/donations/categories`         | JWT    | ADMIN, ACCOUNTANT                | Create category.                                                                                                                                                                             |
| PATCH  | `/donations/categories/:id`     | JWT    | ADMIN, ACCOUNTANT                | Update category.                                                                                                                                                                             |
| DELETE | `/donations/categories/:id`     | JWT    | ADMIN                            | Soft-delete category.                                                                                                                                                                        |
| GET    | `/donations/by-order/:orderId`  | Public | —                                | Poll donation status by Razorpay order ID. Returns `{ status, donationId }` only.                                                                                                            |
| POST   | `/donations/initiate-online`    | Public | —                                | Create PENDING donation + Razorpay order. Body: `{ templeSlug, categoryId, amount, donorName, donorPhone?, pan? }`. Returns `{ razorpayOrderId, razorpayKeyId, amountInPaise, donationId }`. |
| GET    | `/donations/:id`                | JWT    | Any                              | Single donation with pre-signed receipt URL.                                                                                                                                                 |
| PATCH  | `/donations/:id/devotee`        | JWT    | ADMIN, COUNTER_STAFF, ACCOUNTANT | Link devotee to donation. Body: `{ devoteeId }`.                                                                                                                                             |
| POST   | `/donations/:id/resend-receipt` | JWT    | ADMIN, COUNTER_STAFF, ACCOUNTANT | Re-queue receipt PDF + WhatsApp delivery.                                                                                                                                                    |

---

### Sevas

**Seva Types** (`/sevas/types`)

| Method | Path               | Auth | Roles | Description                                           |
| ------ | ------------------ | ---- | ----- | ----------------------------------------------------- |
| GET    | `/sevas/types`     | JWT  | Any   | Active seva types. `?includeInactive=true` for ADMIN. |
| GET    | `/sevas/types/:id` | JWT  | Any   | Single seva type.                                     |
| POST   | `/sevas/types`     | JWT  | ADMIN | Create seva type with pricing tiers and time slots.   |
| PATCH  | `/sevas/types/:id` | JWT  | ADMIN | Partial update.                                       |
| DELETE | `/sevas/types/:id` | JWT  | ADMIN | Soft-delete.                                          |

**Seva Bookings** (`/sevas/bookings`)

| Method | Path                          | Auth | Roles                                         | Description                                                                                                                                                      |
| ------ | ----------------------------- | ---- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/sevas/bookings`             | JWT  | ADMIN, COUNTER_STAFF, ACCOUNTANT, HEAD_PRIEST | Create booking. Body: `{ sevaTypeId, devoteeName, sevaDate, timeSlot, tierName, amount, paymentMode?, devoteePhone?, sankalpaName?, gotra?, additionalNames? }`. |
| GET    | `/sevas/bookings`             | JWT  | Any                                           | Paginated. Query: `date, status, sevaTypeId, priestId`.                                                                                                          |
| GET    | `/sevas/bookings/day-sheet`   | JWT  | Any                                           | All bookings for a date. Query: `date`.                                                                                                                          |
| GET    | `/sevas/bookings/:id`         | JWT  | Any                                           | Single booking.                                                                                                                                                  |
| PATCH  | `/sevas/bookings/:id/devotee` | JWT  | ADMIN, COUNTER_STAFF, ACCOUNTANT, HEAD_PRIEST | Link devotee. Body: `{ devoteeId }`.                                                                                                                             |
| PATCH  | `/sevas/bookings/:id/cancel`  | JWT  | ADMIN, COUNTER_STAFF, ACCOUNTANT              | Cancel booking. Body: `{ reason }`.                                                                                                                              |

---

### Devotees

| Method | Path            | Auth | Roles                                         | Description                                                                                                 |
| ------ | --------------- | ---- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| POST   | `/devotees`     | JWT  | ADMIN, COUNTER_STAFF, ACCOUNTANT, HEAD_PRIEST | Find-or-create by `(templeId, phone)`. Idempotent. Body: `{ name, phone, email?, gotra?, pan? }`.           |
| GET    | `/devotees`     | JWT  | Any                                           | Paginated. Query: `search, tier, city`.                                                                     |
| GET    | `/devotees/:id` | JWT  | Any                                           | Full profile + computed stats (donationCount, totalDonated, sevaCount, lastDonationAt) + last 10 donations. |
| PUT    | `/devotees/:id` | JWT  | ADMIN, COUNTER_STAFF, ACCOUNTANT              | Full update. PAN re-encrypted if provided.                                                                  |

---

### Finance

| Method | Path                      | Auth | Roles             | Description                                                                        |
| ------ | ------------------------- | ---- | ----------------- | ---------------------------------------------------------------------------------- |
| GET    | `/finance/categories`     | JWT  | Any               | Finance categories. `?type=INCOME\|EXPENSE`, `?includeInactive=true`.              |
| POST   | `/finance/categories`     | JWT  | ADMIN             | Create category.                                                                   |
| PATCH  | `/finance/categories/:id` | JWT  | ADMIN             | Update category.                                                                   |
| DELETE | `/finance/categories/:id` | JWT  | ADMIN             | Deactivate (sets `isActive=false`).                                                |
| POST   | `/finance/ledger`         | JWT  | ADMIN, ACCOUNTANT | Manual income or expense entry. Never creates `isAutoPosted=true` entries.         |
| GET    | `/finance/ledger`         | JWT  | Any               | Paginated ledger. Query: `type, fromDate, toDate, fundId, fiscalYear`.             |
| GET    | `/finance/summary`        | JWT  | Any               | Income, expense totals and net balance. Query: `fromDate, toDate` or `fiscalYear`. |

---

### Reports

| Method | Path                         | Auth | Roles | Description                                                                                                              |
| ------ | ---------------------------- | ---- | ----- | ------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/reports/donations/summary` | JWT  | Any   | Grand total + breakdown by mode + by category. Query: `fromDate, toDate`. Confirmed donations only.                      |
| GET    | `/reports/ledger`            | JWT  | Any   | Income vs expense totals by fund for a fiscal year. Query: `fiscalYear` (required).                                      |
| GET    | `/reports/80g`               | JWT  | Any   | All 80G-eligible donations for a fiscal year. Includes `donorPanMasked`. Never `donorPanEncrypted`. Query: `fiscalYear`. |
| GET    | `/reports/day-sheet`         | JWT  | Any   | All donations + seva bookings for a date. Query: `date`.                                                                 |

---

### Dashboard

| Method | Path                  | Auth | Roles | Description                                                                                                                    |
| ------ | --------------------- | ---- | ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/dashboard/stats`    | JWT  | Any   | Four KPIs: today's donation total, month-to-date total, pending seva count, active devotee count. All queries run in parallel. |
| GET    | `/dashboard/activity` | JWT  | Any   | Unified activity feed (last N donations + seva bookings merged by `created_at`). Query: `limit` (default 20).                  |

---

### Temple

| Method | Path               | Auth | Roles       | Description                                                                                             |
| ------ | ------------------ | ---- | ----------- | ------------------------------------------------------------------------------------------------------- |
| POST   | `/temples`         | JWT  | SUPER_ADMIN | Create temple. Seeds default donation categories and finance categories.                                |
| GET    | `/temples/profile` | JWT  | Any         | Temple profile. `logo_url`/`banner_url` returned as pre-signed S3 URLs. Razorpay secret never returned. |
| PATCH  | `/temples/profile` | JWT  | ADMIN       | Update temple profile.                                                                                  |

---

### Users

| Method | Path                    | Auth | Roles             | Description                                                                                      |
| ------ | ----------------------- | ---- | ----------------- | ------------------------------------------------------------------------------------------------ |
| POST   | `/users/invite`         | JWT  | ADMIN             | Invite staff member. Body: `{ fullName, phone, role, email? }`. Returns user with `inviteToken`. |
| GET    | `/users`                | JWT  | ADMIN, ACCOUNTANT | Paginated staff list for calling user's temple.                                                  |
| PATCH  | `/users/:id/role`       | JWT  | ADMIN             | Change staff role. Cannot assign SUPER_ADMIN.                                                    |
| POST   | `/users/:id/deactivate` | JWT  | ADMIN             | Deactivate staff (sets `isActive=false`). Cannot deactivate own account.                         |

---

### Public

All routes are `@Public()` — no JWT required. `templeId` derived from `:slug` path param.

| Method | Path                            | Auth   | Roles | Description                                                                                                                                                    |
| ------ | ------------------------------- | ------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/public/:slug`                 | Public | —     | Portal data: temple info + active donation categories + online-bookable seva types.                                                                            |
| POST   | `/public/:slug/donate/initiate` | Public | —     | Create PENDING donation + Razorpay order. Body: `{ categoryId, donorName, amount, donorPhone?, pan? }`.                                                        |
| POST   | `/public/:slug/seva/initiate`   | Public | —     | Create PENDING seva booking + Razorpay order. Body: `{ sevaTypeId, devoteeName, sevaDate, timeSlot, tierName, amount, devoteePhone?, sankalpaName?, gotra? }`. |

---

### Webhooks

All routes are `@Public()`. Auth via HMAC, not JWT.

| Method | Path                 | Auth                        | Description                                                                                                                                                                                          |
| ------ | -------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/webhooks/razorpay` | HMAC (X-Razorpay-Signature) | Razorpay payment events. HMAC verified against raw body before any processing. Always returns 200 after HMAC verification to prevent Razorpay retries. Handles `payment.captured`, `payment.failed`. |

---

### SuperAdmin

All routes require `SUPER_ADMIN` role. No `templeId` scoping — these endpoints see all tenant data.

| Method | Path                                   | Auth              | Description                                                                          |
| ------ | -------------------------------------- | ----------------- | ------------------------------------------------------------------------------------ |
| GET    | `/superadmin/temples`                  | JWT + SUPER_ADMIN | All temples with plan, billing, and aggregate counts.                                |
| PATCH  | `/superadmin/temples/:id/suspend`      | JWT + SUPER_ADMIN | Suspend temple. Body: `{ reason? }`.                                                 |
| PATCH  | `/superadmin/temples/:id/activate`     | JWT + SUPER_ADMIN | Re-activate suspended temple.                                                        |
| POST   | `/superadmin/temples/:id/invite-admin` | JWT + SUPER_ADMIN | Create ADMIN user + return one-time invite token.                                    |
| POST   | `/superadmin/temples/:id/charge`       | JWT + SUPER_ADMIN | Create Razorpay payment link for subscription.                                       |
| POST   | `/superadmin/temples/:id/extend`       | JWT + SUPER_ADMIN | Manually extend plan validity.                                                       |
| GET    | `/superadmin/plans`                    | JWT + SUPER_ADMIN | All membership plans.                                                                |
| POST   | `/superadmin/plans`                    | JWT + SUPER_ADMIN | Create plan.                                                                         |
| PATCH  | `/superadmin/plans/:id`                | JWT + SUPER_ADMIN | Update plan.                                                                         |
| DELETE | `/superadmin/plans/:id`                | JWT + SUPER_ADMIN | Deactivate plan (soft).                                                              |
| GET    | `/superadmin/stats`                    | JWT + SUPER_ADMIN | Platform-wide metrics: temple count, total donations, total revenue, total devotees. |

---

### Health

| Method | Path      | Auth   | Description                                                        |
| ------ | --------- | ------ | ------------------------------------------------------------------ |
| GET    | `/health` | Public | Returns `{ status: "ok" }`. Used by load balancers and monitoring. |

---

## 5. Flow Diagrams

### 5.1 Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client (Admin SPA)
    participant A as API
    participant R as Redis
    participant DB as PostgreSQL

    C->>A: POST /auth/request-otp { phone }
    A->>R: Check rate limit (otp_req:{phone})
    R-->>A: OK (< 5 per hour)
    A->>A: Generate 6-digit OTP
    A->>DB: INSERT otp_sessions (phone, otp_hash=bcrypt(otp), expires_at)
    A-->>C: { sessionId, expiresAt }
    Note over A: OTP sent via WhatsApp/SMS queue (out-of-band)

    C->>A: POST /auth/verify-otp { sessionId, phone, otp }
    A->>DB: SELECT otp_sessions WHERE id=sessionId AND NOT is_used AND expires_at > NOW()
    A->>A: bcrypt.compare(otp, otp_hash)
    A->>DB: Mark is_used=true, find/verify user by phone
    A->>A: Sign RS256 JWT (15min) + generate opaque refresh token
    A->>DB: INSERT sessions (user_id, refresh_token_hash=bcrypt(token), expires_at)
    A-->>C: { accessToken, refreshToken, expiresIn, user }

    Note over C: Access token expires after 15 minutes
    C->>A: POST /auth/refresh { refreshToken }
    A->>A: Decode refresh token → extract userId
    A->>DB: SELECT sessions WHERE user_id=userId AND NOT is_revoked AND expires_at > NOW()
    A->>A: bcrypt.compare(refreshToken, each session hash)
    A->>A: Sign new RS256 JWT
    A-->>C: { accessToken, refreshToken, expiresIn }

    C->>A: POST /auth/logout { refreshToken }
    A->>DB: UPDATE sessions SET is_revoked=true WHERE user_id AND token matches
    A-->>C: { success: true }
```

### 5.2 Donation Flow

```mermaid
sequenceDiagram
    participant S as Staff (Admin SPA)
    participant A as API
    participant DB as PostgreSQL
    participant R as Redis
    participant Q as BullMQ
    participant P as Puppeteer Worker
    participant S3 as AWS S3
    participant G as Gupshup (WhatsApp)

    S->>A: POST /donations { donorName, amount, categoryId, mode, paymentDate }
    A->>A: Validate DTO, extract templeId from JWT
    A->>DB: BEGIN TRANSACTION
    A->>DB: INSERT donations (status=CONFIRMED)
    A->>DB: INSERT finance_ledger (type=INCOME, is_auto_posted=true)
    A->>R: INCR receipt_seq:{templeId}:{fiscalYear}
    R-->>A: seq = 42
    A->>DB: UPDATE donations SET receipt_number='RCPT-2025-26-0042'
    A->>DB: COMMIT
    A->>Q: Add job to receipt_generation queue { donationId }
    A-->>S: 201 Created { donation }

    Q->>P: Process receipt_generation job
    P->>DB: SELECT donation + temple details
    P->>P: Render HTML → PDF (Puppeteer)
    P->>S3: PUT receipt PDF → receipts/{templeId}/{fiscalYear}/{donationId}.pdf
    P->>DB: UPDATE donations SET receipt_pdf_s3_key, receipt_generated_at, status=RECEIPT_GENERATED
    P->>Q: Add job to whatsapp_outbound queue { donationId }

    Q->>A: Process whatsapp_outbound job
    A->>S3: Generate pre-signed URL (1hr TTL)
    A->>G: POST https://api.gupshup.io/sm/api/v1/msg (template: donation_receipt)
    G-->>A: messageId
    A->>DB: UPDATE donations SET receipt_sent_at, status=RECEIPT_SENT
```

**Online donation path (public portal):**

```mermaid
sequenceDiagram
    participant D as Devotee (Browser)
    participant A as API
    participant RZ as Razorpay
    participant DB as PostgreSQL
    participant Q as BullMQ

    D->>A: POST /public/:slug/donate/initiate { categoryId, donorName, amount }
    A->>DB: INSERT donations (status=PENDING, templeId from slug)
    A->>RZ: Create Razorpay order (amount in PAISE)
    RZ-->>A: { orderId, amount }
    A->>DB: UPDATE donations SET razorpay_order_id
    A-->>D: { razorpayOrderId, razorpayKeyId, amountInPaise, donationId }

    D->>RZ: Open Razorpay Checkout modal
    D->>RZ: Complete payment
    RZ->>A: POST /webhooks/razorpay (X-Razorpay-Signature)
    A->>A: HMAC-SHA256 verify (timingSafeEqual)
    A->>DB: Find donation by razorpay_order_id
    A->>DB: UPDATE donations SET status=CONFIRMED, razorpay_payment_id
    A->>DB: INSERT finance_ledger (auto-posted)
    A->>Q: Add receipt_generation job
    A-->>RZ: 200 OK { status: "ok" }
```

### 5.3 Seva Booking Flow

```mermaid
sequenceDiagram
    participant U as User (Staff or Public)
    participant A as API
    participant DB as PostgreSQL
    participant Q as BullMQ
    participant G as Gupshup

    U->>A: POST /sevas/bookings { sevaTypeId, sevaDate, timeSlot, tierName, amount }
    A->>DB: COUNT confirmed bookings for (sevaTypeId, sevaDate, timeSlot)
    DB-->>A: count < maxBookingsPerSlot
    A->>DB: INSERT seva_bookings -- CONFIRMED [cash] or PENDING_PAYMENT [online]
    A->>DB: INSERT finance_ledger type=INCOME, is_auto_posted=true [cash only]
    A->>Q: Add job to whatsapp_outbound { bookingId, template: seva_confirmation }
    A-->>U: 201 Created { sevaBooking }

    Q->>G: POST WhatsApp confirmation message
    G-->>Q: messageId
    Q->>DB: UPDATE seva_bookings SET confirmation_sent_at

    Note over A,G: Online booking uses Razorpay webhook same as donation flow
    Note over A,G: 24h before seva date, seva_reminder cron queues WhatsApp reminder
```

### 5.4 Webhook Flow

```mermaid
flowchart TD
    A[POST /webhooks/razorpay] --> B{Raw body available?}
    B -- No --> C[500 Internal Server Error]
    B -- Yes --> D[Compute HMAC-SHA256\nHMAC key=RAZORPAY_WEBHOOK_SECRET\nInput=raw body buffer]
    D --> E{timingSafeEqual\nsignature == expected?}
    E -- No --> F[401 Unauthorized\nLog warning]
    E -- Yes --> G[Return 200 immediately\nProcess event async]
    G --> H{event type?}
    H -- payment.captured --> I[Find donation/seva_booking\nby razorpay_order_id]
    I --> J{Already CONFIRMED?}
    J -- Yes --> K[Idempotent — skip]
    J -- No --> L[UPDATE status=CONFIRMED\nINSERT finance_ledger\nGenerate receipt number]
    L --> M[Queue receipt_generation job]
    H -- payment.failed --> N[UPDATE status=CANCELLED]
    H -- other --> O[Log and ignore]
```

---

## 6. Page-by-Page Feature Breakdown

### LoginPage

**Purpose:** Two-step passwordless authentication entry point.

**Key features:**

- Split desktop layout: saffron→gold gradient left panel + right card column
- Step 1: Phone number input (10-digit Indian mobile, validated before API call)
- Step 2: Six individual OTP digit boxes with auto-advance, backspace navigation, paste support, and shake animation on error
- `requestOtp` / `verifyOtp` mutations via TanStack Query
- After successful verify, navigates to `/dashboard` (temple roles) or `/superadmin` (SUPER_ADMIN)

**Roles with access:** Public (unauthenticated)

---

### DashboardPage

**Purpose:** At-a-glance operational overview for temple staff.

**Key features:**

- Four KPI cards (Today's Donations, Month-to-Date, Pending Sevas, Active Devotees) — left border accent stripe + icon pill layout
- Finance summary section (Income, Expense, Net Balance for current month) — colour-coded Net Balance
- Unified activity feed: last 5 items (donations + seva bookings); filter tabs (All / Donations / Sevas); avatar initials, formatted amounts, relative timestamps
- Quick-action pill buttons (New Donation → `/donations`, Book Seva → `/sevas`, Add Devotee → `/devotees`; desktop only)
- Data auto-refreshes every 60 seconds via TanStack Query `staleTime`

**Roles with access:** All authenticated roles

---

### DonationsPage

**Purpose:** Full donation ledger with inline creation modal.

**Key features:**

- Always-visible inline search input + collapsible filter panel (status, mode, category, date range, fiscal year) with active filter count badge
- Paginated table with sortable column headers; amount colour-coded by magnitude (≥₹10,000 gold, ≥₹5,000 saffron)
- 80G eligibility badge; receipt status badge via `Badge` component
- Create donation modal: donor phone lookup with 500ms debounce → auto-fill name from devotee record; section dividers ("Donor Details" / "Donation Details"); find-or-create devotee inline; no quick-amount chips (admin modal only)
- Resend receipt action per row

**Roles with access:** All authenticated roles (create/edit: ADMIN, COUNTER_STAFF, ACCOUNTANT)

---

### SevaBookingsPage

**Purpose:** Manage all seva reservations — list, day-sheet, and creation.

**Key features:**

- Tabbed view: list (paginated, filterable by date/status/type) and day-sheet (grouped by time slot)
- Booking creation modal: seva type selector, pricing tier cards, date picker, time slot pills, devotee phone lookup with find-or-create, optional sankalpa fields
- Cancel booking action with reason input
- Link devotee to existing booking

**Roles with access:** All authenticated roles (create: ADMIN, COUNTER_STAFF, ACCOUNTANT, HEAD_PRIEST)

---

### DevoteesPage

**Purpose:** Devotee CRM — browse and manage patron profiles.

**Key features:**

- Paginated list with search (name/phone), tier filter, city filter
- Detail drawer: full profile fields, computed donation stats (total donated, count, last donation date), last 10 donations list
- Create/update devotee form; PAN accepted and masked/encrypted at save

**Roles with access:** All authenticated roles (create/edit: ADMIN, COUNTER_STAFF, ACCOUNTANT)

---

### FinancePage

**Purpose:** Manual finance ledger — record income/expenses and view summaries.

**Key features:**

- Summary cards (total income, total expense, net balance) for a configurable date range
- Paginated ledger table with type/date/fund/category filters; auto-posted entries visually distinguished
- Manual entry form: type (INCOME/EXPENSE), category, fund, amount, description, date

**Roles with access:** All authenticated roles (create entries: ADMIN, ACCOUNTANT)

---

### ReportsPage

**Purpose:** Structured reports for accounting and compliance.

**Key features:**

- Four tabbed reports:
  1. **Donation Summary** — grand total, by mode, by category for a date range
  2. **Ledger Report** — income/expense breakdown by fund for a fiscal year
  3. **80G Report** — all eligible donations for a fiscal year; shows masked PAN
  4. **Day Sheet** — all donations + bookings for a selected date
- Fiscal year selector; date range pickers

**Roles with access:** All authenticated roles

---

### SettingsPage

**Purpose:** Temple configuration — categories, seva types, finance categories, web integration.

**Key features:**

- Donation categories CRUD — name, colour, 80G eligibility, fund routing
- Seva types CRUD — pricing tiers (jsonb), time slots (jsonb), availability days, sankalpa requirement, online bookability
- Finance categories CRUD — type (INCOME/EXPENSE), colour; system-seeded categories shown as read-only
- Temple profile section — name, address, PAN, 80G number, receipt prefix, UPI ID
- Web integration section — embeddable iframe snippet for the public portal

**Roles with access:** ADMIN (all sections); other roles see read-only views where applicable

---

### StaffPage

**Purpose:** Invite and manage temple staff members.

**Key features:**

- Staff list with role badges, active/inactive status, last login
- Invite modal — name, phone, role selector (excluding SUPER_ADMIN)
- Role change dropdown per staff member
- Deactivate action (cannot deactivate own account)

**Roles with access:** ADMIN (full); ACCOUNTANT (list only)

---

### SuperAdminPage

**Purpose:** Platform-level administration, visible only to SUPER_ADMIN role.

**Key features:**

- Temple list with plan, billing cycle, user count, donation count, active status
- Suspend / activate temple actions
- Invite temple admin (returns one-time invite token)
- Manually extend plan validity
- Membership plan CRUD
- Platform-wide stats (total temples, donations, revenue, devotees)

**Roles with access:** SUPER_ADMIN only

---

### PublicPortalPage + PublicDonateTab + PublicSevaTab

**Purpose:** Devotee-facing, iframe-embeddable donation and seva booking portal. No login required.

**Key features:**

- Saffron→gold gradient hero header with dot-grid decoration; temple initial in circular ring avatar
- Tab bar floats over hero bottom edge: Heart (Donate) + Sparkles (Book Seva) tabs with `role="tablist"` accessibility
- **Donate tab:** Horizontal scrollable chip row for category selection (≤6 categories); quick-amount chips (₹101, ₹501, ₹1001, ₹2100, ₹5100, ₹11000); custom amount input; WhatsApp icon on phone field; trust row (LockKeyhole · FileCheck · MessageCircle); animated pulsing `brand-primary` ring on success screen
- **Seva tab:** Seva type dropdown; pricing tier cards with `border-l-4` accent on selection; time slot pill chips; same trust row and animated success screen; sankalpa fields shown conditionally
- Razorpay checkout opened client-side; success state set in `handler` callback
- Dark mode follows `localStorage.theme` or system `prefers-color-scheme`

**Roles with access:** Public (unauthenticated devotees)

---

## 7. Local Development Setup

### Prerequisites

| Tool                    | Minimum Version                      |
| ----------------------- | ------------------------------------ |
| Node.js                 | 20.x                                 |
| pnpm                    | 8.x                                  |
| Docker + Docker Compose | Any recent version                   |
| Python 3                | 3.10+ (for ui-ux-pro-max skill only) |

### Step-by-Step

```bash
# 1. Clone the repository
git clone <repo-url> devaseva && cd devaseva

# 2. Install all dependencies (workspace-aware)
pnpm install

# 3. Start PostgreSQL and Redis
docker compose up -d

# 4. Copy environment files
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your values (see table below)

# 5. Run database migrations
pnpm db:migrate

# 6. Seed initial data (default temple + SUPER_ADMIN)
pnpm db:seed

# 7. Start the API (port 3001)
pnpm --filter api dev

# 8. Start the admin SPA (port 5173)
pnpm --filter admin dev
```

### Environment Variables

All variables belong in `apps/api/.env`. Required variables cause startup to fail via Joi validation.

| Variable                     | Required | Description                                                                                                         |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`               | Yes      | PostgreSQL connection string. e.g. `postgresql://devaseva:devaseva_dev@localhost:5432/devaseva_dev`                 |
| `REDIS_URL`                  | Yes      | Redis connection string. e.g. `redis://localhost:6379`                                                              |
| `JWT_PRIVATE_KEY`            | Yes      | RSA-2048 private key (PEM). Generate: `openssl genrsa -out private.pem 2048`                                        |
| `JWT_PUBLIC_KEY`             | Yes      | RSA-2048 public key (PEM). Generate: `openssl rsa -in private.pem -pubout -out public.pem`                          |
| `ENCRYPTION_KEY`             | Yes      | 64-char hex string (32 bytes). Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `RAZORPAY_WEBHOOK_SECRET`    | Yes      | Webhook secret from Razorpay dashboard                                                                              |
| `ADMIN_URL`                  | No       | Admin SPA origin. Default: `http://localhost:5173`                                                                  |
| `WEB_URL`                    | No       | Public web origin. Default: `http://localhost:5173`                                                                 |
| `NODE_ENV`                   | No       | `development` \| `production` \| `test`. Default: `development`                                                     |
| `PORT`                       | No       | API listen port. Default: `3001`                                                                                    |
| `JWT_ACCESS_EXPIRY`          | No       | Access token TTL in seconds. Default: `900` (15 min)                                                                |
| `JWT_REFRESH_EXPIRY`         | No       | Refresh token TTL in seconds. Default: `2592000` (30 days)                                                          |
| `RAZORPAY_KEY_ID`            | No       | Razorpay API key ID                                                                                                 |
| `RAZORPAY_KEY_SECRET`        | No       | Razorpay API key secret                                                                                             |
| `GUPSHUP_API_KEY`            | No       | Gupshup BSP API key                                                                                                 |
| `GUPSHUP_APP_NAME`           | No       | Gupshup WhatsApp app name                                                                                           |
| `GUPSHUP_WHATSAPP_NUMBER`    | No       | Sender WhatsApp number (91XXXXXXXXXX)                                                                               |
| `GUPSHUP_WEBHOOK_SECRET`     | No       | Gupshup HMAC webhook secret                                                                                         |
| `AWS_REGION`                 | No       | S3/SES region. Default: `ap-south-1`                                                                                |
| `AWS_ACCESS_KEY_ID`          | No       | AWS credentials                                                                                                     |
| `AWS_SECRET_ACCESS_KEY`      | No       | AWS credentials                                                                                                     |
| `S3_BUCKET_RECEIPTS`         | No       | S3 bucket for receipt PDFs                                                                                          |
| `S3_BUCKET_MEDIA`            | No       | S3 bucket for logos, banners, photos                                                                                |
| `SES_FROM_EMAIL`             | No       | SES verified sender address                                                                                         |
| `OTP_EXPIRY_SECONDS`         | No       | OTP session TTL. Default: `600`                                                                                     |
| `OTP_MAX_ATTEMPTS`           | No       | Max failed OTP attempts. Default: `3`                                                                               |
| `OTP_RATE_LIMIT_PER_HOUR`    | No       | OTP requests per phone per hour. Default: `5`                                                                       |
| `EXPENSE_APPROVAL_THRESHOLD` | No       | Expenses above this amount (INR) require trustee approval. Default: `5000`                                          |

### Running Migrations

```bash
# Run all pending migrations
pnpm db:migrate

# Generate a new migration from entity changes
pnpm --filter api run migration:generate -- src/database/migrations/NewMigrationName

# Revert last migration
pnpm --filter api run migration:revert
```

### Seeding Data

```bash
# Creates a default temple and a SUPER_ADMIN user
pnpm db:seed
```

The seed script prints the SUPER_ADMIN's phone number and a one-time OTP to stdout. Use these to complete the first login.

### OTP in Development

In `NODE_ENV=development`, the generated OTP is written to `apps/api/otp-dev.txt` and also printed to the API console log. This avoids needing WhatsApp/SMS credentials for local development.

```bash
# Watch the OTP in real-time during development
tail -f apps/api/otp-dev.txt
```

### Running Tests

```bash
# All tests (API unit + integration)
pnpm test

# API only with coverage report
pnpm --filter api run test:cov

# Watch mode during development
pnpm --filter api run test -- --watch
```

---

_DevaSeva — Infosware Pvt. Ltd._
_Built to serve. Designed to scale._
