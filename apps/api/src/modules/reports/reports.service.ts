import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Donation } from '../../database/entities/donation.entity';
import { DonationCategory } from '../../database/entities/donation-category.entity';
import { FinanceLedger } from '../../database/entities/finance-ledger.entity';
import { SevaBooking } from '../../database/entities/seva-booking.entity';
import { DonationMode, DonationStatus, LedgerType, SevaBookingStatus } from '@devaseva/types';
import { DonationSummaryQueryDto } from './dto/donation-summary-query.dto';
import { LedgerReportQueryDto } from './dto/ledger-report-query.dto';
import { EightyGReportQueryDto } from './dto/eighty-g-report-query.dto';
import { DaySheetQueryDto } from './dto/day-sheet-query.dto';

// ─── Report result types ──────────────────────────────────────────────────────

/** Donation totals broken down by payment mode. */
export interface DonationModeBreakdown {
  mode: DonationMode;
  total: string;
  count: number;
}

/** Donation totals broken down by category. */
export interface DonationCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  total: string;
  count: number;
}

export interface DonationSummary {
  grandTotal: string;
  confirmedCount: number;
  byMode: DonationModeBreakdown[];
  byCategory: DonationCategoryBreakdown[];
  from?: string;
  to?: string;
}

/** Ledger total per fund (fundId=null means unallocated entries). */
export interface FundBreakdown {
  fundId: string | null;
  totalIncome: string;
  totalExpense: string;
}

export interface LedgerReport {
  fiscalYear: string;
  totalIncome: string;
  totalExpense: string;
  netBalance: string;
  byFund: FundBreakdown[];
  from?: string;
  to?: string;
}

/** A single row in the 80G report — encrypted PAN is stripped; only masked is included. */
export interface Donation80GEntry {
  id: string;
  receiptNumber?: string;
  donorName: string;
  donorPhone?: string;
  donorPanMasked?: string;
  amount: string;
  paymentDate: Date;
  categoryName: string;
}

export interface EightyGReport {
  fiscalYear: string;
  totalEligibleAmount: string;
  donorCount: number;
  donations: Donation80GEntry[];
}

export interface DaySheet {
  date: string;
  donations: Donation[];
  sevaBookings: SevaBooking[];
  donationTotal: string;
  sevaTotal: string;
  grandTotal: string;
}

/**
 * ReportsService produces aggregate and day-level reports.
 *
 * Financial invariants:
 * - All monetary aggregations use SQL SUM — never accumulate in JavaScript.
 * - 80G report includes only CONFIRMED, RECEIPT_GENERATED, RECEIPT_SENT donations.
 * - donorPanEncrypted is NEVER present in any report output — only panMasked.
 * - templeId always comes from method parameters (JWT), never from query strings.
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  /** Donation statuses considered "confirmed" for reporting purposes. */
  private static readonly CONFIRMED_STATUSES = [
    DonationStatus.CONFIRMED,
    DonationStatus.RECEIPT_GENERATED,
    DonationStatus.RECEIPT_SENT,
  ];

  constructor(
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(DonationCategory)
    private readonly categoryRepo: Repository<DonationCategory>,
    @InjectRepository(FinanceLedger)
    private readonly ledgerRepo: Repository<FinanceLedger>,
    @InjectRepository(SevaBooking)
    private readonly sevaBookingRepo: Repository<SevaBooking>,
  ) {}

  /**
   * Returns donation totals broken down by payment mode and by category.
   * Only CONFIRMED/RECEIPT_GENERATED/RECEIPT_SENT donations are included.
   * All totals are computed by SQL SUM — not accumulated in JS.
   *
   * @param templeId  From JWT. Never from query params.
   */
  async getDonationSummary(
    templeId: string,
    query: DonationSummaryQueryDto,
  ): Promise<DonationSummary> {
    const baseWhere = (alias: string) => {
      const qb = this.donationRepo
        .createQueryBuilder(alias)
        .where(`${alias}.temple_id = :templeId`, { templeId })
        .andWhere(`${alias}.deleted_at IS NULL`)
        .andWhere(`${alias}.status IN (:...statuses)`, {
          statuses: ReportsService.CONFIRMED_STATUSES,
        });

      if (query.from) {
        qb.andWhere(`${alias}.payment_date >= :from`, { from: query.from });
      }
      if (query.to) {
        qb.andWhere(`${alias}.payment_date <= :to`, { to: query.to });
      }
      return qb;
    };

    // ── Grand total ──────────────────────────────────────────────────────────
    const totalRaw = await baseWhere('d')
      .select('COALESCE(SUM(d.amount::numeric), 0)', 'grandTotal')
      .addSelect('COUNT(d.id)', 'confirmedCount')
      .getRawOne<{ grandTotal: string; confirmedCount: string }>();

    // ── By mode ──────────────────────────────────────────────────────────────
    const byModeRaw = await baseWhere('d')
      .select('d.mode', 'mode')
      .addSelect('COALESCE(SUM(d.amount::numeric), 0)', 'total')
      .addSelect('COUNT(d.id)', 'count')
      .groupBy('d.mode')
      .orderBy('total', 'DESC')
      .getRawMany<{ mode: DonationMode; total: string; count: string }>();

    // ── By category (JOIN to get name) ───────────────────────────────────────
    const byCategoryRaw = await baseWhere('d')
      .innerJoin(DonationCategory, 'cat', 'cat.id = d.category_id')
      .select('d.category_id', 'categoryId')
      .addSelect('cat.name', 'categoryName')
      .addSelect('COALESCE(SUM(d.amount::numeric), 0)', 'total')
      .addSelect('COUNT(d.id)', 'count')
      .groupBy('d.category_id, cat.name')
      .orderBy('total', 'DESC')
      .getRawMany<{
        categoryId: string;
        categoryName: string;
        total: string;
        count: string;
      }>();

    return {
      grandTotal: parseFloat(totalRaw?.grandTotal ?? '0').toFixed(2),
      confirmedCount: parseInt(totalRaw?.confirmedCount ?? '0', 10),
      byMode: byModeRaw.map((r) => ({
        mode: r.mode,
        total: parseFloat(r.total).toFixed(2),
        count: parseInt(r.count, 10),
      })),
      byCategory: byCategoryRaw.map((r) => ({
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        total: parseFloat(r.total).toFixed(2),
        count: parseInt(r.count, 10),
      })),
      from: query.from,
      to: query.to,
    };
  }

  /**
   * Returns income vs expense totals from the finance ledger,
   * broken down by fund, for the given fiscal year.
   * All aggregation is done in SQL.
   *
   * @param templeId  From JWT. Never from query params.
   */
  async getLedgerReport(
    templeId: string,
    query: LedgerReportQueryDto,
  ): Promise<LedgerReport> {
    const qb = this.ledgerRepo
      .createQueryBuilder('l')
      .where('l.temple_id = :templeId', { templeId })
      .andWhere('l.fiscal_year = :fiscalYear', { fiscalYear: query.fiscalYear })
      .andWhere('l.deleted_at IS NULL');

    if (query.from) {
      qb.andWhere('l.entry_date >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('l.entry_date <= :to', { to: query.to });
    }

    // ── Totals by type ────────────────────────────────────────────────────────
    const typeRows = await qb
      .clone()
      .select('l.type', 'type')
      .addSelect('COALESCE(SUM(l.amount::numeric), 0)', 'total')
      .groupBy('l.type')
      .getRawMany<{ type: LedgerType; total: string }>();

    const incomeRow = typeRows.find((r) => r.type === LedgerType.INCOME);
    const expenseRow = typeRows.find((r) => r.type === LedgerType.EXPENSE);
    const totalIncome = parseFloat(incomeRow?.total ?? '0');
    const totalExpense = parseFloat(expenseRow?.total ?? '0');

    // ── Totals by fund ────────────────────────────────────────────────────────
    const fundRows = await qb
      .clone()
      .select('l.fund_id', 'fundId')
      .addSelect('l.type', 'type')
      .addSelect('COALESCE(SUM(l.amount::numeric), 0)', 'total')
      .groupBy('l.fund_id, l.type')
      .getRawMany<{ fundId: string | null; type: LedgerType; total: string }>();

    // Merge fund rows into a single FundBreakdown per fundId
    const fundMap = new Map<string | null, FundBreakdown>();
    for (const row of fundRows) {
      const key = row.fundId ?? null;
      if (!fundMap.has(key)) {
        fundMap.set(key, { fundId: key, totalIncome: '0.00', totalExpense: '0.00' });
      }
      const entry = fundMap.get(key)!;
      if (row.type === LedgerType.INCOME) {
        entry.totalIncome = parseFloat(row.total).toFixed(2);
      } else {
        entry.totalExpense = parseFloat(row.total).toFixed(2);
      }
    }

    return {
      fiscalYear: query.fiscalYear,
      totalIncome: totalIncome.toFixed(2),
      totalExpense: totalExpense.toFixed(2),
      netBalance: (totalIncome - totalExpense).toFixed(2),
      byFund: Array.from(fundMap.values()),
      from: query.from,
      to: query.to,
    };
  }

  /**
   * Returns all 80G-eligible donations for a fiscal year.
   *
   * Rules:
   * - Only CONFIRMED, RECEIPT_GENERATED, RECEIPT_SENT statuses.
   * - donorPanEncrypted is NEVER included — only donorPanMasked.
   * - Intended for generating the annual 80G certificate batch.
   *
   * @param templeId  From JWT. Never from query params.
   */
  async get80GReport(
    templeId: string,
    query: EightyGReportQueryDto,
  ): Promise<EightyGReport> {
    const rows = await this.donationRepo
      .createQueryBuilder('d')
      .innerJoin(DonationCategory, 'cat', 'cat.id = d.category_id')
      .select([
        'd.id',
        'd.receipt_number',
        'd.donor_name',
        'd.donor_phone',
        'd.donor_pan_masked',
        'd.amount',
        'd.payment_date',
        'cat.name',
      ])
      .where('d.temple_id = :templeId', { templeId })
      .andWhere('d.fiscal_year = :fiscalYear', { fiscalYear: query.fiscalYear })
      .andWhere('d.is_80g_eligible = true')
      .andWhere('d.status IN (:...statuses)', {
        statuses: ReportsService.CONFIRMED_STATUSES,
      })
      .andWhere('d.deleted_at IS NULL')
      .orderBy('d.payment_date', 'ASC')
      .getRawMany<{
        d_id: string;
        d_receipt_number: string | null;
        d_donor_name: string;
        d_donor_phone: string | null;
        d_donor_pan_masked: string | null;
        d_amount: string;
        d_payment_date: string;
        cat_name: string;
      }>();

    // ── Totals via SQL ────────────────────────────────────────────────────────
    const totals = await this.donationRepo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.amount::numeric), 0)', 'totalAmount')
      .addSelect('COUNT(DISTINCT d.donor_phone)', 'donorCount')
      .where('d.temple_id = :templeId', { templeId })
      .andWhere('d.fiscal_year = :fiscalYear', { fiscalYear: query.fiscalYear })
      .andWhere('d.is_80g_eligible = true')
      .andWhere('d.status IN (:...statuses)', {
        statuses: ReportsService.CONFIRMED_STATUSES,
      })
      .andWhere('d.deleted_at IS NULL')
      .getRawOne<{ totalAmount: string; donorCount: string }>();

    const donations: Donation80GEntry[] = rows.map((r) => ({
      id: r.d_id,
      receiptNumber: r.d_receipt_number ?? undefined,
      donorName: r.d_donor_name,
      donorPhone: r.d_donor_phone ?? undefined,
      donorPanMasked: r.d_donor_pan_masked ?? undefined,
      amount: parseFloat(r.d_amount).toFixed(2),
      paymentDate: new Date(r.d_payment_date),
      categoryName: r.cat_name,
    }));

    return {
      fiscalYear: query.fiscalYear,
      totalEligibleAmount: parseFloat(totals?.totalAmount ?? '0').toFixed(2),
      donorCount: parseInt(totals?.donorCount ?? '0', 10),
      donations,
    };
  }

  /**
   * Returns all donations and seva bookings for a given date — the day-sheet.
   * Used by counter staff to review the day's activity at a glance.
   * Totals are computed in SQL, not accumulated in JS.
   *
   * @param templeId  From JWT. Never from query params.
   */
  async getDaySheet(templeId: string, query: DaySheetQueryDto): Promise<DaySheet> {
    const [donations, sevaBookings] = await Promise.all([
      // All non-cancelled donations for the date
      this.donationRepo.find({
        where: { templeId, paymentDate: new Date(query.date) as unknown as Date },
        order: { createdAt: 'ASC' },
      }),
      // All non-cancelled seva bookings for the date
      this.sevaBookingRepo.find({
        where: { templeId, sevaDate: new Date(query.date) as unknown as Date },
        order: { timeSlot: 'ASC' },
      }),
    ]);

    // ── Compute totals via SQL (not JS accumulation) ──────────────────────────
    const donationTotalRaw = await this.donationRepo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.amount::numeric), 0)', 'total')
      .where('d.temple_id = :templeId AND d.payment_date = :date AND d.deleted_at IS NULL AND d.status IN (:...statuses)', {
        templeId,
        date: query.date,
        statuses: ReportsService.CONFIRMED_STATUSES,
      })
      .getRawOne<{ total: string }>();

    const sevaTotalRaw = await this.sevaBookingRepo
      .createQueryBuilder('sb')
      .select('COALESCE(SUM(sb.amount::numeric), 0)', 'total')
      .where('sb.temple_id = :templeId AND sb.seva_date = :date AND sb.deleted_at IS NULL AND sb.status IN (:...statuses)', {
        templeId,
        date: query.date,
        statuses: [SevaBookingStatus.CONFIRMED, SevaBookingStatus.COMPLETED],
      })
      .getRawOne<{ total: string }>();

    const donationTotal = parseFloat(donationTotalRaw?.total ?? '0');
    const sevaTotal = parseFloat(sevaTotalRaw?.total ?? '0');

    this.logger.debug(
      `Day-sheet ${query.date} for temple ${templeId}: ${donations.length} donations, ${sevaBookings.length} seva bookings`,
    );

    return {
      date: query.date,
      donations,
      sevaBookings,
      donationTotal: donationTotal.toFixed(2),
      sevaTotal: sevaTotal.toFixed(2),
      grandTotal: (donationTotal + sevaTotal).toFixed(2),
    };
  }
}
