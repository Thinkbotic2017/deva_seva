import { randomBytes } from 'crypto';
import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Temple } from '../../database/entities/temple.entity';
import { Donation } from '../../database/entities/donation.entity';
import { Devotee } from '../../database/entities/devotee.entity';
import { User } from '../../database/entities/user.entity';
import { MembershipPlan } from '../../database/entities/membership-plan.entity';
import { RazorpayService } from '../razorpay/razorpay.service';
import { TemplePlan, DonationStatus, BillingCycle, UserRole } from '@devaseva/types';

export {
  CreatePlanDto,
  UpdatePlanDto,
  ChargePlanDto,
  ExtendPlanDto,
  InviteTempleAdminDto,
} from './dto/superadmin.dto';

// ─── Result types ─────────────────────────────────────────────────────────────

/** Extended temple summary for the superadmin temple list. */
export interface TempleSummary {
  id: string;
  name: string;
  slug: string;
  plan: TemplePlan;
  planId?: string;
  planBillingCycle?: string;
  planAmount?: string;
  planValidUntil?: Date;
  lastPaymentAt?: Date;
  isActive: boolean;
  suspensionReason?: string;
  createdAt: Date;
  city?: string;
  state?: string;
  donationCount: number;
  devoteeCount: number;
}

/** Platform-wide aggregated metrics for the superadmin system view. */
export interface SystemStats {
  totalTemples: number;
  activeTemples: number;
  totalDonations: number;
  totalRevenue: string;
  totalDevotees: number;
}

/** Result of creating a Razorpay payment link for a temple. */
/** Safe response for inviteTempleAdmin — never exposes the full User entity. */
export interface InviteAdminResult {
  userId: string;
  phone: string;
  fullName: string;
  role: string;
  /** The raw one-time invite token — log or surface to the caller, then discard. */
  inviteToken: string;
  message: string;
}

export interface ChargeResult {
  paymentLinkUrl: string;
  amount: number;
  planName: string;
}

/** Confirmed donation statuses for revenue aggregation. */
const CONFIRMED_STATUSES = [
  DonationStatus.CONFIRMED,
  DonationStatus.RECEIPT_GENERATED,
  DonationStatus.RECEIPT_SENT,
];

/** Months added to plan_valid_until per billing cycle. */
const BILLING_CYCLE_MONTHS: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  YEARLY: 12,
};

/**
 * SuperAdminService provides platform-level administration.
 * All methods are intentionally NOT scoped to a single templeId.
 * Access is enforced by @Roles(UserRole.SUPER_ADMIN) on the controller.
 *
 * Security: these endpoints have NO tenant boundary — they see all data.
 * They must never be accessible to temple-scoped roles.
 */
@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectRepository(Temple)
    private readonly templeRepo: Repository<Temple>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(Devotee)
    private readonly devoteeRepo: Repository<Devotee>,
    @InjectRepository(MembershipPlan)
    private readonly planRepo: Repository<MembershipPlan>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly razorpayService: RazorpayService,
  ) {}

  // ─── Temple listing ────────────────────────────────────────────────────────

  /**
   * Returns all temples with plan, billing, status, and aggregate counts.
   * Counts are fetched in parallel with the temple list to avoid N+1 queries.
   */
  async listTemples(): Promise<TempleSummary[]> {
    const [temples, donationCountsRaw, devoteeCountsRaw] = await Promise.all([
      this.templeRepo.find({ order: { createdAt: 'DESC' } }),
      this.donationRepo
        .createQueryBuilder('d')
        .select('d.temple_id', 'templeId')
        .addSelect('COUNT(d.id)', 'count')
        .where('d.deleted_at IS NULL')
        .groupBy('d.temple_id')
        .getRawMany<{ templeId: string; count: string }>(),
      this.devoteeRepo
        .createQueryBuilder('dv')
        .select('dv.temple_id', 'templeId')
        .addSelect('COUNT(dv.id)', 'count')
        .where('dv.deleted_at IS NULL')
        .groupBy('dv.temple_id')
        .getRawMany<{ templeId: string; count: string }>(),
    ]);

    const donationMap = new Map(donationCountsRaw.map((r) => [r.templeId, parseInt(r.count, 10)]));
    const devoteeMap = new Map(devoteeCountsRaw.map((r) => [r.templeId, parseInt(r.count, 10)]));

    return temples.map((t) => this.toSummary(t, donationMap.get(t.id) ?? 0, devoteeMap.get(t.id) ?? 0));
  }

  // ─── Temple actions ────────────────────────────────────────────────────────

  /**
   * Suspends a temple — all its users lose access on next request.
   * Idempotent — suspending an already-suspended temple is a no-op.
   */
  async suspendTemple(templeId: string, reason?: string): Promise<TempleSummary> {
    const temple = await this.templeRepo.findOne({ where: { id: templeId } });
    if (!temple) throw new NotFoundException(`Temple ${templeId} not found`);

    const suspensionReason = reason ?? 'Suspended by super admin';
    await this.templeRepo.update(templeId, { isActive: false, suspensionReason });
    this.logger.log(`Temple ${templeId} (${temple.slug}) suspended: ${suspensionReason}`);

    return this.toSummary({ ...temple, isActive: false, suspensionReason });
  }

  /**
   * Re-activates a suspended temple — clears the suspension reason.
   * Idempotent — activating an already-active temple is a no-op.
   */
  async activateTemple(templeId: string): Promise<TempleSummary> {
    const temple = await this.templeRepo.findOne({ where: { id: templeId } });
    if (!temple) throw new NotFoundException(`Temple ${templeId} not found`);

    await this.templeRepo.update(templeId, { isActive: true, suspensionReason: undefined });
    this.logger.log(`Temple ${templeId} (${temple.slug}) activated`);

    return this.toSummary({ ...temple, isActive: true, suspensionReason: undefined });
  }

  /**
   * Creates a Razorpay payment link for a temple's plan subscription.
   * Stores planId, billingCycle, and amount on the temple record.
   * Returns the payment link URL for the super admin to share with the temple.
   */
  async chargeTemple(templeId: string, dto: ChargePlanDto): Promise<ChargeResult> {
    const [temple, plan] = await Promise.all([
      this.templeRepo.findOne({ where: { id: templeId } }),
      this.planRepo.findOne({ where: { id: dto.planId, isActive: true } }),
    ]);
    if (!temple) throw new NotFoundException(`Temple ${templeId} not found`);
    if (!plan) throw new NotFoundException(`Plan ${dto.planId} not found or inactive`);

    const amount = parseFloat(plan.price);
    const description = `DevaSeva ${plan.name} — ${temple.name}`;

    let paymentLink;
    try {
      paymentLink = await this.razorpayService.createPaymentLink(
        amount,
        description,
        `${templeId}-${Date.now()}`,
        temple.email,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Razorpay error';
      throw new UnprocessableEntityException(`Failed to create payment link: ${msg}`);
    }

    // Record the plan and payment link on the temple
    await this.templeRepo.update(templeId, {
      planId: dto.planId,
      planBillingCycle: dto.billingCycle,
      planAmount: plan.price,
      planRazorpayPaymentId: paymentLink.id,
    });

    this.logger.log(
      `Payment link created for temple ${templeId}: plan=${plan.name}, amount=₹${amount}, link=${paymentLink.short_url}`,
    );

    return {
      paymentLinkUrl: paymentLink.short_url,
      amount,
      planName: plan.name,
    };
  }

  /**
   * Manually extends a temple's plan validity by N months.
   * If plan_valid_until is null, starts from today (IST).
   * The extension reason is stored in suspensionReason temporarily per spec.
   */
  async extendTemple(templeId: string, dto: ExtendPlanDto): Promise<TempleSummary> {
    const temple = await this.templeRepo.findOne({ where: { id: templeId } });
    if (!temple) throw new NotFoundException(`Temple ${templeId} not found`);

    if (dto.months < 1 || dto.months > 24) {
      throw new UnprocessableEntityException('months must be between 1 and 24');
    }

    // Start from current expiry or today IST
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const base = temple.planValidUntil ?? new Date(Date.now() + istOffsetMs);
    const newExpiry = new Date(base);
    newExpiry.setMonth(newExpiry.getMonth() + dto.months);

    await this.templeRepo.update(templeId, {
      planValidUntil: newExpiry,
      isActive: true,
      suspensionReason: `Extended by ${dto.months}m on ${new Date().toISOString().slice(0, 10)}: ${dto.reason}`,
    });

    this.logger.log(
      `Temple ${templeId} (${temple.slug}) extended by ${dto.months} months to ${newExpiry.toISOString()}. Reason: ${dto.reason}`,
    );

    return this.toSummary({ ...temple, planValidUntil: newExpiry, isActive: true });
  }

  // ─── Membership plan CRUD ──────────────────────────────────────────────────

  /** Returns all membership plans ordered by sort_order. */
  async listPlans(): Promise<MembershipPlan[]> {
    return this.planRepo.find({ order: { sortOrder: 'ASC', createdAt: 'ASC' } });
  }

  /** Creates a new membership plan. */
  async createPlan(dto: CreatePlanDto): Promise<MembershipPlan> {
    const plan = this.planRepo.create({
      name: dto.name,
      billingCycle: dto.billingCycle,
      price: Number(dto.price).toFixed(2),
      description: dto.description,
      features: dto.features ?? [],
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    const saved = await this.planRepo.save(plan);
    this.logger.log(`Membership plan created: ${saved.name} (${saved.id})`);
    return saved;
  }

  /** Updates an existing membership plan. Price is always stored as decimal string. */
  async updatePlan(planId: string, dto: UpdatePlanDto): Promise<MembershipPlan> {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException(`Plan ${planId} not found`);

    const updates: Partial<MembershipPlan> = {};
    if (dto.name !== undefined) updates.name = dto.name;
    if (dto.billingCycle !== undefined) updates.billingCycle = dto.billingCycle;
    if (dto.price !== undefined) updates.price = Number(dto.price).toFixed(2);
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.features !== undefined) updates.features = dto.features;
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) updates.sortOrder = dto.sortOrder;

    await this.planRepo.update(planId, updates);
    return { ...plan, ...updates } as MembershipPlan;
  }

  /** Deactivates a plan (soft delete — preserves historical temple references). */
  async deactivatePlan(planId: string): Promise<void> {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) throw new NotFoundException(`Plan ${planId} not found`);

    await this.planRepo.update(planId, { isActive: false });
    this.logger.log(`Membership plan deactivated: ${plan.name} (${planId})`);
  }

  // ─── System stats ──────────────────────────────────────────────────────────

  /**
   * Returns platform-wide aggregated metrics.
   * Runs all queries in parallel via Promise.all().
   */
  async getSystemStats(): Promise<SystemStats> {
    const [totalTemples, activeTemples, revenueRaw, totalDevotees] = await Promise.all([
      this.templeRepo.count(),
      this.templeRepo.count({ where: { isActive: true } }),
      this.donationRepo
        .createQueryBuilder('d')
        .select('COUNT(d.id)', 'count')
        .addSelect('COALESCE(SUM(d.amount::numeric), 0)', 'total')
        .where('d.status IN (:...statuses)', { statuses: CONFIRMED_STATUSES })
        .andWhere('d.deleted_at IS NULL')
        .getRawOne<{ count: string; total: string }>(),
      this.devoteeRepo
        .createQueryBuilder('dv')
        .select('COUNT(dv.id)', 'count')
        .where('dv.deleted_at IS NULL')
        .getRawOne<{ count: string }>(),
    ]);

    return {
      totalTemples,
      activeTemples,
      totalDonations: parseInt(revenueRaw?.count ?? '0', 10),
      totalRevenue: parseFloat(revenueRaw?.total ?? '0').toFixed(2),
      totalDevotees: parseInt(totalDevotees?.count ?? '0', 10),
    };
  }

  // ─── Auto-suspension cron logic ────────────────────────────────────────────

  /**
   * Suspends all active temples whose plan_valid_until has passed.
   * Called daily at 1 AM IST by SuperAdminScheduler.
   * Idempotent — running twice on the same temple does nothing after first run.
   */
  async autoSuspendExpiredTemples(): Promise<void> {
    const now = new Date();
    const expired = await this.templeRepo
      .createQueryBuilder('t')
      .where('t.is_active = true')
      .andWhere('t.plan_valid_until IS NOT NULL')
      .andWhere('t.plan_valid_until < :now', { now })
      .getMany();

    if (expired.length === 0) {
      this.logger.debug('Auto-suspend cron: no expired temples found');
      return;
    }

    const todayStr = now.toISOString().slice(0, 10);

    for (const temple of expired) {
      const reason = `Plan expired — auto suspended on ${todayStr}`;
      await this.templeRepo.update(temple.id, { isActive: false, suspensionReason: reason });
      this.logger.warn(`Auto-suspended temple ${temple.id} (${temple.slug}): plan expired at ${temple.planValidUntil?.toISOString()}`);
    }

    this.logger.log(`Auto-suspend cron: suspended ${expired.length} temple(s)`);
  }

  // ─── Temple admin onboarding ───────────────────────────────────────────────

  /**
   * Creates an ADMIN user for a temple and returns a one-time invite token.
   *
   * Called by SUPER_ADMIN when onboarding a new temple — this is the only
   * supported flow for creating a temple's first ADMIN.
   *
   * Policy:
   * - Multiple ADMINs per temple are allowed (temples may want a backup admin).
   * - If an active ADMIN already exists, a warning is logged but the invite proceeds.
   * - Phone uniqueness is scoped per temple — no conflict with other temples.
   *
   * @param templeId  The temple to invite the admin to.
   * @param dto       Admin contact details.
   */
  async inviteTempleAdmin(templeId: string, dto: InviteTempleAdminDto): Promise<InviteAdminResult> {
    const temple = await this.templeRepo.findOne({ where: { id: templeId } });
    if (!temple) throw new NotFoundException(`Temple ${templeId} not found`);

    // Warn if an active ADMIN already exists — don't block it.
    const existingAdmin = await this.userRepo.findOne({
      where: { templeId, role: UserRole.ADMIN, isActive: true },
    });
    if (existingAdmin) {
      this.logger.warn(
        `Temple ${templeId} (${temple.slug}) already has an active ADMIN (${existingAdmin.id}). Adding another.`,
      );
    }

    // Conflict check: phone must be unique within the temple.
    const existingPhone = await this.userRepo.findOne({
      where: { templeId, phone: dto.phone },
    });
    if (existingPhone) {
      throw new UnprocessableEntityException(
        `A user with phone ${dto.phone} already exists in temple ${templeId}`,
      );
    }

    // 48-character URL-safe invite token (192 bits of entropy).
    const rawInviteToken = randomBytes(36).toString('base64url');

    const user = this.userRepo.create({
      templeId,
      fullName: dto.fullName,
      phone: dto.phone,
      email: dto.email,
      role: UserRole.ADMIN,
      isActive: true,
      inviteToken: rawInviteToken,
    });

    const saved = await this.userRepo.save(user);
    this.logger.log(
      `Temple ADMIN invited for temple ${templeId} (${temple.slug}): phone=${dto.phone}`,
    );
    return {
      userId: saved.id,
      phone: saved.phone,
      fullName: saved.fullName,
      role: saved.role,
      inviteToken: rawInviteToken,
      message: 'Admin invited successfully',
    };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private toSummary(temple: Partial<Temple> & Pick<Temple, 'id' | 'name' | 'slug'>, donationCount = 0, devoteeCount = 0): TempleSummary {
    return {
      id: temple.id,
      name: temple.name,
      slug: temple.slug,
      plan: temple.plan ?? TemplePlan.STARTER,
      planId: temple.planId,
      planBillingCycle: temple.planBillingCycle,
      planAmount: temple.planAmount,
      planValidUntil: temple.planValidUntil,
      lastPaymentAt: temple.lastPaymentAt,
      isActive: temple.isActive ?? true,
      suspensionReason: temple.suspensionReason,
      createdAt: temple.createdAt ?? new Date(),
      city: temple.city,
      state: temple.state,
      donationCount,
      devoteeCount,
    };
  }
}
