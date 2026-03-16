import { randomInt } from 'crypto';
import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import { OtpSession } from '../../database/entities/otp-session.entity';
import { OtpPurpose } from '@devaseva/types';
import {
  MAX_OTP_ATTEMPTS,
  OTP_EXPIRY_SECONDS,
  OTP_RATE_LIMIT_PER_HOUR,
  REDIS_KEY_OTP_REQUEST,
} from '../../common/constants';

const BCRYPT_ROUNDS = 10;
const OTP_LENGTH = 6;
/** Redis TTL for the per-phone rate-limit key: 1 hour. */
const OTP_RATE_LIMIT_TTL_SECONDS = 3600;

export interface OtpGenerateResult {
  /** Plain OTP — pass to SMS/WhatsApp service. NEVER store or log. */
  otp: string;
  sessionId: string;
  expiresAt: Date;
  /** Set only in development — exposes OTP for local testing. Never present in production. */
  devOtp?: string;
}

export interface OtpVerifyResult {
  valid: boolean;
  sessionId: string;
  phone: string;
}

/**
 * OtpService handles generation, hashing, and verification of one-time passwords.
 *
 * Security invariants enforced here:
 * - Raw OTP is never persisted. Only bcrypt(otp, 10) is stored.
 * - Max 5 OTP requests per phone per hour (Redis INCR / TTL).
 * - Max 3 verify attempts per session before it is locked.
 * - Expired sessions are never accepted.
 * - Used sessions cannot be reused (is_used flag).
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(OtpSession)
    private readonly otpSessionRepo: Repository<OtpSession>,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  /**
   * Generates a new OTP for the given phone number.
   * Enforces the per-phone rate limit before creating the session.
   * Returns the plain OTP — caller must deliver it via SMS/WhatsApp and discard.
   */
  async generate(
    phone: string,
    purpose: OtpPurpose = OtpPurpose.LOGIN,
    ipAddress?: string,
  ): Promise<OtpGenerateResult> {
    await this.enforceRateLimit(phone, ipAddress);

    const otp = this.generateOtpCode();
    const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

    const session = this.otpSessionRepo.create({
      phone,
      otpHash,
      purpose,
      expiresAt,
      attempts: 0,
      isUsed: false,
      ipAddress,
    });

    const saved = await this.otpSessionRepo.save(session);

    // Increment rate-limit counter; set TTL on first request
    await this.incrementRateLimit(phone);

    this.logger.log(`OTP session created for phone ${phone} [purpose=${purpose}]`);
    const result: OtpGenerateResult = { otp, sessionId: saved.id, expiresAt };
    if (process.env.NODE_ENV === 'development') {
      result.devOtp = otp;
    }
    return result;
  }

  /**
   * Verifies an OTP against an existing session.
   * Increments attempt count on every call (success or failure).
   * Marks session as used on success.
   * Throws UnprocessableEntityException if:
   *   - session not found, already used, or expired
   *   - attempts >= MAX_OTP_ATTEMPTS (locked)
   *   - OTP does not match
   */
  async verify(sessionId: string, otp: string): Promise<OtpVerifyResult> {
    const session = await this.otpSessionRepo.findOne({
      where: {
        id: sessionId,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!session) {
      throw new UnprocessableEntityException(
        'OTP session not found, already used, or expired',
      );
    }

    if (session.attempts >= MAX_OTP_ATTEMPTS) {
      throw new UnprocessableEntityException(
        'Too many incorrect attempts. Please request a new OTP.',
      );
    }

    // Increment attempts before checking — prevents timing-based enumeration
    await this.otpSessionRepo.update(session.id, {
      attempts: session.attempts + 1,
    });

    const isMatch = await bcrypt.compare(otp, session.otpHash);

    if (!isMatch) {
      const remaining = MAX_OTP_ATTEMPTS - (session.attempts + 1);
      this.logger.warn(
        `OTP mismatch for session ${session.id} (${remaining} attempts remaining)`,
      );
      throw new UnprocessableEntityException(
        remaining > 0
          ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Please request a new OTP.',
      );
    }

    // Mark session as used — prevents replay attacks
    await this.otpSessionRepo.update(session.id, { isUsed: true });

    this.logger.log(`OTP verified for session ${session.id}`);
    return { valid: true, sessionId: session.id, phone: session.phone };
  }

  /**
   * Returns how many OTP requests this phone has made in the current hour.
   * Used for display in admin tooling — not for enforcement (see enforceRateLimit).
   */
  async getRequestCount(phone: string): Promise<number> {
    const key = REDIS_KEY_OTP_REQUEST(phone);
    const value = await this.redis.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Throws TooManyRequestsException if the phone or originating IP has hit the
   * hourly request cap. Per-phone: 5 req/hr. Per-IP: 20 req/hr.
   */
  private async enforceRateLimit(phone: string, ipAddress?: string): Promise<void> {
    const key = REDIS_KEY_OTP_REQUEST(phone);
    const current = await this.redis.get(key);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= OTP_RATE_LIMIT_PER_HOUR) {
      this.logger.warn(`OTP rate limit exceeded for phone ${phone}`);
      throw new HttpException(
        'Too many OTP requests. Please wait before requesting another.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (ipAddress) {
      const ipKey = `otp_ip:${ipAddress}`;
      const ipCount = await this.redis.incr(ipKey);
      if (ipCount === 1) {
        await this.redis.expire(ipKey, 3600); // 1-hour window
      }
      if (ipCount > 20) {
        this.logger.warn(`OTP IP rate limit exceeded for IP ${ipAddress}`);
        throw new HttpException(
          'Too many OTP requests from this IP. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  /** Atomically increments the rate-limit counter and sets TTL on first increment. */
  private async incrementRateLimit(phone: string): Promise<void> {
    const key = REDIS_KEY_OTP_REQUEST(phone);
    const newCount = await this.redis.incr(key);
    if (newCount === 1) {
      // First request this hour — set expiry
      await this.redis.expire(key, OTP_RATE_LIMIT_TTL_SECONDS);
    }
  }

  /** Generates a cryptographically random numeric OTP string. */
  private generateOtpCode(): string {
    // Use crypto-quality randomness. Math.random() is NOT acceptable for OTPs.
    const min = Math.pow(10, OTP_LENGTH - 1);
    const max = Math.pow(10, OTP_LENGTH) - 1;
    // randomInt is cryptographically secure (Node built-in, statically imported)
    return String(randomInt(min, max + 1));
  }
}
