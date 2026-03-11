# DevaSeva — CLAUDE.md

> This file is the **single source of truth** for building the DevaSeva project with Claude Code.
> Read it completely before starting any work. Follow it exactly.

---

## 1. What This Project Is

**DevaSeva (देव सेवा)** is a multi-tenant SaaS platform for Indian temples.
It replaces paper donation ledgers, manual seva registers, and WhatsApp receipts with a unified system.

**The single most important workflow:**
> A counter staff member records a ₹5,100 cash donation → devotee gets an 80G-compliant PDF receipt on WhatsApp in under 30 seconds. No manual steps.

**Three apps in one monorepo:**
| App | Who uses it | Tech |
|---|---|---|
| `apps/api` | Backend for all apps | NestJS + TypeScript + PostgreSQL |
| `apps/admin` | Temple staff dashboard | React 18 + Vite |
| `apps/web` | Public donation pages (SEO) | Next.js 14 App Router |
| `apps/mobile` | Devotees on their phones | React Native + Expo |

**This is a financial platform.** It handles real money, PAN numbers, and legally required tax documents. Every decision about security, data integrity, and error handling must reflect that weight.

---

## 2. Session Protocol — How Claude Code Should Work

**At the start of every session:**
1. Re-read CLAUDE.md sections relevant to the current task
2. Check `BUILD_ORDER.md` to understand where we are in the build
3. Before writing any code, state: "I am building [module]. The relevant rules are [X, Y, Z]."
4. Never assume context from a previous session — always verify current state

**Before writing any file:**
- Check if the type/interface already exists in `packages/types/`
- Check if a similar pattern already exists in another module
- Confirm the DB schema in Section 7 before creating an entity
- Confirm the API spec in Section 8 before creating a controller

**When you make a decision not covered here:**
- State the decision explicitly: "I'm choosing X because Y"
- If financial logic is involved, add a comment in code explaining the reasoning
- If security is involved, add a comment explaining the threat model

**When you hit an error:**
- Fix the root cause, never suppress the error
- If TypeScript strict mode rejects something, fix the types — don't use `any` or `as`
- If a test fails, fix the code — don't change the test to match wrong behavior

---

## 3. First-Time Bootstrap — Run These Exactly

```bash
# ── Prerequisites ────────────────────────────────────────────────
# node >= 20, pnpm >= 8, docker, docker-compose

# ── 1. Create monorepo root ──────────────────────────────────────
mkdir devaseva && cd devaseva
git init

# ── 2. Root package.json ─────────────────────────────────────────
cat > package.json << 'EOF'
{
  "name": "devaseva",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "db:migrate": "pnpm --filter api run migration:run",
    "db:seed": "pnpm --filter api run seed"
  },
  "devDependencies": {
    "turbo": "^1.13.0",
    "typescript": "^5.4.0",
    "@types/node": "^20.0.0",
    "prettier": "^3.2.0",
    "eslint": "^8.57.0"
  }
}
EOF

# ── 3. PNPM workspace ────────────────────────────────────────────
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# ── 4. Turborepo config ──────────────────────────────────────────
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "test": { "dependsOn": ["^build"] },
    "lint": {}
  }
}
EOF

# ── 5. Docker Compose (local dev) ───────────────────────────────
cat > docker-compose.yml << 'EOF'
version: '3.9'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: devaseva
      POSTGRES_PASSWORD: devaseva_dev
      POSTGRES_DB: devaseva_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  postgres_test:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: devaseva
      POSTGRES_PASSWORD: devaseva_dev
      POSTGRES_DB: devaseva_test
    ports:
      - "5433:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
EOF

# ── 6. .gitignore ────────────────────────────────────────────────
cat > .gitignore << 'EOF'
node_modules
dist
.turbo
.env
.env.local
*.env
coverage
.next
EOF

# ── 7. Install dependencies & start services ─────────────────────
pnpm install
docker-compose up -d

# ── 8. Bootstrap NestJS API ──────────────────────────────────────
mkdir -p apps
cd apps
npx @nestjs/cli new api --package-manager pnpm --skip-git
cd api
pnpm add @nestjs/typeorm typeorm pg
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add @nestjs/bull bull bullmq ioredis
pnpm add @nestjs/config class-validator class-transformer
pnpm add @nestjs/schedule
pnpm add bcrypt argon2
pnpm add razorpay
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/client-ses
pnpm add puppeteer
pnpm add axios
pnpm add -D @types/bcrypt @types/passport-jwt supertest @types/supertest

# ── 9. Bootstrap React Admin App ─────────────────────────────────
cd ..
pnpm create vite admin -- --template react-ts
cd admin
pnpm add @tanstack/react-query @tanstack/react-router
pnpm add zustand
pnpm add axios
pnpm add framer-motion
pnpm add recharts
pnpm add react-hook-form @hookform/resolvers zod
pnpm add tailwindcss postcss autoprefixer
pnpm add -D @types/react @types/react-dom
npx tailwindcss init -p

# ── 10. Bootstrap Next.js Web App ───────────────────────────────
cd ..
npx create-next-app@14 web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# ── 11. Bootstrap React Native Mobile App ───────────────────────
cd ..
npx create-expo-app mobile --template expo-template-blank-typescript
cd mobile
npx expo install expo-router react-native-safe-area-context react-native-screens
pnpm add @tanstack/react-query zustand axios

# ── 12. Bootstrap shared packages ───────────────────────────────
cd ../..
mkdir -p packages/types/src packages/utils/src packages/ui/src

# Copy this CLAUDE.md to project root (if not already there)
# You should already be in /devaseva root at this point
```

**After bootstrap, verify everything runs:**
```bash
# Should start all 4 processes:
pnpm dev

# API health check:
curl http://localhost:3001/health

# Run all tests (should pass even with empty test files):
pnpm test
```

---

## 4. Tech Stack — Locked. Do Not Change Without Explicit Instruction.

| Layer | Package | Version | Notes |
|---|---|---|---|
| API Framework | NestJS | 10.x | Never switch to Fastify — decorator patterns rely on Express |
| ORM | TypeORM | 0.3.x | Not Prisma. TypeORM entity classes match DB schema exactly |
| Database | PostgreSQL | 15 | Never use SQLite even for tests — use the test DB |
| Cache + Queue | Redis + BullMQ | 7 + 5 | Not Celery, not AWS SQS |
| Admin SPA | React 18 + Vite | | Not Next.js for admin — pure SPA, no SSR needed |
| Server State | TanStack Query v5 | | Not SWR, not Redux |
| UI State | Zustand v4 | | For auth store, UI store only. Not for server data |
| Public Pages | Next.js 14 App Router | | SSR for SEO + Razorpay checkout |
| Mobile | React Native + Expo | 0.73 / 50 | Not Flutter, not Capacitor |
| Styling | Tailwind CSS 3 | | Design tokens in Section 10 |
| Animations | Framer Motion 11 | | Admin + Web only. React Native uses Reanimated |
| Charts | Recharts 2 | | Admin only |
| Payments | Razorpay Node SDK | | |
| WhatsApp | Gupshup BSP REST API | | Direct HTTP calls — no SDK |
| SMS | Textlocal REST API | | Direct HTTP calls |
| Email | AWS SES SDK v3 | | |
| Storage | AWS S3 SDK v3 | | ap-south-1 region only |
| PDF | Puppeteer 21 | | Headless Chrome, server-side only |
| Auth | Passwordless OTP → JWT RS256 | | No passwords anywhere |
| Testing | Jest + Supertest + Playwright | | |
| Monorepo | Turborepo + PNPM | 1 + 8 | |

---

## 5. Non-Negotiable Rules

These are hard constraints. If any rule conflicts with a user request, follow the rule and explain why.

### 5.1 TypeScript
```
✗ NEVER use `any`. Use `unknown` and type-narrow it.
✗ NEVER use non-null assertion `!` without a preceding null check.
✗ NEVER leave a function without an explicit return type.
✗ NEVER import from apps/ into packages/ — packages must be self-contained.
✓ Strict mode ON in every tsconfig.json
✓ All DTO fields have class-validator decorators
✓ Enums live in packages/types/src/enums.ts — never re-define locally
```

### 5.2 Multi-Tenancy (The Most Important Backend Rule)
```
✗ NEVER write a query on a tenant-scoped table without WHERE temple_id = templeId.
✗ NEVER take templeId from the request body or query params.
✓ templeId ALWAYS comes from req.user.templeId (decoded from JWT).
✓ Every service method that queries tenant data takes templeId as a parameter.
✓ TenantMiddleware attaches templeId to every request — use it.

Pattern for every service method:
  async findDonations(templeId: string, filters: FilterDto): Promise<Donation[]> {
    return this.donationRepo.find({ where: { templeId, ...filters } });
  }
  // NOT: find({ where: { id } }) ← Missing templeId = cross-tenant data leak
```

### 5.3 Financial Data
```
✗ NEVER use float or number for money in the database. Use decimal(12,2) or decimal(14,2).
✗ NEVER store a running balance on funds table — calculate live from ledger.
✗ NEVER hard-delete a donation, ledger entry, or receipt.
✗ NEVER UPDATE a finance_ledger or audit_log row — they are append-only.
✓ Amounts sent to Razorpay are in PAISE. Multiply decimal by 100. Always.
✓ Receipt numbers are generated via Redis INCR — atomic, never collide.
✓ Every confirmed financial action creates a matching finance_ledger row.
✓ fiscal_year format is '2025-26' — always derive from payment_date, never user input.
```

### 5.4 Security
```
✗ NEVER store raw OTP codes. Store bcrypt(otp, 10) hash only.
✗ NEVER store PAN numbers in plaintext. Encrypt with AES-256-GCM. Key from env.
✗ NEVER return S3 URLs — generate pre-signed URLs (1hr TTL) at serve time.
✗ NEVER trust userId or templeId from the client request body on /auth/refresh.
   Extract them from the refresh token on the server side.
✗ NEVER skip Razorpay webhook HMAC-SHA256 verification. Reject if invalid.
✗ NEVER skip Gupshup webhook HMAC verification.
✗ NEVER set CORS to '*' in production.
✗ NEVER log a PAN number, full bank details, or raw OTP — even at debug level.
✓ Rate limit /auth/request-otp: max 5 per phone per hour (Redis key: otp_req:{phone})
✓ Rate limit /auth/verify-otp: max 3 attempts per otp_session, then lock
✓ CSP headers on all web responses
✓ Audit log on all CREATE / UPDATE / DELETE of financial records
```

### 5.5 API Shape
```
✓ All endpoints: /api/v1/...
✓ All list endpoints have pagination — default limit=20, max=100
✓ Success response:  { success: true, data: T, requestId: string }
✓ Error response:    { success: false, error: { code: string, message: string }, requestId: string }
✓ JSON payload field names: camelCase (donorName, sevaTypeId)
✓ Database column names: snake_case (donor_name, seva_type_id)
✓ HTTP status codes: 200 GET/PATCH, 201 POST, 204 DELETE,
                     400 validation, 401 unauthenticated, 403 unauthorized,
                     404 not found, 409 conflict, 422 business logic,
                     429 rate limited, 500 server
```

### 5.6 Code Style
```
✓ File names: kebab-case     (donation.service.ts, seva-booking.entity.ts)
✓ Class names: PascalCase    (DonationService, SevaBookingEntity)
✓ Variable names: camelCase  (templeId, donorName)
✓ Constants: SCREAMING_SNAKE (MAX_OTP_ATTEMPTS)
✓ No console.log in production code — use NestJS Logger('ServiceName')
✓ Every exported function/method has a JSDoc comment
✓ Magic numbers go in a constants.ts file with a named const
```

---

## 6. Code Patterns — Copy These Exactly

These are the patterns for the project. Every module follows them. Do not invent new patterns.

### 6.1 TypeORM Base Entities

```typescript
// packages/types/src/base.entity.ts
import {
  PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn,
  DeleteDateColumn, Column, Index
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}

export abstract class TenantBaseEntity extends BaseEntity {
  @Index()
  @Column({ name: 'temple_id', type: 'uuid' })
  templeId: string;
}
```

### 6.2 Full Entity Example (copy this pattern for every entity)

```typescript
// apps/api/src/database/entities/donation.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TenantBaseEntity } from './base.entity';
import { DonationMode, DonationStatus } from '@devaseva/types';

@Entity('donations')
@Index(['templeId', 'paymentDate'])
@Index(['templeId', 'fiscalYear'])
@Index(['templeId', 'status'])
export class Donation extends TenantBaseEntity {
  @Column({ name: 'receipt_number', type: 'varchar', length: 50, nullable: true, unique: false })
  receiptNumber?: string;

  @Column({ name: 'donor_name', type: 'varchar', length: 200 })
  donorName: string;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2 })
  amount: string; // ← TypeORM returns decimal as string. Parse with parseFloat() when needed.

  @Column({ name: 'mode', type: 'enum', enum: DonationMode })
  mode: DonationMode;

  @Column({ name: 'status', type: 'enum', enum: DonationStatus, default: DonationStatus.PENDING })
  status: DonationStatus;

  @Column({ name: 'is_80g_eligible', type: 'boolean', default: false })
  is80gEligible: boolean;

  @Column({ name: 'donor_pan_encrypted', type: 'varchar', nullable: true })
  donorPanEncrypted?: string; // AES-256-GCM — NEVER store raw PAN

  @Column({ name: 'donor_pan_masked', type: 'varchar', length: 12, nullable: true })
  donorPanMasked?: string; // ABCXX1234X — safe for display

  @Column({ name: 'fiscal_year', type: 'varchar', length: 10 })
  fiscalYear: string; // '2025-26'

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: Date;

  @Column({ name: 'receipt_pdf_s3_key', type: 'varchar', nullable: true })
  receiptPdfS3Key?: string; // S3 key only — generate pre-signed URL at serve time
}
```

### 6.3 DTO Pattern (class-validator)

```typescript
// apps/api/src/modules/donations/dto/create-donation.dto.ts
import {
  IsString, IsNotEmpty, IsNumber, IsPositive, IsEnum,
  IsOptional, IsBoolean, IsDateString, IsUUID,
  MaxLength, Matches, Min
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DonationMode } from '@devaseva/types';

export class CreateDonationDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  donorName: string;

  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Phone must be a valid 10-digit Indian mobile number' })
  donorPhone?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  amount: number;

  @IsEnum(DonationMode)
  mode: DonationMode;

  @IsOptional()
  @IsString()
  pan?: string; // Will be validated and encrypted in service

  @IsDateString()
  paymentDate: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean = false;

  @IsOptional()
  @IsUUID()
  devoteeId?: string;
}
```

### 6.4 Service Pattern (the most important pattern)

```typescript
// apps/api/src/modules/donations/donations.service.ts
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Logger } from '@nestjs/common';

@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);

  constructor(
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(FinanceLedger)
    private readonly ledgerRepo: Repository<FinanceLedger>,
    @InjectQueue('receipt_generation')
    private readonly receiptQueue: Queue,
    private readonly encryptionUtil: EncryptionUtil,
    private readonly fiscalYearUtil: FiscalYearUtil,
    private readonly receiptNumberUtil: ReceiptNumberUtil,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a new donation and auto-posts to finance ledger.
   * Uses a DB transaction to ensure both inserts succeed or neither does.
   */
  async create(templeId: string, dto: CreateDonationDto, recordedBy: string): Promise<Donation> {
    // Use a transaction — donation + ledger entry must be atomic
    return this.dataSource.transaction(async (manager) => {
      const fiscalYear = this.fiscalYearUtil.fromDate(new Date(dto.paymentDate));

      // Encrypt PAN before storing
      let panEncrypted: string | undefined;
      let panMasked: string | undefined;
      if (dto.pan) {
        if (!this.isValidPan(dto.pan)) {
          throw new UnprocessableEntityException('Invalid PAN format');
        }
        panEncrypted = this.encryptionUtil.encrypt(dto.pan);
        panMasked = this.maskPan(dto.pan);
      }

      const donation = manager.create(Donation, {
        templeId,                          // ← Always from JWT, never from dto
        categoryId: dto.categoryId,
        donorName: dto.donorName,
        donorPhone: dto.donorPhone,
        amount: dto.amount.toFixed(2),     // ← Store as string for decimal precision
        mode: dto.mode,
        status: DonationStatus.CONFIRMED,
        donorPanEncrypted: panEncrypted,
        donorPanMasked: panMasked,
        is80gEligible: await this.checkEligibility(templeId, dto.categoryId, dto.amount),
        paymentDate: new Date(dto.paymentDate),
        fiscalYear,
        recordedBy,
      });

      const savedDonation = await manager.save(donation);

      // Auto-post to finance ledger (append-only — no updates ever)
      const ledgerEntry = manager.create(FinanceLedger, {
        templeId,
        type: LedgerType.INCOME,
        amount: dto.amount.toFixed(2),
        entryDate: new Date(dto.paymentDate),
        description: `Donation — ${dto.donorName}`,
        donationId: savedDonation.id,
        isAutoPosted: true,
        fiscalYear,
        recordedBy,
      });
      await manager.save(ledgerEntry);

      // Generate receipt number atomically via Redis INCR
      savedDonation.receiptNumber = await this.receiptNumberUtil.next(templeId, fiscalYear);
      await manager.save(savedDonation);

      // Queue receipt PDF generation (async — don't wait)
      await this.receiptQueue.add('generate', { donationId: savedDonation.id }, { priority: 1 });

      this.logger.log(`Donation ${savedDonation.id} created for temple ${templeId}`);
      return savedDonation;
    });
  }

  /**
   * Lists donations for a temple with pagination.
   * templeId is always required — never query without it.
   */
  async findAll(templeId: string, query: ListDonationsQueryDto): Promise<PaginatedResult<Donation>> {
    const { page = 1, limit = 20, fromDate, toDate, status, mode } = query;
    const safeLimitValue = Math.min(limit, 100); // Hard cap at 100

    const qb = this.donationRepo
      .createQueryBuilder('d')
      .where('d.temple_id = :templeId', { templeId }) // ← templeId guard is mandatory
      .andWhere('d.deleted_at IS NULL')
      .orderBy('d.payment_date', 'DESC')
      .skip((page - 1) * safeLimitValue)
      .take(safeLimitValue);

    if (fromDate) qb.andWhere('d.payment_date >= :fromDate', { fromDate });
    if (toDate)   qb.andWhere('d.payment_date <= :toDate', { toDate });
    if (status)   qb.andWhere('d.status = :status', { status });
    if (mode)     qb.andWhere('d.mode = :mode', { mode });

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { page, limit: safeLimitValue, total, totalPages: Math.ceil(total / safeLimitValue) } };
  }
}
```

### 6.5 Controller Pattern (thin — just delegates)

```typescript
// apps/api/src/modules/donations/donations.controller.ts
import { Controller, Get, Post, Body, Param, Query, Delete, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@devaseva/types';

@Controller('donations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.COUNTER_STAFF, UserRole.ACCOUNTANT)
  async create(
    @CurrentUser() user: JwtPayload,     // templeId lives here
    @Body() dto: CreateDonationDto,
  ) {
    // Controller never contains business logic — just passes to service
    const donation = await this.donationsService.create(user.templeId, dto, user.sub);
    return donation; // ResponseInterceptor wraps in { success: true, data: ..., requestId: ... }
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListDonationsQueryDto,
  ) {
    return this.donationsService.findAll(user.templeId, query);
  }
}
```

### 6.6 BullMQ Job Processor Pattern

```typescript
// apps/api/src/queues/receipt-generation/receipt-generation.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

@Processor('receipt_generation')
export class ReceiptGenerationProcessor {
  private readonly logger = new Logger(ReceiptGenerationProcessor.name);

  constructor(
    private readonly pdfService: PdfService,
    private readonly s3Service: S3Service,
    private readonly donationsService: DonationsService,
    private readonly whatsappQueue: Queue,
  ) {}

  @Process('generate')
  async handleGenerate(job: Job<{ donationId: string }>): Promise<void> {
    const { donationId } = job.data;
    this.logger.log(`Generating receipt for donation ${donationId}`);

    try {
      const donation = await this.donationsService.findById(donationId);
      if (!donation) throw new Error(`Donation ${donationId} not found`);

      // Generate PDF from HTML template
      const pdfBuffer = await this.pdfService.renderReceipt(donation);

      // Upload to private S3 bucket — store KEY not URL
      const s3Key = `receipts/${donation.templeId}/${donation.fiscalYear}/${donationId}.pdf`;
      await this.s3Service.upload(s3Key, pdfBuffer, 'application/pdf');

      // Update donation record
      await this.donationsService.markReceiptGenerated(donationId, s3Key);

      // Queue WhatsApp delivery
      if (donation.donorPhone && !donation.devotee?.whatsappOptedOut) {
        await this.whatsappQueue.add('send', {
          phone: donation.donorPhone,
          template: 'donation_receipt',
          variables: {
            donorName: donation.donorName,
            amount: donation.amount,
            receiptNumber: donation.receiptNumber,
            receiptUrl: '', // Pre-signed URL generated just before send
          },
          donationId,
        }, { priority: 2, attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
      }
    } catch (error) {
      this.logger.error(`Receipt generation failed for ${donationId}:`, error);
      throw error; // Re-throw so BullMQ can retry
    }
  }
}
```

### 6.7 Razorpay Webhook Pattern (NEVER skip HMAC)

```typescript
// apps/api/src/modules/webhooks/razorpay-webhook.service.ts
import * as crypto from 'crypto';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';

@Injectable()
export class RazorpayWebhookService {
  private readonly logger = new Logger(RazorpayWebhookService.name);

  /**
   * MUST be called before processing any webhook.
   * An attacker who can POST fake payment.captured events gets free donations.
   */
  verifySignature(rawBody: Buffer, signature: string): void {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest('hex');

    // Use timingSafeEqual to prevent timing attacks
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      this.logger.warn('Razorpay webhook signature mismatch — possible attack');
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  async handlePaymentCaptured(payload: RazorpayPayload): Promise<void> {
    const { order_id, id: paymentId, amount } = payload.payload.payment.entity;

    // Idempotency — check if we already processed this payment
    const existing = await this.donationsService.findByRazorpayOrderId(order_id);
    if (!existing) {
      this.logger.warn(`Payment captured for unknown order ${order_id}`);
      return; // Don't throw — return 200 to Razorpay so it stops retrying
    }
    if (existing.status === DonationStatus.CONFIRMED) {
      this.logger.log(`Duplicate webhook for order ${order_id} — ignoring`);
      return; // Already processed — idempotent
    }

    await this.donationsService.confirmOnlinePayment(existing.id, paymentId);
  }
}

// Controller — uses raw body for HMAC
@Controller('webhooks')
export class WebhooksController {
  @Post('razorpay')
  @HttpCode(200) // Always return 200 to Razorpay after logging — don't let it retry on auth errors
  async razorpay(
    @RawBody() rawBody: Buffer,           // Must configure to receive raw buffer
    @Headers('x-razorpay-signature') sig: string,
    @Body() body: RazorpayWebhookDto,
  ) {
    this.razorpayWebhookService.verifySignature(rawBody, sig);
    await this.razorpayWebhookService.handle(body);
    return { status: 'ok' };
  }
}
```

### 6.8 Encryption Utility (PAN numbers)

```typescript
// apps/api/src/common/utils/encryption.util.ts
import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EncryptionUtil {
  private readonly key: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 16;

  constructor(private readonly config: ConfigService) {
    const keyHex = this.config.getOrThrow<string>('ENCRYPTION_KEY');
    this.key = Buffer.from(keyHex, 'hex'); // Must be 32 bytes
  }

  /**
   * Encrypts a PAN number for database storage.
   * Returns: iv:authTag:ciphertext (all hex, colon-separated)
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypts a stored PAN for 80G receipt generation only.
   * NEVER log the result.
   */
  decrypt(stored: string): string {
    const [ivHex, authTagHex, ciphertextHex] = stored.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
  }
}
```

### 6.9 Receipt Number Generator (atomic via Redis)

```typescript
// apps/api/src/common/utils/receipt-number.util.ts
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class ReceiptNumberUtil {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Returns next receipt number for a temple in a fiscal year.
   * Atomic via Redis INCR — safe under concurrent requests.
   * Format: RCPT-2025-26-0001
   */
  async next(templeId: string, fiscalYear: string, prefix = 'RCPT'): Promise<string> {
    const key = `receipt_seq:${templeId}:${fiscalYear}`;
    const seq = await this.redis.incr(key);
    // Set 2-year expiry on first call (seq === 1)
    if (seq === 1) await this.redis.expire(key, 60 * 60 * 24 * 730);
    return `${prefix}-${fiscalYear}-${String(seq).padStart(4, '0')}`;
  }
}
```

### 6.10 TanStack Query Hook Pattern (Frontend)

```typescript
// apps/admin/src/api/donations.api.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// Query keys — always use arrays for cache invalidation
export const donationKeys = {
  all: ['donations'] as const,
  list: (filters: DonationFilters) => ['donations', 'list', filters] as const,
  detail: (id: string) => ['donations', 'detail', id] as const,
};

export function useDonations(filters: DonationFilters) {
  return useQuery({
    queryKey: donationKeys.list(filters),
    queryFn: () => apiClient.get<PaginatedResult<Donation>>('/donations', { params: filters }),
    staleTime: 30_000, // 30 seconds — donation lists are relatively stable
  });
}

export function useCreateDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateDonationDto) =>
      apiClient.post<Donation>('/donations', dto),
    onSuccess: () => {
      // Invalidate all donation lists — they need to refresh
      queryClient.invalidateQueries({ queryKey: donationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
    },
  });
}
```

---

## 7. Complete Database Schema

**Every entity must match this schema exactly. Column names are snake_case in the DB.**

### Tenant Scoping
Every table except `temples`, `otp_sessions` inherits `temple_id uuid NOT NULL`.
This column is the security boundary. Never query without it.

### Table: temples
```sql
id                    uuid PK DEFAULT gen_random_uuid()
name                  varchar(200) NOT NULL
slug                  varchar(100) UNIQUE NOT NULL
category              ENUM('HINDU','JAIN','SIKH','BUDDHIST','CHRISTIAN','OTHER')
description           text
logo_url              varchar         -- S3 key only
banner_url            varchar         -- S3 key only
address_line1         varchar
address_line2         varchar
city                  varchar
state                 varchar
pin_code              varchar(6)
phone_primary         varchar(15)
phone_whatsapp        varchar(15)
email                 varchar
website_url           varchar
pan_number            varchar         -- Temple PAN (not encrypted — public info)
trust_reg_number      varchar
number_80g            varchar         -- Column name: number_80g
number_80g_expiry     date
is_80g_registered     boolean DEFAULT false
fcra_number           varchar
receipt_prefix        varchar(20) DEFAULT 'RCPT'
upi_id                varchar
razorpay_key_id       varchar
razorpay_key_secret   varchar         -- Encrypted at rest
plan                  ENUM('STARTER','GROWTH','ENTERPRISE') DEFAULT 'STARTER'
plan_valid_until      timestamptz
is_active             boolean DEFAULT true
onboarding_completed_at timestamptz
settings              jsonb DEFAULT '{}'
timezone              varchar DEFAULT 'Asia/Kolkata'
primary_language      varchar(5) DEFAULT 'hi'
created_at            timestamptz DEFAULT NOW()
updated_at            timestamptz
deleted_at            timestamptz
```

### Table: users
```sql
id, created_at, updated_at, deleted_at
temple_id             uuid NOT NULL
phone                 varchar(15) NOT NULL
                      UNIQUE (temple_id, phone)
full_name             varchar(200) NOT NULL
email                 varchar
profile_photo_url     varchar         -- S3 key
role                  ENUM('SUPER_ADMIN','ADMIN','ACCOUNTANT','COUNTER_STAFF',
                           'INVENTORY_MANAGER','HEAD_PRIEST','PRIEST','TRUSTEE')
is_active             boolean DEFAULT true
last_login_at         timestamptz
invited_by            uuid REFERENCES users(id)
invite_token          varchar         -- One-time token, 48h TTL
invite_accepted_at    timestamptz
preferred_language    varchar(5) DEFAULT 'hi'
permissions           jsonb DEFAULT '{}'
INDEX (temple_id)
```

### Table: otp_sessions
```sql
id                    uuid PK
phone                 varchar(15) NOT NULL
otp_hash              varchar NOT NULL    -- bcrypt(otp, 10). NEVER raw OTP.
purpose               ENUM('LOGIN','INVITE_ACCEPT') DEFAULT 'LOGIN'
expires_at            timestamptz NOT NULL
attempts              integer DEFAULT 0   -- Lock at 3
is_used               boolean DEFAULT false
ip_address            varchar
created_at            timestamptz DEFAULT NOW()
INDEX (phone, is_used, expires_at)
```

### Table: sessions
```sql
id                    uuid PK
user_id               uuid NOT NULL REFERENCES users(id)
temple_id             uuid NOT NULL       -- Denormalized for fast lookup
refresh_token_hash    varchar NOT NULL    -- bcrypt of the token
device_info           varchar
ip_address            varchar
expires_at            timestamptz NOT NULL
is_revoked            boolean DEFAULT false
last_used_at          timestamptz
created_at, updated_at
INDEX (user_id, is_revoked)
```

### Table: devotees
```sql
id, created_at, updated_at, deleted_at, temple_id
name                  varchar(200) NOT NULL
phone                 varchar(15) NOT NULL
email                 varchar
gender                ENUM('MALE','FEMALE','OTHER')
date_of_birth         date
anniversary_date      date
pan_number_encrypted  varchar             -- AES-256-GCM
pan_number_masked     varchar(12)         -- ABCXX1234X
address_line1         varchar
city                  varchar
state                 varchar
pin_code              varchar(6)
gotra                 varchar(100)
nakshatra             varchar(50)
rashi                 varchar(50)
tier                  ENUM('REGULAR','PATRON','VIP','LIFE_TRUSTEE') DEFAULT 'REGULAR'
family_head_id        uuid REFERENCES devotees(id)
total_donation_amount decimal(14,2) DEFAULT 0   -- Denormalized, update on donation
donation_count        integer DEFAULT 0          -- Denormalized
last_donation_at      timestamptz
seva_count            integer DEFAULT 0          -- Denormalized
whatsapp_opted_out    boolean DEFAULT false
sms_opted_out         boolean DEFAULT false
photo_url             varchar                    -- S3 key
member_since          date
notes                 text
referred_by           uuid REFERENCES devotees(id)
UNIQUE (temple_id, phone)
INDEX (temple_id, phone)
```

### Table: donation_categories
```sql
id, created_at, updated_at, deleted_at, temple_id
name                  varchar(200) NOT NULL
description           text
is_80g_eligible       boolean DEFAULT false
is_active             boolean DEFAULT true
sort_order            integer DEFAULT 0
color                 varchar(7) DEFAULT '#E8530A'
fund_id               uuid REFERENCES funds(id)
```

### Table: donations
```sql
id, created_at, updated_at, deleted_at, temple_id
receipt_number        varchar(50)
                      UNIQUE (temple_id, receipt_number) WHERE receipt_number IS NOT NULL
devotee_id            uuid REFERENCES devotees(id)
category_id           uuid NOT NULL REFERENCES donation_categories(id)
donor_name            varchar(200) NOT NULL
donor_phone           varchar(15)
donor_pan_encrypted   varchar                    -- AES-256-GCM
donor_pan_masked      varchar(12)
amount                decimal(12,2) NOT NULL
mode                  ENUM('CASH','UPI','CARD','CHEQUE','NEFT','DD','ONLINE')
status                ENUM('PENDING','CONFIRMED','RECEIPT_GENERATED','RECEIPT_SENT','CANCELLED')
is_80g_eligible       boolean DEFAULT false
is_anonymous          boolean DEFAULT false
razorpay_order_id     varchar
razorpay_payment_id   varchar
payment_reference     varchar                    -- UPI txn ID, cheque no, etc.
payment_date          date NOT NULL
receipt_pdf_s3_key    varchar                    -- S3 key only
receipt_generated_at  timestamptz
receipt_sent_at       timestamptz
fund_id               uuid REFERENCES funds(id)
recorded_by           uuid REFERENCES users(id)
fiscal_year           varchar(10) NOT NULL       -- '2025-26'
notes                 text
INDEX (temple_id, payment_date)
INDEX (temple_id, fiscal_year)
INDEX (temple_id, status)
```

### Table: funds
```sql
id, created_at, updated_at, deleted_at, temple_id
name                  varchar(200) NOT NULL
description           text
is_active             boolean DEFAULT true
target_amount         decimal(14,2)
color                 varchar(7) DEFAULT '#1455A0'
sort_order            integer DEFAULT 0
-- NO current_balance column. Calculate from finance_ledger SUM().
```

### Table: finance_ledger
```sql
id, created_at, updated_at, deleted_at, temple_id
type                  ENUM('INCOME','EXPENSE') NOT NULL
amount                decimal(14,2) NOT NULL     -- Always positive
entry_date            date NOT NULL
description           varchar(500) NOT NULL
category_id           uuid REFERENCES finance_categories(id)
fund_id               uuid REFERENCES funds(id)
donation_id           uuid REFERENCES donations(id)
seva_booking_id       uuid REFERENCES seva_bookings(id)
inventory_transaction_id uuid REFERENCES inventory_transactions(id)
expense_status        ENUM('PENDING_APPROVAL','APPROVED','REJECTED')
approved_by           uuid REFERENCES users(id)
approved_at           timestamptz
vendor_id             uuid REFERENCES vendors(id)
payment_mode          varchar
reference_number      varchar
is_auto_posted        boolean DEFAULT false
recorded_by           uuid REFERENCES users(id)
fiscal_year           varchar(10) NOT NULL
-- APPEND-ONLY: Only expense_status, approved_by, approved_at may be updated.
INDEX (temple_id, entry_date)
INDEX (temple_id, fund_id)
INDEX (temple_id, fiscal_year, type)
```

### Table: finance_categories
```sql
id, created_at, updated_at, temple_id
name                  varchar(200) NOT NULL
type                  ENUM('INCOME','EXPENSE') NOT NULL
is_system             boolean DEFAULT false
sort_order            integer DEFAULT 0
```

### Table: seva_types
```sql
id, created_at, updated_at, deleted_at, temple_id
name                  varchar(200) NOT NULL
name_hi               varchar(200)
name_local            varchar(200)
description           text
duration_minutes      integer DEFAULT 60
frequency             ENUM('DAILY','WEEKLY','MONTHLY','FESTIVAL','ON_DEMAND')
pricing_tiers         jsonb DEFAULT '[]'
                      -- [{name:"Silver", price:101, description:"Basic puja"}]
max_bookings_per_slot integer DEFAULT 1
advance_booking_days  integer DEFAULT 30
requires_sankalpa     boolean DEFAULT false
image_url             varchar                    -- S3 key
is_active             boolean DEFAULT true
is_online_bookable    boolean DEFAULT false
available_days        jsonb DEFAULT '[0,1,2,3,4,5,6]'
available_time_slots  jsonb DEFAULT '[]'
                      -- [{time:"07:00", label:"Morning", maxBookings:2}]
sort_order            integer DEFAULT 0
```

### Table: priests
```sql
id, created_at, updated_at, deleted_at, temple_id
user_id               uuid REFERENCES users(id)  -- If priest has a login
name                  varchar(200) NOT NULL
phone                 varchar(15)
specialization        varchar
assigned_seva_type_ids jsonb DEFAULT '[]'
is_active             boolean DEFAULT true
profile_photo_url     varchar                    -- S3 key
```

### Table: seva_bookings
```sql
id, created_at, updated_at, deleted_at, temple_id
booking_number        varchar(50)
                      UNIQUE (temple_id, booking_number) WHERE booking_number IS NOT NULL
seva_type_id          uuid NOT NULL REFERENCES seva_types(id)
devotee_id            uuid REFERENCES devotees(id)
devotee_name          varchar(200) NOT NULL
devotee_phone         varchar(15)
seva_date             date NOT NULL
time_slot             varchar(10) NOT NULL       -- '07:00'
tier_name             varchar(100)
amount                decimal(10,2) NOT NULL
payment_mode          ENUM('CASH','UPI','CARD','ONLINE')
status                ENUM('PENDING_PAYMENT','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW')
sankalpa_name         varchar(200)
gotra                 varchar(100)
nakshatra             varchar(50)
sankalpa_purpose      text
additional_names      jsonb DEFAULT '[]'
                      -- [{name:"Priya", gotra:"Kashyap", nakshatra:"Rohini"}]
priest_id             uuid REFERENCES priests(id)
razorpay_order_id     varchar
razorpay_payment_id   varchar
confirmation_sent_at  timestamptz
reminder_sent_at      timestamptz
completed_at          timestamptz
cancelled_at          timestamptz
cancellation_reason   varchar
refund_amount         decimal(10,2)
recorded_by           uuid REFERENCES users(id)
fiscal_year           varchar(10) NOT NULL
INDEX (temple_id, seva_date)
INDEX (temple_id, seva_date, time_slot, seva_type_id)  -- Availability queries
INDEX (temple_id, status)
```

### Table: inventory_items
```sql
id, created_at, updated_at, deleted_at, temple_id
name                  varchar(200) NOT NULL
category              ENUM('FLOWERS','PRASAD','INCENSE','OIL_GHEE','CLEANING','MAINTENANCE','ASSETS','OTHER')
unit                  ENUM('KG','GRAM','LITRE','ML','PCS','DOZEN','BOX','PACKET')
current_stock         decimal(12,3) DEFAULT 0
low_stock_threshold   decimal(12,3) DEFAULT 0
last_purchase_price   decimal(10,2)
vendor_id             uuid REFERENCES vendors(id)
is_active             boolean DEFAULT true
image_url             varchar                    -- S3 key
last_low_stock_alert_at timestamptz             -- Prevents alert spam
```

### Table: inventory_transactions
```sql
id, created_at, updated_at, deleted_at, temple_id
item_id               uuid NOT NULL REFERENCES inventory_items(id)
type                  ENUM('PURCHASE','CONSUMPTION','ADJUSTMENT','OPENING_STOCK','WASTAGE')
quantity              decimal(12,3) NOT NULL     -- Always positive
quantity_before       decimal(12,3) NOT NULL     -- Snapshot
quantity_after        decimal(12,3) NOT NULL     -- Snapshot
unit_price            decimal(10,2)              -- PURCHASE only
total_amount          decimal(12,2)              -- PURCHASE only
vendor_id             uuid REFERENCES vendors(id)
invoice_number        varchar
invoice_image_s3_key  varchar                    -- S3 key
transaction_date      date NOT NULL
finance_ledger_id     uuid REFERENCES finance_ledger(id)
seva_booking_id       uuid REFERENCES seva_bookings(id)
notes                 text
recorded_by           uuid REFERENCES users(id)
-- APPEND-ONLY. No updates.
```

### Table: vendors
```sql
id, created_at, updated_at, deleted_at, temple_id
name                  varchar(200) NOT NULL
contact_person        varchar
phone                 varchar(15)
email                 varchar
gstin                 varchar(15)
address               text
category              varchar
is_active             boolean DEFAULT true
```

### Table: festivals
```sql
id, created_at, updated_at, deleted_at, temple_id
name                  varchar(200) NOT NULL
name_hi               varchar(200)
description           text
festival_date         date NOT NULL
end_date              date
is_recurring          boolean DEFAULT true
tithi                 varchar               -- 'Phalguni Purnima'
estimated_budget      decimal(12,2)
actual_budget         decimal(12,2)
preparation_checklist jsonb DEFAULT '[]'
                      -- [{task:"Order flowers",daysBeforeEvent:2,isDone:false}]
volunteer_slots       integer
is_published          boolean DEFAULT false
created_by            uuid REFERENCES users(id)
```

### Table: announcements
```sql
id, created_at, updated_at, deleted_at, temple_id
title                 varchar(200) NOT NULL
body                  text NOT NULL
image_s3_key          varchar
is_published          boolean DEFAULT false
published_at          timestamptz
expires_at            timestamptz
created_by            uuid REFERENCES users(id)
```

### Table: notification_logs
```sql
id, created_at, updated_at, temple_id
channel               ENUM('WHATSAPP','SMS','EMAIL','PUSH')
template              varchar(100) NOT NULL
status                ENUM('QUEUED','SENT','DELIVERED','READ','FAILED')
recipient_phone       varchar(15) NOT NULL
recipient_name        varchar
message_body          text
template_variables    jsonb DEFAULT '{}'
external_message_id   varchar               -- Gupshup message ID
error_code            varchar
error_message         text
retry_count           integer DEFAULT 0
sent_at               timestamptz
delivered_at          timestamptz
read_at               timestamptz
donation_id           uuid
seva_booking_id       uuid
```

### Table: audit_logs
```sql
id, created_at, temple_id
actor_id              uuid                  -- NULL for system actions
actor_name            varchar
entity_type           varchar(100) NOT NULL -- 'Donation', 'SevaBooking', etc.
entity_id             uuid NOT NULL
action                ENUM('CREATE','UPDATE','DELETE','CANCEL','APPROVE','REJECT','LOGIN','LOGOUT')
old_values            jsonb
new_values            jsonb
ip_address            varchar
request_id            varchar
-- NO deleted_at. NO updated_at. APPEND-ONLY.
-- Add DB-level trigger to block DELETE and UPDATE statements on this table.
```

---

## 8. Complete API Specification

**Base URL:** `/api/v1`
**Auth:** `Authorization: Bearer <accessToken>` on all protected routes
**Pagination default:** limit=20, max=100

### Auth — `/api/v1/auth`
```
POST  /request-otp     PUBLIC   body: { phone: string, templeSlug?: string }
POST  /verify-otp      PUBLIC   body: { phone, otp, deviceInfo? }
POST  /refresh         PUBLIC   body: { refreshToken }  ← server reads userId from token
GET   /me              JWT      → { userId, role, templeId, temple }
POST  /logout          JWT      body: { sessionId }
POST  /logout-all      JWT      (no body)
```

### Temples — `/api/v1/temples`
```
GET   /profile         JWT       → temple (sensitive fields masked)
PATCH /profile         JWT+Admin body: Partial<Temple>
GET   /public/:slug    PUBLIC    → { temple, categories, sevaTypes }
GET   /check-slug/:slug PUBLIC   → { available: boolean }
POST  /upload-logo     JWT+Admin multipart → { s3Key }
POST  /upload-banner   JWT+Admin multipart → { s3Key }
GET   /qr-code         JWT+Admin → PNG buffer for /t/{slug} donation URL
```

### Donations — `/api/v1/donations`
```
GET   /                JWT      ?page&limit&fromDate&toDate&categoryId&mode&status&search&fiscalYear
POST  /                JWT      body: { categoryId, donorName, donorPhone?, amount, mode,
                                        paymentReference?, paymentDate, pan?, isAnonymous?,
                                        devoteeId?, notes? }
GET   /:id             JWT      → donation + presigned receipt URL
PATCH /:id             JWT      body: { notes?, paymentReference? }  ← limited fields
DELETE /:id            JWT+Admin soft delete
POST  /initiate-online PUBLIC   body: { templeSlug, categoryId, amount, donorName, donorPhone, pan? }
                                → { razorpayOrderId, razorpayKeyId, amount, donationId }
GET   /by-order/:orderId PUBLIC → { status, donationId }  ← client polls after payment
POST  /:id/resend-receipt JWT   → re-queue WhatsApp
GET   /analytics       JWT      ?fromDate&toDate → daily[], byCategory[], byMode[], topDonors[]
GET   /80g-summary     JWT      ?fiscalYear → { totalEligible, donorsCount, downloadUrl }
GET   /categories      JWT
POST  /categories      JWT+Admin
PATCH /categories/:id  JWT+Admin
DELETE /categories/:id JWT+Admin
```

### Sevas — `/api/v1/sevas`
```
GET   /types               JWT
POST  /types               JWT+Admin
PATCH /types/:id           JWT+Admin
DELETE /types/:id          JWT+Admin
GET   /types/:id/availability PUBLIC ?date → [{ time, available, booked, total }]

GET   /bookings            JWT      ?page&limit&date&status&sevaTypeId&priestId
POST  /bookings            JWT      body: { sevaTypeId, devoteeId?, devoteeName, devoteePhone?,
                                            sevaDate, timeSlot, tierName, amount, paymentMode,
                                            paymentReference?, sankalpaName?, gotra?,
                                            nakshatra?, additionalNames?, priestId? }
GET   /bookings/day-sheet  JWT      ?date&priestId
GET   /bookings/:id        JWT
PATCH /bookings/:id/cancel JWT      body: { reason }
PATCH /bookings/:id/reschedule JWT  body: { newDate, newTimeSlot }
PATCH /bookings/:id/complete JWT+Priest
POST  /bookings/initiate-payment JWT body: { bookingId } → { razorpayOrderId, ... }
```

### Devotees — `/api/v1/devotees`
```
GET   /                JWT      ?page&limit&search&tier&city
POST  /                JWT      body: { name, phone, email?, gotra?, pan?, tier?, ... }
GET   /birthdays       JWT      → devotees with birthday in next 7 days
GET   /top-donors      JWT      ?limit&fiscalYear
GET   /search          JWT      ?phone
GET   /:id             JWT      → full devotee profile
PUT   /:id             JWT      full update
GET   /:id/history     JWT      → { donations: [], sevas: [] }
PATCH /:id/opt-out     JWT      body: { channel: 'WHATSAPP' | 'SMS' }
```

### Finance — `/api/v1/finance`
```
GET   /ledger              JWT         ?page&limit&type&fromDate&toDate&fundId&fiscalYear
POST  /expenses            JWT         body: { amount, categoryId, description, ... }
POST  /income              JWT         body: { amount, categoryId, description, ... }
PATCH /expenses/:id/approve JWT+Trustee
PATCH /expenses/:id/reject  JWT+Trustee body: { reason }
GET   /summary             JWT         ?fromDate&toDate&fiscalYear
GET   /funds               JWT         → funds with calculated balance
POST  /funds               JWT+Admin
PATCH /funds/:id           JWT+Admin
DELETE /funds/:id          JWT+Admin
GET   /categories          JWT         ?type=INCOME|EXPENSE
POST  /reports/monthly     JWT         body: { month, year } → { downloadUrl }
```

### Inventory — `/api/v1/inventory`
```
GET   /items               JWT         ?category&search&lowStockOnly
POST  /items               JWT+Admin
PATCH /items/:id           JWT+Admin
DELETE /items/:id          JWT+Admin
GET   /items/low-stock     JWT
GET   /transactions        JWT         ?itemId&type&fromDate&toDate&page&limit
POST  /purchase            JWT         body: { itemId, quantity, unitPrice, vendorId?, invoiceNumber? }
POST  /consume             JWT         body: [{ itemId, quantity }]  ← array for bulk
POST  /adjust              JWT+Admin   body: { itemId, quantity, reason, type }
GET   /vendors             JWT         ?search
POST  /vendors             JWT+Admin
PATCH /vendors/:id         JWT+Admin
DELETE /vendors/:id        JWT+Admin
```

### Users — `/api/v1/users`
```
GET   /                JWT+Admin
POST  /invite          JWT+Admin  body: { fullName, phone, role }
PATCH /:id             JWT+Admin  body: { role?, permissions?, isActive? }
POST  /:id/deactivate  JWT+Admin
GET   /:id/activity    JWT+Admin  → last 50 audit log entries for this user
```

### Communication — `/api/v1/communication`
```
GET   /broadcasts      JWT        ?page&limit
POST  /broadcasts      JWT+Admin  body: { channel, templateName, audienceFilter, message?, scheduledAt? }
GET   /templates       JWT+Admin  → approved WhatsApp template list from Gupshup
```

### Analytics — `/api/v1/analytics`
```
GET   /donations       JWT  ?fromDate&toDate
GET   /sevas           JWT  ?fromDate&toDate
GET   /devotees        JWT  ?fromDate&toDate
GET   /inventory       JWT  ?fromDate&toDate
GET   /finance         JWT  ?fiscalYear
```

### Festivals — `/api/v1/festivals`
```
GET   /                JWT
POST  /                JWT+Admin
PATCH /:id             JWT+Admin
DELETE /:id            JWT+Admin
PATCH /:id/publish     JWT+Admin
```

### Announcements — `/api/v1/announcements`
```
GET   /                PUBLIC(?templeSlug) or JWT
POST  /                JWT+Admin
PATCH /:id             JWT+Admin
DELETE /:id            JWT+Admin
PATCH /:id/publish     JWT+Admin
```

### Webhooks — `/api/v1/webhooks`
```
POST  /razorpay          PUBLIC  ← MUST verify X-Razorpay-Signature HMAC before processing
POST  /gupshup/delivery  PUBLIC  ← MUST verify HMAC before processing
POST  /gupshup/inbound   PUBLIC  ← MUST verify HMAC. Inbound WhatsApp messages (chatbot)
```

---

## 9. Environment Variables

```bash
# ─── App ────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001

# ─── Database ───────────────────────────────────────────────────
DATABASE_URL=postgresql://devaseva:devaseva_dev@localhost:5432/devaseva_dev
TEST_DATABASE_URL=postgresql://devaseva:devaseva_dev@localhost:5433/devaseva_test

# ─── Redis ──────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── JWT (RS256 asymmetric) ─────────────────────────────────────
# Generate: openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
JWT_ACCESS_EXPIRY=900        # 15 minutes
JWT_REFRESH_EXPIRY=2592000   # 30 days

# ─── Encryption (PAN numbers) ───────────────────────────────────
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=<64-char hex string>

# ─── Razorpay ───────────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# ─── Gupshup WhatsApp BSP ───────────────────────────────────────
GUPSHUP_API_KEY=...
GUPSHUP_APP_NAME=...
GUPSHUP_WHATSAPP_NUMBER=91XXXXXXXXXX
GUPSHUP_WEBHOOK_SECRET=...

# ─── Textlocal SMS ──────────────────────────────────────────────
TEXTLOCAL_API_KEY=...
TEXTLOCAL_SENDER=DEVSVT

# ─── AWS ────────────────────────────────────────────────────────
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_RECEIPTS=devaseva-receipts-dev
S3_BUCKET_MEDIA=devaseva-media-dev
SES_FROM_EMAIL=noreply@devasevaapp.in

# ─── CORS Whitelist ─────────────────────────────────────────────
ADMIN_URL=http://localhost:3000
WEB_URL=http://localhost:3002

# ─── OTP Config ─────────────────────────────────────────────────
OTP_EXPIRY_SECONDS=600
OTP_MAX_ATTEMPTS=3
OTP_RATE_LIMIT_PER_HOUR=5

# ─── Finance ────────────────────────────────────────────────────
EXPENSE_APPROVAL_THRESHOLD=5000   # Expenses above ₹5,000 require trustee approval
```

---

## 10. Design System Tokens

### Tailwind Config Extension
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        saffron: {
          50:  '#FDE8D8',
          500: '#E8530A',  // PRIMARY — one CTA button per screen only
          700: '#B33D05',  // hover state
          900: '#7A1F00',  // H1 headings
        },
        gold: {
          50:  '#FFF5CC',
          400: '#C49A00',  // accent / secondary
        },
        cream: '#FEF9F3',        // page background (not white)
        'ink':       '#1C1B1F',  // body text
        'ink-mid':   '#49454F',  // secondary text
        'ink-light': '#79747E',  // captions, placeholders
      },
      fontFamily: {
        // Noto Sans covers all 9 Indian scripts used in DevaSeva
        sans: ['Noto Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        'xs':  '2px',
        'sm':  '4px',
        'md':  '8px',
        'lg':  '12px',
        'xl':  '16px',
        '2xl': '24px',
      },
    },
  },
};
```

### Typography Rules
```
text-[40px] font-bold    → Display (cover titles, success screens)
text-[28px] font-bold    → H1 (one per screen, colour: saffron-900)
text-[22px] font-semibold → H2 (section titles)
text-[18px] font-semibold → H3 (card titles)
text-[16px] font-normal  → Body Large (descriptions)
text-[14px] font-normal  → Body Default (form labels, list items)
text-[12px] font-normal  → Caption (timestamps, metadata)
text-[14px] font-medium  → Label (button text, tabs)
```

### Component Rules
```
Buttons:
  - Primary (saffron-500): ONE per screen. 48px height desktop, 56px mobile.
  - Secondary (outlined saffron): beside primary only
  - Destructive (red): always show a confirmation dialog
  - All buttons: radius-full (pill shape)

Inputs:
  - Height: 56px mobile, 48px desktop
  - Label: always above the field, never placeholder-only
  - Focus ring: 2px solid saffron-500
  - Error state: red border + red text below + shake animation

Touch targets (mobile):
  - Minimum 44×44px. Preferred 48×48px.
  - 8px gap between adjacent targets.
```

---

## 11. Background Jobs

```
Queue Name              Trigger                        Priority
──────────────────────────────────────────────────────────────
receipt_generation      After donation confirmed        HIGH (1)
whatsapp_outbound       After receipt generated         HIGH (2)
sms_outbound            WhatsApp fallback               MEDIUM (3)
email_outbound          Annual 80G, staff invites       LOW (5)
seva_reminder           24h before seva date            MEDIUM (3)
low_stock_alerts        Cron: every 4 hours             LOW (5)
birthday_greetings      Cron: daily 07:00 IST           LOW (5)
monthly_reports         Cron: 1st of month 01:00 IST    LOW (5)
reconciliation          Cron: nightly 02:00 IST         LOW (5)
```

**All jobs must have:**
- `attempts: 3`
- `backoff: { type: 'exponential', delay: 2000 }`
- A dead-letter queue for failed jobs after 3 attempts
- Idempotency — safe to run twice with the same data

---

## 12. Build Order — Follow This Sequence

Build in this exact order. Do not skip ahead. Each phase must compile and have passing tests.

```
Phase 0 — Infrastructure (do this first, everything depends on it)
  ✦ docker-compose up (PostgreSQL + Redis)
  ✦ packages/types — enums, interfaces, shared types
  ✦ apps/api — NestJS bootstrap: app.module, config, database connection
  ✦ apps/api — BaseEntity, TenantBaseEntity
  ✦ apps/api — Common middleware: RequestId, TenantMiddleware
  ✦ apps/api — Common interceptors: ResponseInterceptor, AuditInterceptor
  ✦ apps/api — Common filters: HttpExceptionFilter
  ✦ apps/api — Common utils: EncryptionUtil, FiscalYearUtil, ReceiptNumberUtil

Phase 1 — Auth (nothing works without this)
  ✦ Temple entity + migration
  ✦ User entity + migration
  ✦ OtpSession entity + migration
  ✦ Session entity + migration
  ✦ OtpService (generate, hash, verify)
  ✦ SessionService (create, validate, revoke)
  ✦ AuthService + AuthController
  ✦ JwtStrategy, JwtAuthGuard, RolesGuard
  ✦ Unit tests: OtpService, AuthService
  ✦ Integration tests: POST /auth/request-otp, POST /auth/verify-otp

Phase 2 — Donations (the core revenue flow)
  ✦ DonationCategory entity + migration
  ✦ Fund entity + migration
  ✦ FinanceCategory entity + migration
  ✦ FinanceLedger entity + migration
  ✦ Donation entity + migration (with all indexes)
  ✦ DonationsService (create, findAll, findById)
  ✦ FinanceService (auto-post ledger on donation confirm)
  ✦ DonationsController
  ✦ BullMQ: receipt_generation queue + processor
  ✦ PdfService (Puppeteer — 80G receipt HTML template)
  ✦ S3Service (upload, presigned URL generation)
  ✦ BullMQ: whatsapp_outbound queue + processor
  ✦ GupshupService (send message via REST)
  ✦ Unit tests: DonationsService, FinanceService
  ✦ Integration tests: POST /donations, GET /donations

Phase 3 — Razorpay (online donations)
  ✦ RazorpayService (create order, verify payment)
  ✦ WebhooksController + RazorpayWebhookService
  ✦ POST /donations/initiate-online endpoint
  ✦ POST /webhooks/razorpay handler with HMAC verification
  ✦ Integration tests: webhook with mock signature

Phase 4 — Seva Booking
  ✦ SevaType entity + migration
  ✦ Priest entity + migration
  ✦ SevaBooking entity + migration (with availability indexes)
  ✦ SevasService (CRUD + availability check)
  ✦ SevasController
  ✦ BullMQ: seva_reminder job
  ✦ Unit tests: SevasService availability logic
  ✦ Integration tests: POST /sevas/bookings

Phase 5 — Devotee CRM
  ✦ Devotee entity + migration
  ✦ DevoteesService
  ✦ DevoteesController
  ✦ Denormalized aggregate update (total_donation_amount on each donation)

Phase 6 — Inventory + Vendors
  ✦ Vendor entity + migration
  ✦ InventoryItem entity + migration
  ✦ InventoryTransaction entity + migration
  ✦ InventoryService (purchase auto-posts to ledger)
  ✦ InventoryController
  ✦ Cron: low_stock_alerts

Phase 7 — Finance & Analytics
  ✦ FinanceController (ledger, expenses, funds, reports)
  ✦ AnalyticsService + AnalyticsController
  ✦ Monthly report PDF generation

Phase 8 — Festivals, Announcements, Communication
  ✦ Festival entity + migration
  ✦ Announcement entity + migration
  ✦ FestivalsController, AnnouncementsController
  ✦ CommunicationController (broadcast)
  ✦ Gupshup inbound webhook (chatbot state machine)

Phase 9 — Admin Web App (start after Phase 2 is working)
  ✦ Vite + React setup: Tailwind, TanStack Query, Zustand, React Router
  ✦ API client (Axios with auth interceptor + token refresh)
  ✦ Auth: LoginPhone, LoginOtp pages
  ✦ AppShell (Sidebar, Header, PageHeader)
  ✦ Dashboard page
  ✦ Donations module (List, New, Detail)
  ✦ Sevas module (Catalog, Calendar, NewBooking, DaySheet)
  ✦ Devotees module
  ✦ Finance module
  ✦ Inventory module
  ✦ Analytics module
  ✦ Festivals module
  ✦ Settings + Users modules

Phase 10 — Public Web App (Next.js)
  ✦ Temple public profile page (/t/[slug])
  ✦ Online donation form + Razorpay checkout
  ✦ Donation success / polling page
  ✦ SEO metadata + OG images

Phase 11 — Mobile App (React Native + Expo)
  ✦ Navigation setup (Expo Router)
  ✦ Onboarding + Temple Discovery
  ✦ Temple Home screen
  ✦ Donation flow (4 screens)
  ✦ Seva booking flow (4 screens)
  ✦ My Bookings + My Receipts
  ✦ Profile + Settings
  ✦ Festival Feed

Phase 12 — Hardening
  ✦ i18n: react-i18next setup, Hindi + English baseline translations
  ✦ All browser compatibility testing (Chrome, Safari, Firefox, Samsung Internet)
  ✦ OWASP ZAP security scan
  ✦ Load testing with k6
  ✦ E2E tests: Playwright (donation flow, seva booking, payment webhook)
  ✦ CI/CD pipeline (GitHub Actions)
  ✦ Deployment: AWS ECS Fargate (API), S3+CloudFront (Admin), Vercel/ECS (Web)
```

---

## 13. Testing Requirements

Every module must have tests before moving to the next phase.

```typescript
// Unit test template — copy for every service
// apps/api/src/modules/donations/__tests__/donations.service.spec.ts
describe('DonationsService', () => {
  let service: DonationsService;
  let donationRepo: jest.Mocked<Repository<Donation>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DonationsService,
        { provide: getRepositoryToken(Donation), useValue: createMockRepository() },
        { provide: getRepositoryToken(FinanceLedger), useValue: createMockRepository() },
        { provide: getQueueToken('receipt_generation'), useValue: { add: jest.fn() } },
        { provide: EncryptionUtil, useValue: { encrypt: jest.fn(), decrypt: jest.fn() } },
        { provide: FiscalYearUtil, useValue: { fromDate: jest.fn().mockReturnValue('2025-26') } },
        { provide: ReceiptNumberUtil, useValue: { next: jest.fn().mockResolvedValue('RCPT-2025-26-0001') } },
        { provide: DataSource, useValue: { transaction: jest.fn((cb) => cb({})) } },
      ],
    }).compile();

    service = module.get(DonationsService);
  });

  describe('create', () => {
    it('should encrypt PAN when provided', async () => {
      // Arrange
      const dto = { ...validDonationDto, pan: 'ABCDE1234F' };
      // Act
      await service.create('temple-uuid', dto, 'user-uuid');
      // Assert
      expect(encryptionUtil.encrypt).toHaveBeenCalledWith('ABCDE1234F');
    });

    it('should reject invalid PAN format', async () => {
      const dto = { ...validDonationDto, pan: 'INVALID' };
      await expect(service.create('temple-uuid', dto, 'user-uuid'))
        .rejects.toThrow(UnprocessableEntityException);
    });

    it('should queue receipt generation after creation', async () => {
      await service.create('temple-uuid', validDonationDto, 'user-uuid');
      expect(receiptQueue.add).toHaveBeenCalledWith('generate', expect.any(Object), expect.any(Object));
    });

    it('should always use templeId from parameter, not from dto', async () => {
      await service.create('temple-uuid', validDonationDto, 'user-uuid');
      expect(donationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ templeId: 'temple-uuid' })
      );
    });
  });
});
```

---

## 14. Common Mistakes to Avoid

These mistakes have been made. Do not repeat them.

```
MISTAKE: Storing running balance in funds.current_balance
FIX: Calculate live via SUM on finance_ledger. See Section 5 (funds table).

MISTAKE: Taking templeId from request.body on the /auth/refresh endpoint
FIX: The server decodes templeId from the refresh token. Client only sends the token.

MISTAKE: Using float columns for monetary amounts
FIX: decimal(12,2) in PostgreSQL. TypeORM returns it as a string — use parseFloat() when needed.

MISTAKE: Storing S3 full URLs in the database
FIX: Store only the S3 key. Generate pre-signed URLs at serve time (1hr TTL).

MISTAKE: Logging PAN numbers or raw tokens in NestJS Logger
FIX: Never log sensitive fields. Log 'donation created' not 'donation created for PAN ABCDE1234F'.

MISTAKE: Using the category enum on donations instead of the donation_categories table
FIX: All donation categories are rows in donation_categories. Use category_id FK only.

MISTAKE: Forgetting to add temple_id to a WHERE clause
FIX: Every query on a tenant-scoped table must filter by templeId. Add an ESLint rule for this.

MISTAKE: Using string for amount in JavaScript math operations
FIX: TypeORM returns decimal as string. Always parseFloat(amount) before arithmetic.

MISTAKE: Storing the OTP code directly instead of a hash
FIX: bcrypt.hash(otp, 10) before saving. bcrypt.compare(input, stored_hash) to verify.

MISTAKE: Not handling the 'payment.failed' Razorpay webhook
FIX: Handle payment.failed to update donation status to CANCELLED and free the devotee to retry.

MISTAKE: Creating a NestJS module without adding it to app.module.ts imports
FIX: After creating any module, immediately add it to the imports array in app.module.ts.

MISTAKE: Building Phase 9+ without Phase 1-3 having passing tests
FIX: Follow the build order in Section 12. Tests must pass before the next phase begins.
```

---

*DevaSeva CLAUDE.md — v2.0 — Infosware Solutions Pvt. Ltd. — Feb 2026*
*Restart from scratch. Build it right this time.*
