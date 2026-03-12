import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { User } from '../../../database/entities/user.entity';
import { UserRole } from '@devaseva/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEMPLE_ID = 'temple-uuid';
const ADMIN_ID = 'admin-uuid';
const USER_ID = 'user-uuid';

const MOCK_USER: Partial<User> = {
  id: USER_ID,
  templeId: TEMPLE_ID,
  fullName: 'Ramesh Kumar',
  phone: '9876543210',
  role: UserRole.COUNTER_STAFF,
  isActive: true,
};

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: Record<string, jest.Mock>;

  function makeQb() {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ ...MOCK_USER }], 1]),
    };
  }

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data: unknown) => ({ ...(data as object) })),
      save: jest.fn().mockImplementation((u: unknown) =>
        Promise.resolve({ ...(u as object), id: USER_ID }),
      ),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  // ── inviteUser() ──────────────────────────────────────────────────────────

  describe('inviteUser()', () => {
    const INVITE_DTO = {
      fullName: 'Priya Sharma',
      phone: '9999988888',
      role: UserRole.COUNTER_STAFF,
    };

    it('creates and returns a new user', async () => {
      const result = await service.inviteUser(TEMPLE_ID, INVITE_DTO, ADMIN_ID);

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          templeId: TEMPLE_ID,
          phone: INVITE_DTO.phone,
          role: INVITE_DTO.role,
          invitedBy: ADMIN_ID,
        }),
      );
      expect(result).toBeDefined();
    });

    it('always uses templeId from parameter — never from dto', async () => {
      await service.inviteUser(TEMPLE_ID, INVITE_DTO, ADMIN_ID);

      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ templeId: TEMPLE_ID }),
      );
    });

    it('throws ConflictException when phone already exists in temple', async () => {
      userRepo.findOne.mockResolvedValue({ ...MOCK_USER, phone: INVITE_DTO.phone });

      await expect(
        service.inviteUser(TEMPLE_ID, INVITE_DTO, ADMIN_ID),
      ).rejects.toThrow(ConflictException);
    });

    it('throws UnprocessableEntityException when SUPER_ADMIN role is requested', async () => {
      await expect(
        service.inviteUser(
          TEMPLE_ID,
          { ...INVITE_DTO, role: UserRole.SUPER_ADMIN },
          ADMIN_ID,
        ),
      ).rejects.toThrow(UnprocessableEntityException);
      // Must not even check the DB — reject before any query
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });

    it('allows all non-protected roles (ADMIN, ACCOUNTANT, COUNTER_STAFF, etc.)', async () => {
      const allowedRoles = [
        UserRole.ADMIN,
        UserRole.ACCOUNTANT,
        UserRole.COUNTER_STAFF,
        UserRole.INVENTORY_MANAGER,
        UserRole.HEAD_PRIEST,
        UserRole.PRIEST,
        UserRole.TRUSTEE,
      ];

      for (const role of allowedRoles) {
        userRepo.findOne.mockResolvedValue(null); // fresh check each time
        await expect(
          service.inviteUser(TEMPLE_ID, { ...INVITE_DTO, role }, ADMIN_ID),
        ).resolves.toBeDefined();
      }
    });
  });

  // ── updateRole() ──────────────────────────────────────────────────────────

  describe('updateRole()', () => {
    it('updates the role and returns the updated user', async () => {
      userRepo.findOne.mockResolvedValue({ ...MOCK_USER });

      const result = await service.updateRole(TEMPLE_ID, USER_ID, {
        role: UserRole.ACCOUNTANT,
      });

      expect(userRepo.update).toHaveBeenCalledWith(USER_ID, { role: UserRole.ACCOUNTANT });
      expect(result.role).toBe(UserRole.ACCOUNTANT);
    });

    it('throws NotFoundException when user does not belong to temple', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateRole(TEMPLE_ID, USER_ID, { role: UserRole.ACCOUNTANT }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws UnprocessableEntityException when attempting to assign SUPER_ADMIN', async () => {
      await expect(
        service.updateRole(TEMPLE_ID, USER_ID, { role: UserRole.SUPER_ADMIN }),
      ).rejects.toThrow(UnprocessableEntityException);
      // Must be rejected before any DB lookup
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });
  });

  // ── deactivate() ──────────────────────────────────────────────────────────

  describe('deactivate()', () => {
    it('sets isActive=false on the target user', async () => {
      userRepo.findOne.mockResolvedValue({ ...MOCK_USER });

      await service.deactivate(TEMPLE_ID, USER_ID, ADMIN_ID);

      expect(userRepo.update).toHaveBeenCalledWith(USER_ID, { isActive: false });
    });

    it('throws ForbiddenException when userId === requestingUserId', async () => {
      // A user cannot deactivate themselves
      await expect(
        service.deactivate(TEMPLE_ID, ADMIN_ID, ADMIN_ID),
      ).rejects.toThrow(ForbiddenException);
      // Must reject before any DB query
      expect(userRepo.findOne).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when user does not belong to temple', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.deactivate(TEMPLE_ID, USER_ID, ADMIN_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('is idempotent — no error if user is already inactive', async () => {
      userRepo.findOne.mockResolvedValue({ ...MOCK_USER, isActive: false });

      await expect(
        service.deactivate(TEMPLE_ID, USER_ID, ADMIN_ID),
      ).resolves.toBeUndefined();

      // Should NOT call update on an already-inactive user
      expect(userRepo.update).not.toHaveBeenCalled();
    });
  });

  // ── listUsers() ───────────────────────────────────────────────────────────

  describe('listUsers()', () => {
    it('returns paginated users scoped to the temple', async () => {
      const result = await service.listUsers(TEMPLE_ID, {});

      const qb = userRepo.createQueryBuilder.mock.results[0].value;
      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('temple_id'),
        expect.objectContaining({ templeId: TEMPLE_ID }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('applies role filter when provided', async () => {
      await service.listUsers(TEMPLE_ID, { role: UserRole.ACCOUNTANT });

      const qb = userRepo.createQueryBuilder.mock.results[0].value;
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('role'),
        expect.objectContaining({ role: UserRole.ACCOUNTANT }),
      );
    });

    it('applies isActive filter when provided', async () => {
      await service.listUsers(TEMPLE_ID, { isActive: true });

      const qb = userRepo.createQueryBuilder.mock.results[0].value;
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('is_active'),
        expect.objectContaining({ isActive: true }),
      );
    });
  });
});
