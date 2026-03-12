import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Temple } from '../../database/entities/temple.entity';
import { Donation } from '../../database/entities/donation.entity';
import { TemplePlan, DonationStatus } from '@devaseva/types';

// ─── Result types ─────────────────────────────────────────────────────────────

/** Minimal temple summary for the superadmin temple list. */
export interface TempleSummary {
  id: string;
  name: string;
  slug: string;
  plan: TemplePlan;
  isActive: boolean;
  createdAt: Date;
  city?: string;
  state?: string;
}

/** Platform-wide aggregated metrics for the superadmin system view. */
export interface SystemStats {
  /** Total temples registered on the platform. */
  totalTemples: number;
  /** Total confirmed donations across ALL temples. */
  totalDonations: number;
  /** Sum of all confirmed donation amounts across ALL temples (decimal string). */
  totalRevenue: string;
}

/** Confirmed donation statuses for revenue aggregation. */
const CONFIRMED_STATUSES = [
  DonationStatus.CONFIRMED,
  DonationStatus.RECEIPT_GENERATED,
  DonationStatus.RECEIPT_SENT,
];

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
  ) {}

  /**
   * Returns all temples with their plan, status, and creation date.
   * No templeId filter — intentional for superadmin visibility.
   */
  async listTemples(): Promise<TempleSummary[]> {
    const temples = await this.templeRepo.find({
      select: ['id', 'name', 'slug', 'plan', 'isActive', 'createdAt', 'city', 'state'],
      order: { createdAt: 'DESC' },
    });

    return temples.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      isActive: t.isActive,
      createdAt: t.createdAt,
      city: t.city,
      state: t.state,
    }));
  }

  /**
   * Suspends a temple by setting isActive=false.
   * All users of this temple will fail JWT auth on the next request
   * because AuthService checks temple.isActive during me() and verifyOtp().
   *
   * Idempotent — suspending an already-suspended temple is a no-op.
   */
  async suspendTemple(templeId: string): Promise<TempleSummary> {
    const temple = await this.templeRepo.findOne({ where: { id: templeId } });
    if (!temple) {
      throw new NotFoundException(`Temple ${templeId} not found`);
    }

    await this.templeRepo.update(templeId, { isActive: false });
    this.logger.log(`Temple ${templeId} (${temple.slug}) suspended`);

    return this.toSummary({ ...temple, isActive: false });
  }

  /**
   * Re-activates a suspended temple by setting isActive=true.
   * Idempotent — activating an already-active temple is a no-op.
   */
  async activateTemple(templeId: string): Promise<TempleSummary> {
    const temple = await this.templeRepo.findOne({ where: { id: templeId } });
    if (!temple) {
      throw new NotFoundException(`Temple ${templeId} not found`);
    }

    await this.templeRepo.update(templeId, { isActive: true });
    this.logger.log(`Temple ${templeId} (${temple.slug}) activated`);

    return this.toSummary({ ...temple, isActive: true });
  }

  /**
   * Returns platform-wide aggregated metrics.
   * Queries run in parallel via Promise.all().
   * Revenue is summed across ALL temples — this is intentional for superadmin.
   */
  async getSystemStats(): Promise<SystemStats> {
    const [totalTemples, revenueRaw] = await Promise.all([
      this.templeRepo.count(),
      this.donationRepo
        .createQueryBuilder('d')
        .select('COUNT(d.id)', 'count')
        .addSelect('COALESCE(SUM(d.amount::numeric), 0)', 'total')
        .where('d.status IN (:...statuses)', { statuses: CONFIRMED_STATUSES })
        .andWhere('d.deleted_at IS NULL')
        .getRawOne<{ count: string; total: string }>(),
    ]);

    return {
      totalTemples,
      totalDonations: parseInt(revenueRaw?.count ?? '0', 10),
      totalRevenue: parseFloat(revenueRaw?.total ?? '0').toFixed(2),
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private toSummary(temple: Temple): TempleSummary {
    return {
      id: temple.id,
      name: temple.name,
      slug: temple.slug,
      plan: temple.plan,
      isActive: temple.isActive,
      createdAt: temple.createdAt,
      city: temple.city,
      state: temple.state,
    };
  }
}
