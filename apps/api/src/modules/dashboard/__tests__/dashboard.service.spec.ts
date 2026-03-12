import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService, ActivityItem } from '../dashboard.service';
import { Donation } from '../../../database/entities/donation.entity';
import { SevaBooking } from '../../../database/entities/seva-booking.entity';
import { Devotee } from '../../../database/entities/devotee.entity';
import { DonationMode, DonationStatus, SevaBookingStatus } from '@devaseva/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLE_ID = 'temple-uuid';

// ─── Query builder factories ──────────────────────────────────────────────────

/** Creates a QB that returns rawResult from getRawOne() and count from getCount(). */
function makeRawQb(rawResult: unknown = { count: '0', total: '0' }, count = 0) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(rawResult),
    getCount: jest.fn().mockResolvedValue(count),
    getMany: jest.fn().mockResolvedValue([]),
  };
}

/** Creates a QB whose getMany() returns the given rows. */
function makeManyQb(rows: unknown[] = []) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
    getCount: jest.fn().mockResolvedValue(0),
    getRawOne: jest.fn().mockResolvedValue(null),
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('DashboardService', () => {

  // ── getStats() ─────────────────────────────────────────────────────────────

  describe('getStats()', () => {
    let service: DashboardService;
    let donationRepo: Record<string, jest.Mock>;
    let sevaBookingRepo: Record<string, jest.Mock>;
    let devoteeRepo: Record<string, jest.Mock>;

    /**
     * Builds the module wired for getStats() tests.
     * donationRepo.createQueryBuilder returns todayQb first, then monthQb.
     * sevaBookingRepo.createQueryBuilder returns a count QB.
     * devoteeRepo.createQueryBuilder returns a count QB.
     */
    async function build(opts?: {
      todayRaw?: unknown;
      monthRaw?: unknown;
      pendingSevaCount?: number;
      activeDevoteeCount?: number;
    }) {
      const todayQb = makeRawQb(opts?.todayRaw ?? { count: '5', total: '25500.00' });
      const monthQb = makeRawQb(opts?.monthRaw ?? { total: '102000.00' });
      const sevaCountQb = makeRawQb(undefined, opts?.pendingSevaCount ?? 3);
      const devoteeCountQb = makeRawQb(undefined, opts?.activeDevoteeCount ?? 120);

      // getStats() calls donationRepo.createQueryBuilder twice: today, then month
      let donationCallIdx = 0;
      donationRepo = {
        createQueryBuilder: jest.fn().mockImplementation(() =>
          donationCallIdx++ === 0 ? todayQb : monthQb,
        ),
      };
      sevaBookingRepo = { createQueryBuilder: jest.fn().mockReturnValue(sevaCountQb) };
      devoteeRepo = { createQueryBuilder: jest.fn().mockReturnValue(devoteeCountQb) };

      const moduleRef = await Test.createTestingModule({
        providers: [
          DashboardService,
          { provide: getRepositoryToken(Donation), useValue: donationRepo },
          { provide: getRepositoryToken(SevaBooking), useValue: sevaBookingRepo },
          { provide: getRepositoryToken(Devotee), useValue: devoteeRepo },
        ],
      }).compile();

      service = moduleRef.get(DashboardService);
    }

    beforeEach(() => build());

    it('returns all 4 stats correctly parsed from SQL results', async () => {
      const stats = await service.getStats(TEMPLE_ID);

      expect(stats.todayDonationCount).toBe(5);
      expect(stats.todayDonationTotal).toBe('25500.00');
      expect(stats.monthDonationTotal).toBe('102000.00');
      expect(stats.pendingSevaCount).toBe(3);
      expect(stats.activeDevoteeCount).toBe(120);
    });

    it('returns zero values when there is no activity', async () => {
      await build({
        todayRaw: { count: '0', total: '0' },
        monthRaw: { total: '0' },
        pendingSevaCount: 0,
        activeDevoteeCount: 0,
      });

      const stats = await service.getStats(TEMPLE_ID);

      expect(stats.todayDonationCount).toBe(0);
      expect(stats.todayDonationTotal).toBe('0.00');
      expect(stats.monthDonationTotal).toBe('0.00');
      expect(stats.pendingSevaCount).toBe(0);
      expect(stats.activeDevoteeCount).toBe(0);
    });

    it('runs all 4 queries (both repos called, donation repo called twice)', async () => {
      await service.getStats(TEMPLE_ID);

      expect(donationRepo.createQueryBuilder).toHaveBeenCalledTimes(2);
      expect(sevaBookingRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(devoteeRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('scopes today donations query to templeId', async () => {
      await service.getStats(TEMPLE_ID);

      // First QB = today query
      const todayQbInstance = donationRepo.createQueryBuilder.mock.results[0].value;
      expect(todayQbInstance.where).toHaveBeenCalledWith(
        expect.stringContaining('temple_id'),
        expect.objectContaining({ templeId: TEMPLE_ID }),
      );
    });

    it('filters today donations by CURRENT_DATE', async () => {
      await service.getStats(TEMPLE_ID);

      const todayQbInstance = donationRepo.createQueryBuilder.mock.results[0].value;
      expect(todayQbInstance.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('CURRENT_DATE'),
      );
    });

    it('filters month donations with DATE_TRUNC', async () => {
      await service.getStats(TEMPLE_ID);

      const monthQbInstance = donationRepo.createQueryBuilder.mock.results[1].value;
      expect(monthQbInstance.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("DATE_TRUNC('month'"),
      );
    });

    it('formats decimal totals to 2dp even when SQL returns integer-like string', async () => {
      await build({
        todayRaw: { count: '1', total: '5100' },
        monthRaw: { total: '5100' },
      });

      const stats = await service.getStats(TEMPLE_ID);

      expect(stats.todayDonationTotal).toBe('5100.00');
      expect(stats.monthDonationTotal).toBe('5100.00');
    });
  });

  // ── getRecentActivity() ───────────────────────────────────────────────────

  describe('getRecentActivity()', () => {
    let service: DashboardService;
    let donationRepo: Record<string, jest.Mock>;
    let sevaBookingRepo: Record<string, jest.Mock>;
    let devoteeRepo: Record<string, jest.Mock>;

    /**
     * Builds the module wired for getRecentActivity() tests.
     * donationRepo.createQueryBuilder always returns a getMany QB.
     * sevaBookingRepo.createQueryBuilder always returns a getMany QB.
     */
    async function build(opts?: {
      donationRows?: unknown[];
      sevaRows?: unknown[];
    }) {
      const donationQb = makeManyQb(opts?.donationRows ?? []);
      const sevaQb = makeManyQb(opts?.sevaRows ?? []);

      donationRepo = { createQueryBuilder: jest.fn().mockReturnValue(donationQb) };
      sevaBookingRepo = { createQueryBuilder: jest.fn().mockReturnValue(sevaQb) };
      devoteeRepo = { createQueryBuilder: jest.fn().mockReturnValue(makeRawQb()) };

      const moduleRef = await Test.createTestingModule({
        providers: [
          DashboardService,
          { provide: getRepositoryToken(Donation), useValue: donationRepo },
          { provide: getRepositoryToken(SevaBooking), useValue: sevaBookingRepo },
          { provide: getRepositoryToken(Devotee), useValue: devoteeRepo },
        ],
      }).compile();

      service = moduleRef.get(DashboardService);
    }

    beforeEach(() => build());

    it('returns a discriminated union with type field on each item', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 60_000);

      await build({
        donationRows: [{
          id: 'd1',
          donorName: 'Ramesh Kumar',
          amount: '5100.00',
          mode: DonationMode.CASH,
          status: DonationStatus.CONFIRMED,
          createdAt: now,
        }],
        sevaRows: [{
          id: 'sb1',
          devoteeName: 'Priya Sharma',
          amount: '1100.00',
          sevaDate: now,
          status: SevaBookingStatus.CONFIRMED,
          createdAt: earlier,
        }],
      });

      const activity = await service.getRecentActivity(TEMPLE_ID, 10);

      expect(activity).toHaveLength(2);
      expect(activity[0].type).toBe('donation');
      expect(activity[1].type).toBe('seva_booking');

      const donItem = activity[0] as Extract<ActivityItem, { type: 'donation' }>;
      expect(donItem.donorName).toBe('Ramesh Kumar');

      const sevaItem = activity[1] as Extract<ActivityItem, { type: 'seva_booking' }>;
      expect(sevaItem.devoteeName).toBe('Priya Sharma');
    });

    it('sorts items by createdAt descending', async () => {
      const t1 = new Date('2025-06-15T10:00:00Z');
      const t2 = new Date('2025-06-15T09:00:00Z');
      const t3 = new Date('2025-06-15T08:00:00Z');

      await build({
        donationRows: [
          { id: 'd1', donorName: 'A', amount: '100.00', mode: DonationMode.CASH, status: DonationStatus.CONFIRMED, createdAt: t2 },
        ],
        sevaRows: [
          { id: 'sb1', devoteeName: 'B', amount: '200.00', sevaDate: t1, status: SevaBookingStatus.CONFIRMED, createdAt: t1 },
          { id: 'sb2', devoteeName: 'C', amount: '300.00', sevaDate: t3, status: SevaBookingStatus.CONFIRMED, createdAt: t3 },
        ],
      });

      const activity = await service.getRecentActivity(TEMPLE_ID, 10);

      expect(activity.map((i) => i.id)).toEqual(['sb1', 'd1', 'sb2']);
    });

    it('caps result at the requested limit', async () => {
      const donations = Array.from({ length: 10 }, (_, i) => ({
        id: `d${i}`,
        donorName: `Donor ${i}`,
        amount: '100.00',
        mode: DonationMode.CASH,
        status: DonationStatus.CONFIRMED,
        createdAt: new Date(Date.now() - i * 1000),
      }));

      await build({ donationRows: donations, sevaRows: [] });

      const activity = await service.getRecentActivity(TEMPLE_ID, 5);
      expect(activity).toHaveLength(5);
    });

    it('returns empty array when there is no activity', async () => {
      const activity = await service.getRecentActivity(TEMPLE_ID, 20);
      expect(activity).toEqual([]);
    });

    it('caps limit at 100 even when a higher value is passed', async () => {
      await service.getRecentActivity(TEMPLE_ID, 9999);

      const donQbInstance = donationRepo.createQueryBuilder.mock.results[0].value;
      expect(donQbInstance.take).toHaveBeenCalledWith(100);
    });

    it('scopes activity queries to templeId', async () => {
      await service.getRecentActivity(TEMPLE_ID, 10);

      const donQbInstance = donationRepo.createQueryBuilder.mock.results[0].value;
      expect(donQbInstance.where).toHaveBeenCalledWith(
        expect.stringContaining('temple_id'),
        expect.objectContaining({ templeId: TEMPLE_ID }),
      );
    });
  });
});
