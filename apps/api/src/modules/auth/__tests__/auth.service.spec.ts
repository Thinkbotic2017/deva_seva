import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { OtpService } from '../otp.service';
import { SessionService } from '../session.service';
import { User } from '../../../database/entities/user.entity';
import { Temple } from '../../../database/entities/temple.entity';
import { UserRole, OtpPurpose, TemplePlan } from '@devaseva/types';

// ─── Test fixtures ──────────────────────────────────────────────────────────

const MOCK_TEMPLE: Partial<Temple> = {
  id: 'temple-uuid',
  name: 'Sri Venkateswara Temple',
  slug: 'sri-venkateshwara',
  plan: TemplePlan.STARTER,
  is80gRegistered: true,
  receiptPrefix: 'RCPT',
  primaryLanguage: 'hi',
  timezone: 'Asia/Kolkata',
  isActive: true,
};

const MOCK_USER: Partial<User> = {
  id: 'user-uuid',
  templeId: 'temple-uuid',
  phone: '9876543210',
  fullName: 'Ramesh Kumar',
  role: UserRole.COUNTER_STAFF,
  isActive: true,
};

// ─── Mock factories ─────────────────────────────────────────────────────────

function mockUserRepo() {
  return { findOne: jest.fn(), update: jest.fn() };
}
function mockTempleRepo() {
  return { findOne: jest.fn() };
}
function mockOtpService(): jest.Mocked<OtpService> {
  return {
    generate: jest.fn(),
    verify: jest.fn(),
    getRequestCount: jest.fn(),
  } as unknown as jest.Mocked<OtpService>;
}
function mockSessionService(): jest.Mocked<SessionService> {
  return {
    create: jest.fn(),
    validateRefreshToken: jest.fn(),
    revoke: jest.fn(),
    revokeAll: jest.fn(),
    findActiveByUser: jest.fn(),
  } as unknown as jest.Mocked<SessionService>;
}
function mockJwtService() {
  return {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };
}
function mockConfigService() {
  return {
    get: jest.fn((key: string, def: unknown) => def),
    getOrThrow: jest.fn((key: string) => {
      const map: Record<string, string> = {
        JWT_PRIVATE_KEY: '-----BEGIN RSA PRIVATE KEY-----\nmock\n-----END RSA PRIVATE KEY-----',
        JWT_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\nmock\n-----END PUBLIC KEY-----',
      };
      if (map[key]) return map[key];
      throw new Error(`Config key not found: ${key}`);
    }),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let otpService: jest.Mocked<OtpService>;
  let sessionService: jest.Mocked<SessionService>;
  let userRepo: ReturnType<typeof mockUserRepo>;
  let templeRepo: ReturnType<typeof mockTempleRepo>;
  let jwtService: ReturnType<typeof mockJwtService>;

  beforeEach(async () => {
    userRepo = mockUserRepo();
    templeRepo = mockTempleRepo();
    otpService = mockOtpService();
    sessionService = mockSessionService();
    jwtService = mockJwtService();

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Temple), useValue: templeRepo },
        { provide: OtpService, useValue: otpService },
        { provide: SessionService, useValue: sessionService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: mockConfigService() },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  // ─── requestOtp ──────────────────────────────────────────────────────────

  describe('requestOtp', () => {
    it('delegates to OtpService.generate and returns sessionId + expiresAt', async () => {
      const expiresAt = new Date();
      otpService.generate.mockResolvedValue({
        otp: '123456',
        sessionId: 'sess-uuid',
        expiresAt,
      });

      const result = await service.requestOtp(
        { phone: '9876543210' },
        '127.0.0.1',
      );

      expect(otpService.generate).toHaveBeenCalledWith(
        '9876543210',
        OtpPurpose.LOGIN,
        '127.0.0.1',
      );
      expect(result.sessionId).toBe('sess-uuid');
      expect(result.expiresAt).toBe(expiresAt);
    });

    it('returns the otp field so the controller can queue delivery', async () => {
      otpService.generate.mockResolvedValue({
        otp: '654321',
        sessionId: 'sess-uuid',
        expiresAt: new Date(),
      });
      const result = await service.requestOtp({ phone: '9876543210' });
      expect(result.otp).toBe('654321');
    });
  });

  // ─── verifyOtp ───────────────────────────────────────────────────────────

  describe('verifyOtp', () => {
    beforeEach(() => {
      otpService.verify.mockResolvedValue({
        valid: true,
        sessionId: 'sess-uuid',
        phone: '9876543210',
      });
      userRepo.findOne.mockResolvedValue(MOCK_USER as User);
      userRepo.update.mockResolvedValue({ affected: 1 } as never);
      sessionService.create.mockResolvedValue({
        session: {} as never,
        refreshToken: 'mock-refresh-token',
      });
    });

    it('returns accessToken, refreshToken, and user on success', async () => {
      const result = await service.verifyOtp({
        sessionId: 'sess-uuid',
        otp: '123456',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.templeId).toBe('temple-uuid');
    });

    it('templeId in response comes from the user record — never from request', async () => {
      const result = await service.verifyOtp({
        sessionId: 'sess-uuid',
        otp: '123456',
      });
      // templeId must equal user.templeId, not something caller-provided
      expect(result.user.templeId).toBe(MOCK_USER.templeId);
    });

    it('throws UnauthorizedException when no active user exists for the phone', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.verifyOtp({ sessionId: 'sess-uuid', otp: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('updates lastLoginAt on successful login', async () => {
      await service.verifyOtp({ sessionId: 'sess-uuid', otp: '123456' });
      expect(userRepo.update).toHaveBeenCalledWith(
        MOCK_USER.id,
        expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      );
    });
  });

  // ─── refresh ─────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('decodes userId from the token — does NOT accept it from request body', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-uuid',
        templeId: 'temple-uuid',
        role: UserRole.COUNTER_STAFF,
        phone: '9876543210',
      });
      sessionService.validateRefreshToken.mockResolvedValue({} as never);

      await service.refresh({ refreshToken: 'some-token' });

      // validateRefreshToken must be called with the decoded sub, not a body field
      expect(sessionService.validateRefreshToken).toHaveBeenCalledWith(
        'user-uuid',
        'some-token',
      );
    });

    it('throws UnauthorizedException when JWT verification fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        service.refresh({ refreshToken: 'expired-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns a new accessToken on success', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-uuid',
        templeId: 'temple-uuid',
        role: UserRole.COUNTER_STAFF,
        phone: '9876543210',
      });
      sessionService.validateRefreshToken.mockResolvedValue({} as never);

      const result = await service.refresh({ refreshToken: 'valid-token' });
      expect(result.accessToken).toBeDefined();
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('calls SessionService.revoke with sessionId and userId', async () => {
      sessionService.revoke.mockResolvedValue();
      await service.logout('session-uuid', 'user-uuid');
      expect(sessionService.revoke).toHaveBeenCalledWith('session-uuid', 'user-uuid');
    });
  });

  // ─── logoutAll ───────────────────────────────────────────────────────────

  describe('logoutAll', () => {
    it('calls SessionService.revokeAll with userId', async () => {
      sessionService.revokeAll.mockResolvedValue();
      await service.logoutAll('user-uuid');
      expect(sessionService.revokeAll).toHaveBeenCalledWith('user-uuid');
    });
  });

  // ─── me ──────────────────────────────────────────────────────────────────

  describe('me', () => {
    it('returns user and temple profile', async () => {
      userRepo.findOne.mockResolvedValue(MOCK_USER as User);
      templeRepo.findOne.mockResolvedValue(MOCK_TEMPLE as Temple);

      const result = await service.me('user-uuid');

      expect(result.user.id).toBe('user-uuid');
      expect(result.temple.slug).toBe('sri-venkateshwara');
    });

    it('throws NotFoundException when user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.me('bad-uuid')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when temple is not found', async () => {
      userRepo.findOne.mockResolvedValue(MOCK_USER as User);
      templeRepo.findOne.mockResolvedValue(null);
      await expect(service.me('user-uuid')).rejects.toThrow(NotFoundException);
    });
  });
});
