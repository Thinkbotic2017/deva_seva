import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OtpService } from './otp.service';
import { SessionService } from './session.service';
import { User } from '../../database/entities/user.entity';
import { Temple } from '../../database/entities/temple.entity';
import { OtpPurpose, UserRole, JwtPayload } from '@devaseva/types';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshDto } from './dto/refresh.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  userId: string;
  templeId: string;
  role: UserRole;
  fullName: string;
}

export interface MeResult {
  user: Omit<User, 'permissions'>;
  temple: Pick<
    Temple,
    | 'id'
    | 'name'
    | 'slug'
    | 'plan'
    | 'is80gRegistered'
    | 'receiptPrefix'
    | 'primaryLanguage'
    | 'timezone'
  >;
}

/**
 * AuthService orchestrates the full passwordless OTP authentication flow.
 *
 * Flow:
 *   1. requestOtp   — rate-limit → generate OTP → queue delivery → return sessionId
 *   2. verifyOtp    — verify OTP → find user → create session → issue access JWT + opaque refresh token
 *   3. refresh      — validate opaque token → rotate → issue new access JWT + new opaque token
 *   4. logout       — parse session ID from raw token → revoke single session
 *   5. logoutAll    — revoke all sessions for user
 *
 * Refresh token security model:
 * - Refresh tokens are OPAQUE random strings ({sessionId}.{secret}), NOT JWTs.
 * - Only the bcrypt hash is stored in the database — the raw token is returned once.
 * - On each /refresh, the old session is revoked and a new one is issued (rotation).
 * - userId / templeId are NEVER read from the request body — always from the access
 *   token payload (JWT) or derived from the validated session record.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Temple)
    private readonly templeRepo: Repository<Temple>,
    private readonly otpService: OtpService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Step 1 — Request an OTP.
   * Enforces rate limit, generates OTP, returns sessionId and delivery metadata.
   * The caller (controller) queues SMS/WhatsApp delivery with the plain OTP.
   */
  async requestOtp(
    dto: RequestOtpDto,
    ipAddress?: string,
  ): Promise<{ sessionId: string; expiresAt: Date; otp: string }> {
    return this.otpService.generate(dto.phone, OtpPurpose.LOGIN, ipAddress);
  }

  /**
   * Step 2 — Verify OTP and issue token pair.
   * Verifies the OTP, finds the user, creates a session, and returns:
   * - accessToken: short-lived RS256 JWT (15 min)
   * - refreshToken: opaque random string ({sessionId}.{secret}) — NOT a JWT
   */
  async verifyOtp(
    dto: VerifyOtpDto,
    ipAddress?: string,
  ): Promise<TokenPair & { user: AuthUser }> {
    const { phone } = await this.otpService.verify(dto.sessionId, dto.otp);

    const user = await this.userRepo.findOne({
      where: { phone, isActive: true },
      relations: [],
    });

    if (!user) {
      throw new UnauthorizedException(
        'No active account found for this phone number. ' +
          'Ask your temple admin to invite you.',
      );
    }

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    const tokens = await this.issueTokenPair(user, dto.deviceInfo, ipAddress);

    return {
      ...tokens,
      user: {
        userId: user.id,
        templeId: user.templeId,
        role: user.role,
        fullName: user.fullName,
      },
    };
  }

  /**
   * Step 3 — Refresh access token with rotation.
   *
   * Validates the opaque refresh token via bcrypt comparison (O(1) — session ID
   * is embedded in the token prefix). Revokes the old session and issues a new
   * session + new opaque refresh token (rotation). Returns a new access JWT.
   *
   * userId/templeId are derived from the validated session record and the user DB
   * row — NEVER from the request body.
   */
  async refresh(dto: RefreshDto): Promise<TokenPair> {
    // Validate the opaque token — throws UnauthorizedException if invalid/expired
    const session = await this.sessionService.validateRefreshToken(dto.refreshToken);

    // Load the user so we can build the access token payload and issue a new session
    const user = await this.userRepo.findOne({
      where: { id: session.userId, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException('User account not found or deactivated');
    }

    // Rotate: revoke the consumed session before issuing a new one
    await this.sessionService.revoke(session.id, session.userId);

    // Issue new access token + new opaque refresh token (new session)
    return this.issueTokenPair(user);
  }

  /**
   * Logout — revoke a single session identified by the raw refresh token.
   * Parses the session ID from the token prefix; ownership is verified in
   * SessionService.revoke() by matching userId.
   */
  async logout(rawToken: string, userId: string): Promise<void> {
    const dotIndex = rawToken.indexOf('.');
    if (dotIndex === -1) {
      throw new UnauthorizedException('Invalid refresh token format');
    }
    const sessionId = rawToken.substring(0, dotIndex);
    await this.sessionService.revoke(sessionId, userId);
  }

  /**
   * Logout from all devices — revoke every session for this user.
   */
  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.revokeAll(userId);
  }

  /**
   * Returns the authenticated user's profile and temple details.
   * Used by GET /auth/me.
   */
  async me(userId: string): Promise<MeResult> {
    const user = await this.userRepo.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const temple = await this.templeRepo.findOne({
      where: { id: user.templeId, isActive: true },
    });

    if (!temple) {
      throw new NotFoundException('Temple not found');
    }

    return {
      user: user as Omit<User, 'permissions'>,
      temple: {
        id: temple.id,
        name: temple.name,
        slug: temple.slug,
        plan: temple.plan,
        is80gRegistered: temple.is80gRegistered,
        receiptPrefix: temple.receiptPrefix,
        primaryLanguage: temple.primaryLanguage,
        timezone: temple.timezone,
      },
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * Creates a session and returns the access JWT + opaque refresh token.
   * The refresh token is the raw random string from SessionService — NOT a JWT.
   */
  private async issueTokenPair(
    user: User,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      templeId: user.templeId,
      role: user.role,
      phone: user.phone,
    };

    const accessToken = this.signAccessToken(payload);
    const refreshExpirySeconds = this.configService.get<number>(
      'JWT_REFRESH_EXPIRY',
      2592000,
    );

    // The opaque refresh token is the raw random string returned by SessionService.
    // We do NOT sign a JWT for the refresh token — that was the old broken approach.
    const { refreshToken } = await this.sessionService.create(
      user,
      refreshExpirySeconds,
      deviceInfo,
      ipAddress,
    );

    const expiresIn = this.configService.get<number>('JWT_ACCESS_EXPIRY', 900);
    return { accessToken, refreshToken, expiresIn };
  }

  /** Signs a short-lived RS256 access token. */
  private signAccessToken(payload: JwtPayload): string {
    const privateKey = this.configService
      .getOrThrow<string>('JWT_PRIVATE_KEY')
      .replace(/\\n/g, '\n');
    const expiresIn = this.configService.get<number>('JWT_ACCESS_EXPIRY', 900);

    return this.jwtService.sign(payload, {
      privateKey,
      algorithm: 'RS256',
      expiresIn,
    });
  }
}
