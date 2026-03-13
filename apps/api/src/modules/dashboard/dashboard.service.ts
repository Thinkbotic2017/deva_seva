import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Donation } from '../../database/entities/donation.entity';
import { SevaBooking } from '../../database/entities/seva-booking.entity';
import { Devotee } from '../../database/entities/devotee.entity';
import { DonationStatus, DonationMode, SevaBookingStatus } from '@devaseva/types';

// ─── Result types ─────────────────────────────────────────────────────────────

export interface DashboardStats {
  /** Number of confirmed donations recorded today (temple local date via DB). */
  todayDonationCount: number;
  /** Sum of today's confirmed donations in rupees (decimal string). */
  todayDonationTotal: string;
  /** Sum of this calendar month's confirmed donations (decimal string). */
  monthDonationTotal: string;
  /** Pending+confirmed seva bookings with seva_date >= today. */
  pendingSevaCount: number;
  /** Devotees with non-null, non-deleted records for this temple. */
  activeDevoteeCount: number;
}

/** Donation entry in the unified activity feed. */
export interface DonationActivity {
  type: 'donation';
  id: string;
  donorName: string;
  amount: string;
  mode: DonationMode;
  status: DonationStatus;
  createdAt: Date;
}

/** Seva booking entry in the unified activity feed. */
export interface SevaActivity {
  type: 'seva_booking';
  id: string;
  devoteeName: string;
  amount: string;
  sevaDate: Date;
  status: SevaBookingStatus;
  createdAt: Date;
}

/** Discriminated union — always check `type` before accessing other fields. */
export type ActivityItem = DonationActivity | SevaActivity;

/** Statuses counted as "confirmed" for donation totals. */
const CONFIRMED_STATUSES = [
  DonationStatus.CONFIRMED,
  DonationStatus.RECEIPT_GENERATED,
  DonationStatus.RECEIPT_SENT,
];

/** Statuses counted as "pending" for seva booking totals. */
const PENDING_SEVA_STATUSES = [
  SevaBookingStatus.PENDING_PAYMENT,
  SevaBookingStatus.CONFIRMED,
];

/**
 * DashboardService provides aggregated stats for the temple admin dashboard.
 *
 * All 4 stats are fetched in parallel via Promise.all() — not sequentially.
 * All aggregations use SQL COUNT/SUM — never JS array iteration.
 * templeId always comes from the method parameter (JWT) — never from a request body.
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(SevaBooking)
    private readonly sevaBookingRepo: Repository<SevaBooking>,
    @InjectRepository(Devotee)
    private readonly devoteeRepo: Repository<Devotee>,
  ) {}

  /**
   * Returns the four key stats for the temple dashboard.
   * All queries run in parallel — response time is bounded by the slowest single query.
   *
   * @param templeId  From JWT — never from request params.
   */
  async getStats(templeId: string): Promise<DashboardStats> {
    const [todayRaw, monthRaw, pendingSevaCount, activeDevoteeCount] =
      await Promise.all([
        this.queryTodayDonations(templeId),
        this.queryMonthDonations(templeId),
        this.queryPendingSevaCount(templeId),
        this.queryActiveDevoteeCount(templeId),
      ]);

    return {
      todayDonationCount: parseInt(todayRaw.count ?? '0', 10),
      todayDonationTotal: parseFloat(todayRaw.total ?? '0').toFixed(2),
      monthDonationTotal: parseFloat(monthRaw.total ?? '0').toFixed(2),
      pendingSevaCount,
      activeDevoteeCount,
    };
  }

  /**
   * Returns the last `limit` events (donations + seva bookings) merged into a
   * single activity feed, sorted by created_at descending.
   *
   * Uses a discriminated union type so callers always know which fields are present.
   *
   * @param templeId  From JWT.
   * @param limit     Max number of items. Capped at 100.
   */
  async getRecentActivity(
    templeId: string,
    limit = 20,
  ): Promise<ActivityItem[]> {
    const safeLimit = Math.min(Math.max(1, limit), 100);

    // Fetch independently — merge in JS rather than a complex UNION query
    const [donations, sevaBookings] = await Promise.all([
      this.donationRepo
        .createQueryBuilder('d')
        .select([
          'd.id',
          'd.donorName',
          'd.amount',
          'd.mode',
          'd.status',
          'd.createdAt',
        ])
        .where('d.temple_id = :templeId', { templeId })
        .andWhere('d.deleted_at IS NULL')
        .orderBy('d.created_at', 'DESC')
        .take(safeLimit)
        .getMany(),

      this.sevaBookingRepo
        .createQueryBuilder('sb')
        .select([
          'sb.id',
          'sb.devoteeName',
          'sb.amount',
          'sb.sevaDate',
          'sb.status',
          'sb.createdAt',
        ])
        .where('sb.temple_id = :templeId', { templeId })
        .andWhere('sb.deleted_at IS NULL')
        .orderBy('sb.created_at', 'DESC')
        .take(safeLimit)
        .getMany(),
    ]);

    // Tag each row with its discriminant and cast to ActivityItem
    const donationItems: DonationActivity[] = donations.map((d) => ({
      type: 'donation' as const,
      id: d.id,
      donorName: d.donorName,
      amount: d.amount,
      mode: d.mode,
      status: d.status,
      createdAt: d.createdAt,
    }));

    const sevaItems: SevaActivity[] = sevaBookings.map((sb) => ({
      type: 'seva_booking' as const,
      id: sb.id,
      devoteeName: sb.devoteeName,
      amount: sb.amount,
      sevaDate: sb.sevaDate,
      status: sb.status,
      createdAt: sb.createdAt,
    }));

    // Merge and sort descending by createdAt, then take top N
    return [...donationItems, ...sevaItems]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, safeLimit);
  }

  // ─── Private query helpers ─────────────────────────────────────────────────

  /**
   * Returns today's date and this month's start date in IST (UTC+5:30).
   *
   * PostgreSQL's CURRENT_DATE uses the DB server's timezone (UTC on most hosts).
   * Querying against UTC midnight would miss donations recorded between
   * 00:00–05:30 IST (which fall on the previous UTC date) and over-count
   * donations from the next IST day after 18:30 UTC.
   *
   * We shift by +5:30 to get the IST calendar date, then format as 'YYYY-MM-DD'
   * to pass as a bound parameter. Since payment_date / seva_date are `date`
   * columns (no time component), string comparison is exact.
   */
  private istDates(): { todayIST: string; monthStartIST: string } {
    // Shift current UTC instant to IST by adding 5h 30m
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);

    const yyyy = nowIST.getUTCFullYear();
    const mm   = String(nowIST.getUTCMonth() + 1).padStart(2, '0');
    const dd   = String(nowIST.getUTCDate()).padStart(2, '0');

    return {
      todayIST:      `${yyyy}-${mm}-${dd}`,
      monthStartIST: `${yyyy}-${mm}-01`,
    };
  }

  /** SQL SUM + COUNT for today's confirmed donations (IST date). */
  private async queryTodayDonations(
    templeId: string,
  ): Promise<{ count: string; total: string }> {
    const { todayIST } = this.istDates();

    const row = await this.donationRepo
      .createQueryBuilder('d')
      .select('COUNT(d.id)', 'count')
      .addSelect('COALESCE(SUM(d.amount::numeric), 0)', 'total')
      .where('d.temple_id = :templeId', { templeId })
      .andWhere('d.payment_date = :today', { today: todayIST })
      .andWhere('d.status IN (:...statuses)', { statuses: CONFIRMED_STATUSES })
      .andWhere('d.deleted_at IS NULL')
      .getRawOne<{ count: string; total: string }>();
    return row ?? { count: '0', total: '0' };
  }

  /** SQL SUM for this calendar month's confirmed donations (IST month start). */
  private async queryMonthDonations(
    templeId: string,
  ): Promise<{ total: string }> {
    const { monthStartIST } = this.istDates();

    const row = await this.donationRepo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.amount::numeric), 0)', 'total')
      .where('d.temple_id = :templeId', { templeId })
      .andWhere('d.payment_date >= :monthStart', { monthStart: monthStartIST })
      .andWhere('d.status IN (:...statuses)', { statuses: CONFIRMED_STATUSES })
      .andWhere('d.deleted_at IS NULL')
      .getRawOne<{ total: string }>();
    return row ?? { total: '0' };
  }

  /** SQL COUNT for upcoming pending/confirmed seva bookings (IST today). */
  private async queryPendingSevaCount(templeId: string): Promise<number> {
    const { todayIST } = this.istDates();

    return this.sevaBookingRepo
      .createQueryBuilder('sb')
      .where('sb.temple_id = :templeId', { templeId })
      .andWhere('sb.status IN (:...statuses)', { statuses: PENDING_SEVA_STATUSES })
      .andWhere('sb.seva_date >= :today', { today: todayIST })
      .andWhere('sb.deleted_at IS NULL')
      .getCount();
  }

  /** SQL COUNT of all non-deleted devotees for this temple. */
  private async queryActiveDevoteeCount(templeId: string): Promise<number> {
    return this.devoteeRepo
      .createQueryBuilder('dev')
      .where('dev.temple_id = :templeId', { templeId })
      .andWhere('dev.deleted_at IS NULL')
      .getCount();
  }
}
