import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus, UnprocessableEntityException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { OtpService } from '../otp.service';
import { OtpSession } from '../../../database/entities/otp-session.entity';
import { OtpPurpose } from '@devaseva/types';

/** Minimal mock repository — typed as any to avoid TypeORM overload conflicts with jest.fn(). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockRepo(): Record<string, jest.Mock> {
  return {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
}

/** Minimal mock Redis client. */
function mockRedis() {
  return {
    get: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  };
}

const PHONE = '9876543210';
const VALID_OTP = '123456';

describe('OtpService', () => {
  let service: OtpService;
  let repo: Record<string, jest.Mock>;
  let redis: ReturnType<typeof mockRedis>;

  beforeEach(async () => {
    repo = mockRepo();
    redis = mockRedis();

    const module = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: getRepositoryToken(OtpSession), useValue: repo },
        { provide: 'default_IORedisModuleConnectionToken', useValue: redis },
      ],
    }).compile();

    service = module.get(OtpService);
  });

  // ─── generate ────────────────────────────────────────────────────────────

  describe('generate', () => {
    beforeEach(() => {
      redis.get.mockResolvedValue(null); // Under rate limit
      redis.incr.mockResolvedValue(1);
      redis.expire.mockResolvedValue(1);
      repo.create.mockReturnValue({ id: 'session-uuid' } as OtpSession);
      repo.save.mockResolvedValue({
        id: 'session-uuid',
        expiresAt: new Date(),
      } as OtpSession);
    });

    it('returns a 6-digit OTP', async () => {
      const result = await service.generate(PHONE, OtpPurpose.LOGIN);
      expect(result.otp).toMatch(/^\d{6}$/);
    });

    it('returns a sessionId', async () => {
      const result = await service.generate(PHONE, OtpPurpose.LOGIN);
      expect(result.sessionId).toBe('session-uuid');
    });

    it('stores a bcrypt hash, not the raw OTP', async () => {
      await service.generate(PHONE, OtpPurpose.LOGIN);
      const savedSession = repo['create'].mock.calls[0][0] as {
        otpHash: string;
        otp?: string;
      };
      expect(savedSession.otpHash).toBeDefined();
      // Hash must not equal the raw OTP
      expect(savedSession.otpHash).not.toMatch(/^\d{6}$/);
      // Ensure no raw OTP field is persisted
      expect((savedSession as Record<string, unknown>)['otp']).toBeUndefined();
    });

    it('the stored hash verifies correctly against the returned OTP', async () => {
      const result = await service.generate(PHONE, OtpPurpose.LOGIN);
      const savedSession = repo['create'].mock.calls[0][0] as {
        otpHash: string;
      };
      const isMatch = await bcrypt.compare(result.otp, savedSession.otpHash);
      expect(isMatch).toBe(true);
    });

    it('throws 429 HttpException when rate limit is reached', async () => {
      redis.get.mockResolvedValue('5'); // At the limit (OTP_RATE_LIMIT_PER_HOUR = 5)
      const error = await service
        .generate(PHONE, OtpPurpose.LOGIN)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('sets Redis TTL only on first request for this phone (incr returns 1)', async () => {
      redis.incr.mockResolvedValue(1);
      await service.generate(PHONE, OtpPurpose.LOGIN);
      expect(redis.expire).toHaveBeenCalledTimes(1);
    });

    it('does NOT set Redis TTL on subsequent requests (incr > 1)', async () => {
      redis.incr.mockResolvedValue(3);
      await service.generate(PHONE, OtpPurpose.LOGIN);
      expect(redis.expire).not.toHaveBeenCalled();
    });
  });

  // ─── verify ──────────────────────────────────────────────────────────────

  describe('verify', () => {
    let otpHash: string;

    beforeEach(async () => {
      otpHash = await bcrypt.hash(VALID_OTP, 10);
    });

    it('returns { valid: true } and phone on correct OTP', async () => {
      repo.findOne.mockResolvedValue({
        id: 'session-uuid',
        phone: PHONE,
        otpHash,
        attempts: 0,
        isUsed: false,
        expiresAt: new Date(Date.now() + 60_000),
      } as OtpSession);
      repo.update.mockResolvedValue({ affected: 1 } as never);

      const result = await service.verify('session-uuid', VALID_OTP);
      expect(result.valid).toBe(true);
      expect(result.phone).toBe(PHONE);
    });

    it('throws UnprocessableEntityException when session not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.verify('bad-id', VALID_OTP)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('increments attempts before comparing OTP', async () => {
      repo.findOne.mockResolvedValue({
        id: 'session-uuid',
        phone: PHONE,
        otpHash,
        attempts: 0,
        isUsed: false,
        expiresAt: new Date(Date.now() + 60_000),
      } as OtpSession);
      repo.update.mockResolvedValue({ affected: 1 } as never);

      await service.verify('session-uuid', VALID_OTP);

      // First update call increments attempts, second marks isUsed
      expect(repo.update).toHaveBeenNthCalledWith(
        1,
        'session-uuid',
        { attempts: 1 },
      );
    });

    it('marks session as used after successful verification', async () => {
      repo.findOne.mockResolvedValue({
        id: 'session-uuid',
        phone: PHONE,
        otpHash,
        attempts: 0,
        isUsed: false,
        expiresAt: new Date(Date.now() + 60_000),
      } as OtpSession);
      repo.update.mockResolvedValue({ affected: 1 } as never);

      await service.verify('session-uuid', VALID_OTP);

      expect(repo.update).toHaveBeenCalledWith('session-uuid', { isUsed: true });
    });

    it('throws UnprocessableEntityException on wrong OTP', async () => {
      repo.findOne.mockResolvedValue({
        id: 'session-uuid',
        phone: PHONE,
        otpHash,
        attempts: 0,
        isUsed: false,
        expiresAt: new Date(Date.now() + 60_000),
      } as OtpSession);
      repo.update.mockResolvedValue({ affected: 1 } as never);

      await expect(service.verify('session-uuid', '000000')).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws when attempts have reached MAX_OTP_ATTEMPTS (3)', async () => {
      repo.findOne.mockResolvedValue({
        id: 'session-uuid',
        phone: PHONE,
        otpHash,
        attempts: 3, // Already at limit
        isUsed: false,
        expiresAt: new Date(Date.now() + 60_000),
      } as OtpSession);

      await expect(service.verify('session-uuid', VALID_OTP)).rejects.toThrow(
        UnprocessableEntityException,
      );
      // Must not call update — session was already locked
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
