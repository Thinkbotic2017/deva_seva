import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DevoteesService } from '../devotees.service';
import { Devotee } from '../../../database/entities/devotee.entity';
import { Donation } from '../../../database/entities/donation.entity';
import { SevaBooking } from '../../../database/entities/seva-booking.entity';
import { EncryptionUtil } from '../../../common/utils/encryption.util';
import { FindOrCreateDevoteeDto } from '../dto/find-or-create-devotee.dto';
import { UpdateDevoteeDto } from '../dto/update-devotee.dto';
import { DevoteeTier } from '@devaseva/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLE_ID = 'temple-uuid';
const DEVOTEE_ID = 'devotee-uuid';
const PHONE = '9876543210';

const MOCK_DEVOTEE: Partial<Devotee> = {
  id: DEVOTEE_ID,
  templeId: TEMPLE_ID,
  name: 'Ramesh Kumar',
  phone: PHONE,
  tier: DevoteeTier.REGULAR,
  whatsappOptedOut: false,
  smsOptedOut: false,
  panNumberEncrypted: 'iv:tag:cipher', // Should NEVER appear in service output
  panNumberMasked: 'ABCDE1234F',
};

// ─── Mock factories ───────────────────────────────────────────────────────────

/**
 * Mock EntityManager used inside DataSource.transaction callbacks.
 * Simulates the INSERT ... ON CONFLICT DO NOTHING + SELECT pattern.
 */
function mockEntityManager(existingDevotee?: Partial<Devotee> | null) {
  const insertQb = {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({}),
  };

  return {
    createQueryBuilder: jest.fn().mockReturnValue(insertQb),
    findOne: jest.fn().mockResolvedValue(existingDevotee ?? null),
    _insertQb: insertQb,
  };
}

function mockDataSource(emOpts?: { existing?: Partial<Devotee> | null }) {
  const em = mockEntityManager(emOpts?.existing);
  return {
    _em: em,
    transaction: jest.fn(
      (cb: (em: ReturnType<typeof mockEntityManager>) => unknown) => cb(em),
    ),
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('DevoteesService', () => {
  let service: DevoteesService;
  let devoteeRepo: Record<string, jest.Mock>;
  let donationRepo: Record<string, jest.Mock>;
  let sevaBookingRepo: Record<string, jest.Mock>;
  let encryptionUtil: jest.Mocked<EncryptionUtil>;
  let ds: ReturnType<typeof mockDataSource>;

  async function buildModule(dsOpts?: Parameters<typeof mockDataSource>[0]) {
    ds = mockDataSource(dsOpts);

    devoteeRepo = {
      findOne: jest.fn().mockResolvedValue(MOCK_DEVOTEE),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    // Donation repo used for stats — stub getRawOne + find
    donationRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          donationCount: '3',
          totalDonated: '15300.00',
          lastDonationAt: '2025-06-01',
        }),
      }),
      find: jest.fn().mockResolvedValue([]),
    };

    sevaBookingRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      }),
    };

    encryptionUtil = {
      encrypt: jest.fn().mockReturnValue('new-iv:new-tag:new-cipher'),
      decrypt: jest.fn().mockReturnValue('ABCDE1234F'),
    } as unknown as jest.Mocked<EncryptionUtil>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        DevoteesService,
        { provide: getRepositoryToken(Devotee), useValue: devoteeRepo },
        { provide: getRepositoryToken(Donation), useValue: donationRepo },
        { provide: getRepositoryToken(SevaBooking), useValue: sevaBookingRepo },
        { provide: DataSource, useValue: ds },
        { provide: EncryptionUtil, useValue: encryptionUtil },
      ],
    }).compile();

    service = moduleRef.get(DevoteesService);
  }

  beforeEach(async () => {
    await buildModule({ existing: MOCK_DEVOTEE });
  });

  // ── findOrCreate() ────────────────────────────────────────────────────────────

  describe('findOrCreate()', () => {
    const DTO: FindOrCreateDevoteeDto = {
      name: 'Ramesh Kumar',
      phone: PHONE,
    };

    it('inserts a new devotee when none exists (INSERT ... ON CONFLICT path)', async () => {
      await buildModule({ existing: MOCK_DEVOTEE }); // manager.findOne returns existing after insert

      const result = await service.findOrCreate(TEMPLE_ID, DTO);

      // INSERT must be attempted via query builder
      expect(ds._em.createQueryBuilder).toHaveBeenCalled();
      expect(ds._em._insertQb.orIgnore).toHaveBeenCalled();
      expect(ds._em._insertQb.execute).toHaveBeenCalled();

      // SELECT must follow to get the canonical row
      expect(ds._em.findOne).toHaveBeenCalledWith(Devotee, {
        where: { templeId: TEMPLE_ID, phone: PHONE },
      });

      expect(result.id).toBe(DEVOTEE_ID);
    });

    it('is idempotent — returns existing devotee without modifying it', async () => {
      // Call twice with the same phone
      const first = await service.findOrCreate(TEMPLE_ID, DTO);
      const second = await service.findOrCreate(TEMPLE_ID, DTO);

      expect(first.id).toBe(second.id);
      // Both calls used ON CONFLICT DO NOTHING — no UPDATE issued
    });

    it('never returns panNumberEncrypted in the result', async () => {
      const result = await service.findOrCreate(TEMPLE_ID, DTO);

      expect((result as Partial<Devotee>).panNumberEncrypted).toBeUndefined();
    });

    it('always sets templeId from parameter — not from dto', async () => {
      await service.findOrCreate(TEMPLE_ID, DTO);

      expect(ds._em._insertQb.values).toHaveBeenCalledWith(
        expect.objectContaining({ templeId: TEMPLE_ID }),
      );
    });

    it('wraps insert + select in a single transaction', async () => {
      await service.findOrCreate(TEMPLE_ID, DTO);

      expect(ds.transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ── findById() ────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns devotee with computed stats', async () => {
      devoteeRepo.findOne.mockResolvedValue(MOCK_DEVOTEE);

      const result = await service.findById(TEMPLE_ID, DEVOTEE_ID);

      expect(result.id).toBe(DEVOTEE_ID);
      expect(result.stats).toBeDefined();
      expect(result.stats.donationCount).toBe(3);
      expect(result.stats.totalDonated).toBe('15300.00');
      expect(result.stats.sevaCount).toBe(2);
    });

    it('includes recentDonations (last 10)', async () => {
      devoteeRepo.findOne.mockResolvedValue(MOCK_DEVOTEE);
      donationRepo.find.mockResolvedValue([{ id: 'd1' }, { id: 'd2' }]);

      const result = await service.findById(TEMPLE_ID, DEVOTEE_ID);

      expect(result.recentDonations).toHaveLength(2);
    });

    it('never returns panNumberEncrypted', async () => {
      devoteeRepo.findOne.mockResolvedValue(MOCK_DEVOTEE);

      const result = await service.findById(TEMPLE_ID, DEVOTEE_ID);

      expect((result as unknown as Partial<Devotee>).panNumberEncrypted).toBeUndefined();
    });

    it('throws NotFoundException when devotee is not found', async () => {
      devoteeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findById(TEMPLE_ID, DEVOTEE_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('scopes query to the provided templeId', async () => {
      devoteeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findById('other-temple', DEVOTEE_ID),
      ).rejects.toThrow(NotFoundException);

      expect(devoteeRepo.findOne).toHaveBeenCalledWith({
        where: { id: DEVOTEE_ID, templeId: 'other-temple' },
      });
    });
  });

  // ── update() — PAN re-encryption ─────────────────────────────────────────────

  describe('update() — PAN re-encryption', () => {
    it('re-encrypts and re-masks PAN when a new PAN is provided', async () => {
      devoteeRepo.findOne.mockResolvedValue(MOCK_DEVOTEE);

      const dto: UpdateDevoteeDto = { pan: 'ABCDE1234F' };
      await service.update(TEMPLE_ID, DEVOTEE_ID, dto);

      expect(encryptionUtil.encrypt).toHaveBeenCalledWith('ABCDE1234F');
      expect(devoteeRepo.update).toHaveBeenCalledWith(
        DEVOTEE_ID,
        expect.objectContaining({
          panNumberEncrypted: 'new-iv:new-tag:new-cipher',
          panNumberMasked: 'ABCXX1234F',
        }),
      );
    });

    it('does NOT call encrypt when pan is not provided in the DTO', async () => {
      devoteeRepo.findOne.mockResolvedValue(MOCK_DEVOTEE);

      const dto: UpdateDevoteeDto = { name: 'New Name' };
      await service.update(TEMPLE_ID, DEVOTEE_ID, dto);

      expect(encryptionUtil.encrypt).not.toHaveBeenCalled();
      // Existing encrypted value preserved
      expect(devoteeRepo.update).toHaveBeenCalledWith(
        DEVOTEE_ID,
        expect.objectContaining({
          panNumberEncrypted: 'iv:tag:cipher',
          panNumberMasked: 'ABCDE1234F',
        }),
      );
    });

    it('throws UnprocessableEntityException for an invalid PAN format', async () => {
      devoteeRepo.findOne.mockResolvedValue(MOCK_DEVOTEE);

      const dto: UpdateDevoteeDto = { pan: 'INVALID' };

      await expect(
        service.update(TEMPLE_ID, DEVOTEE_ID, dto),
      ).rejects.toThrow(UnprocessableEntityException);

      // Encrypt must NOT have been called
      expect(encryptionUtil.encrypt).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when devotee does not belong to the temple', async () => {
      devoteeRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(TEMPLE_ID, DEVOTEE_ID, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('never returns panNumberEncrypted in the update result', async () => {
      // After update, findOne is called again — stub it
      devoteeRepo.findOne
        .mockResolvedValueOnce(MOCK_DEVOTEE) // first call: pre-update check
        .mockResolvedValueOnce(MOCK_DEVOTEE); // second call: post-update reload

      const result = await service.update(TEMPLE_ID, DEVOTEE_ID, {
        name: 'New Name',
      });

      expect((result as Partial<Devotee>).panNumberEncrypted).toBeUndefined();
    });

    it('updates only the provided fields (partial update)', async () => {
      devoteeRepo.findOne.mockResolvedValue(MOCK_DEVOTEE);

      const dto: UpdateDevoteeDto = { city: 'Mumbai' };
      await service.update(TEMPLE_ID, DEVOTEE_ID, dto);

      // city should be in the patch
      expect(devoteeRepo.update).toHaveBeenCalledWith(
        DEVOTEE_ID,
        expect.objectContaining({ city: 'Mumbai' }),
      );
      // name should NOT appear in the patch (undefined fields are excluded)
      const patchArg = (devoteeRepo.update as jest.Mock).mock.calls[0][1];
      expect(patchArg.name).toBeUndefined();
    });
  });
});
