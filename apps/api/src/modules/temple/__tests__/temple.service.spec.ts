import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TempleService } from '../temple.service';
import { Temple } from '../../../database/entities/temple.entity';
import { DonationCategory } from '../../../database/entities/donation-category.entity';
import { FinanceCategory } from '../../../database/entities/finance-category.entity';
import { S3Service } from '../../../common/services/s3.service';
import { FinanceCategoryType } from '@devaseva/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLE_ID = 'temple-uuid';

const MOCK_TEMPLE: Partial<Temple> = {
  id: TEMPLE_ID,
  name: 'Shri Ram Mandir',
  slug: 'shri-ram-mandir',
  is80gRegistered: false,
  isActive: true,
  razorpayKeySecret: 'encrypted-secret',
  logoUrl: undefined,
  bannerUrl: undefined,
};

// ─── Mock factory ────────────────────────────────────────────────────────────

/** Builds a mock EntityManager that captures save() calls. */
function makeEntityManager() {
  const savedEntities: unknown[] = [];
  return {
    create: jest.fn((_, data: unknown) => ({ ...(data as object) })),
    save: jest.fn().mockImplementation((EntityOrArray: unknown, data?: unknown) => {
      const entity = data ?? EntityOrArray;
      if (Array.isArray(entity)) {
        savedEntities.push(...entity);
        return Promise.resolve(entity);
      }
      savedEntities.push(entity);
      return Promise.resolve({ ...(entity as object), id: TEMPLE_ID });
    }),
    _savedEntities: savedEntities,
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('TempleService', () => {
  let service: TempleService;
  let templeRepo: Record<string, jest.Mock>;
  let donationCategoryRepo: Record<string, jest.Mock>;
  let financeCategoryRepo: Record<string, jest.Mock>;
  let s3Service: jest.Mocked<S3Service>;
  let dataSource: { transaction: jest.Mock };
  let entityManager: ReturnType<typeof makeEntityManager>;

  beforeEach(async () => {
    entityManager = makeEntityManager();

    templeRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(undefined),
    };
    donationCategoryRepo = {};
    financeCategoryRepo = {};
    s3Service = {
      getPresignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/logo.png'),
      upload: jest.fn(),
    } as unknown as jest.Mocked<S3Service>;
    dataSource = {
      transaction: jest.fn().mockImplementation((cb: (em: unknown) => Promise<unknown>) =>
        cb(entityManager),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TempleService,
        { provide: getRepositoryToken(Temple), useValue: templeRepo },
        { provide: getRepositoryToken(DonationCategory), useValue: donationCategoryRepo },
        { provide: getRepositoryToken(FinanceCategory), useValue: financeCategoryRepo },
        { provide: S3Service, useValue: s3Service },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(TempleService);
  });

  // ── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    const CREATE_DTO = { name: 'Shri Ram Mandir', slug: 'shri-ram-mandir' };

    it('creates a temple inside a transaction', async () => {
      await service.create(CREATE_DTO);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when slug is already taken', async () => {
      templeRepo.findOne.mockResolvedValue({ ...MOCK_TEMPLE });

      await expect(service.create(CREATE_DTO)).rejects.toThrow(ConflictException);
    });

    it('seeds exactly 5 donation categories in the same transaction', async () => {
      await service.create(CREATE_DTO);

      // All save() calls go through the entity manager
      const savedDonationCats = entityManager._savedEntities.filter(
        (e) => typeof (e as Record<string, unknown>)['is80gEligible'] === 'boolean',
      );
      expect(savedDonationCats).toHaveLength(5);
    });

    it('seeds the 5 expected category names', async () => {
      await service.create(CREATE_DTO);

      const savedCats = entityManager._savedEntities.filter(
        (e) => typeof (e as Record<string, unknown>)['is80gEligible'] === 'boolean',
      );
      const names = (savedCats as Array<{ name: string }>).map((c) => c.name);
      expect(names).toEqual(
        expect.arrayContaining([
          'General Donation',
          'Annadanam',
          'Temple Renovation',
          'Festival',
          'Cow Protection',
        ]),
      );
    });

    it('seeds Annadanam and Temple Renovation as 80G-eligible', async () => {
      await service.create(CREATE_DTO);

      const savedCats = entityManager._savedEntities.filter(
        (e) => typeof (e as Record<string, unknown>)['is80gEligible'] === 'boolean',
      ) as Array<{ name: string; is80gEligible: boolean }>;

      const annadanam = savedCats.find((c) => c.name === 'Annadanam');
      const renovation = savedCats.find((c) => c.name === 'Temple Renovation');
      const general = savedCats.find((c) => c.name === 'General Donation');

      expect(annadanam?.is80gEligible).toBe(true);
      expect(renovation?.is80gEligible).toBe(true);
      expect(general?.is80gEligible).toBe(false);
    });

    it('seeds finance categories (income + expense) as isSystem=true', async () => {
      await service.create(CREATE_DTO);

      const savedFinanceCats = entityManager._savedEntities.filter(
        (e) => typeof (e as Record<string, unknown>)['type'] === 'string'
          && Object.values(FinanceCategoryType).includes(
            (e as Record<string, unknown>)['type'] as FinanceCategoryType
          ),
      ) as Array<{ type: FinanceCategoryType; isSystem: boolean }>;

      const incomeCategories = savedFinanceCats.filter((c) => c.type === FinanceCategoryType.INCOME);
      const expenseCategories = savedFinanceCats.filter((c) => c.type === FinanceCategoryType.EXPENSE);

      expect(incomeCategories.length).toBeGreaterThanOrEqual(1);
      expect(expenseCategories.length).toBeGreaterThanOrEqual(1);
      expect(savedFinanceCats.every((c) => c.isSystem === true)).toBe(true);
    });
  });

  // ── getProfile() ──────────────────────────────────────────────────────────

  describe('getProfile()', () => {
    it('throws NotFoundException when temple does not exist', async () => {
      templeRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfile(TEMPLE_ID)).rejects.toThrow(NotFoundException);
    });

    it('strips razorpayKeySecret from the response', async () => {
      templeRepo.findOne.mockResolvedValue({ ...MOCK_TEMPLE });

      const profile = await service.getProfile(TEMPLE_ID);

      expect((profile as unknown as Record<string, unknown>)['razorpayKeySecret']).toBeUndefined();
    });

    it('generates a presigned URL when logoUrl (S3 key) is set', async () => {
      templeRepo.findOne.mockResolvedValue({
        ...MOCK_TEMPLE,
        logoUrl: 'logos/temple-uuid/logo.png',
      });

      const profile = await service.getProfile(TEMPLE_ID);

      expect(s3Service.getPresignedUrl).toHaveBeenCalledWith('logos/temple-uuid/logo.png');
      expect(profile.logoUrl).toBe('https://s3.example.com/logo.png');
    });

    it('does not call getPresignedUrl when logoUrl is absent', async () => {
      templeRepo.findOne.mockResolvedValue({ ...MOCK_TEMPLE, logoUrl: undefined });

      await service.getProfile(TEMPLE_ID);

      expect(s3Service.getPresignedUrl).not.toHaveBeenCalled();
    });
  });

  // ── update() ──────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('throws NotFoundException when temple does not exist', async () => {
      templeRepo.findOne.mockResolvedValue(null);

      await expect(service.update(TEMPLE_ID, { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates only the fields provided in the dto', async () => {
      templeRepo.findOne.mockResolvedValue({ ...MOCK_TEMPLE });

      await service.update(TEMPLE_ID, { name: 'Updated Name' });

      expect(templeRepo.update).toHaveBeenCalledWith(
        TEMPLE_ID,
        expect.objectContaining({ name: 'Updated Name' }),
      );
      // slug and razorpayKeySecret must not appear in the update
      const updateArg = (templeRepo.update as jest.Mock).mock.calls[0][1] as Record<string, unknown>;
      expect(updateArg['slug']).toBeUndefined();
      expect(updateArg['razorpayKeySecret']).toBeUndefined();
    });
  });
});
