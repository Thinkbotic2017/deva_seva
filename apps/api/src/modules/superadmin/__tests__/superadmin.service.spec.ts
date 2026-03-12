import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { SuperAdminService } from '../superadmin.service';
import { Temple } from '../../../database/entities/temple.entity';
import { Donation } from '../../../database/entities/donation.entity';
import { TemplePlan } from '@devaseva/types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TEMPLE_ID = 'temple-uuid';

const MOCK_TEMPLE: Partial<Temple> = {
  id: TEMPLE_ID,
  name: 'Shri Ram Mandir',
  slug: 'shri-ram-mandir',
  plan: TemplePlan.STARTER,
  isActive: true,
  createdAt: new Date('2025-01-01'),
  city: 'Ayodhya',
  state: 'UP',
};

function makeQb(rawResult: unknown = { count: '0', total: '0' }) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(rawResult),
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('SuperAdminService', () => {
  let service: SuperAdminService;
  let templeRepo: Record<string, jest.Mock>;
  let donationRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    templeRepo = {
      find: jest.fn().mockResolvedValue([{ ...MOCK_TEMPLE }]),
      findOne: jest.fn().mockResolvedValue({ ...MOCK_TEMPLE }),
      update: jest.fn().mockResolvedValue(undefined),
      count: jest.fn().mockResolvedValue(7),
    };
    donationRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(
        makeQb({ count: '350', total: '1785000.00' }),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SuperAdminService,
        { provide: getRepositoryToken(Temple), useValue: templeRepo },
        { provide: getRepositoryToken(Donation), useValue: donationRepo },
      ],
    }).compile();

    service = moduleRef.get(SuperAdminService);
  });

  // ── listTemples() ──────────────────────────────────────────────────────────

  describe('listTemples()', () => {
    it('returns a summary for each temple', async () => {
      const result = await service.listTemples();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: TEMPLE_ID,
        name: MOCK_TEMPLE.name,
        slug: MOCK_TEMPLE.slug,
        plan: TemplePlan.STARTER,
        isActive: true,
      });
    });

    it('does NOT include razorpayKeySecret in the response', async () => {
      templeRepo.find.mockResolvedValue([
        { ...MOCK_TEMPLE, razorpayKeySecret: 'super-secret' },
      ]);

      const result = await service.listTemples();

      expect(
        (result[0] as unknown as Record<string, unknown>)['razorpayKeySecret'],
      ).toBeUndefined();
    });
  });

  // ── suspendTemple() ────────────────────────────────────────────────────────

  describe('suspendTemple()', () => {
    it('sets isActive=false on the temple', async () => {
      await service.suspendTemple(TEMPLE_ID);

      expect(templeRepo.update).toHaveBeenCalledWith(TEMPLE_ID, { isActive: false });
    });

    it('returns the updated summary with isActive=false', async () => {
      const result = await service.suspendTemple(TEMPLE_ID);

      expect(result.isActive).toBe(false);
    });

    it('throws NotFoundException when temple does not exist', async () => {
      templeRepo.findOne.mockResolvedValue(null);

      await expect(service.suspendTemple(TEMPLE_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── activateTemple() ───────────────────────────────────────────────────────

  describe('activateTemple()', () => {
    it('sets isActive=true on the temple', async () => {
      templeRepo.findOne.mockResolvedValue({ ...MOCK_TEMPLE, isActive: false });

      await service.activateTemple(TEMPLE_ID);

      expect(templeRepo.update).toHaveBeenCalledWith(TEMPLE_ID, { isActive: true });
    });

    it('returns the updated summary with isActive=true', async () => {
      templeRepo.findOne.mockResolvedValue({ ...MOCK_TEMPLE, isActive: false });

      const result = await service.activateTemple(TEMPLE_ID);

      expect(result.isActive).toBe(true);
    });

    it('throws NotFoundException when temple does not exist', async () => {
      templeRepo.findOne.mockResolvedValue(null);

      await expect(service.activateTemple(TEMPLE_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ── getSystemStats() ───────────────────────────────────────────────────────

  describe('getSystemStats()', () => {
    it('returns totalTemples, totalDonations, and totalRevenue', async () => {
      const stats = await service.getSystemStats();

      expect(stats.totalTemples).toBe(7);
      expect(stats.totalDonations).toBe(350);
      expect(stats.totalRevenue).toBe('1785000.00');
    });

    it('returns zero values when there is no donation data', async () => {
      donationRepo.createQueryBuilder.mockReturnValue(
        makeQb({ count: '0', total: '0' }),
      );

      const stats = await service.getSystemStats();

      expect(stats.totalDonations).toBe(0);
      expect(stats.totalRevenue).toBe('0.00');
    });

    it('does NOT scope the revenue query to a single templeId', async () => {
      await service.getSystemStats();

      const qbInstance = donationRepo.createQueryBuilder.mock.results[0].value;
      // where() should only be called for status filter — NOT for temple_id
      const whereCalls = (qbInstance.where as jest.Mock).mock.calls;
      const hasTempleFilter = whereCalls.some(
        (args: unknown[]) =>
          typeof args[0] === 'string' &&
          (args[0] as string).includes('temple_id'),
      );
      expect(hasTempleFilter).toBe(false);
    });

    it('formats revenue to exactly 2 decimal places', async () => {
      donationRepo.createQueryBuilder.mockReturnValue(
        makeQb({ count: '1', total: '5100' }),
      );

      const stats = await service.getSystemStats();

      expect(stats.totalRevenue).toBe('5100.00');
    });
  });
});
