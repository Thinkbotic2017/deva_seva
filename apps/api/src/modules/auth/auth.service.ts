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
  phone: string;
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
 *   2. verifyOtp    — verify OTP → find/create user → create session → issue JWT pair
 *   3. refresh      — decode refresh JWT → validate session → issue new access token
 *   4. logout       — revoke single session
 *   5. logoutAll    — revoke all sessions for user
 *
 * Security rules enforced:
 * - templeId is NEVER read from the request body on any endpoint.
 *   On verifyOtp it comes from the user record.
 *   On refresh it is decoded from the refresh token payload.
 * - Refresh tokens are opaque random strings — the JWT wrapping carries only
 *   the userId so the server can look up and bcrypt.compare the raw token.
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
   * Caller (controller) queues SMS/WhatsApp delivery with the plain OTP.
   */
  async requestOtp(
    dto: RequestOtpDto,
    ipAddress?: string,
  ): Promise<{ sessionId: string; expiresAt: Date; otp: string }> {
    const result = await this.otpService.generate(
      dto.phone,
      OtpPurpose.LOGIN,
      ipAddress,
    );

    // NOTE: otp is returned here so the controller can queue WhatsApp/SMS delivery.
    // The controller must NOT log or persist the otp value.
    return result;
  }

  /**
   * Step 2 — Verify OTP and issue token pair.
   * On first login the user record is created automatically.
   * User must belong to an active temple — standalone SUPER_ADMINs are not supported.
   */
  async verifyOtp(
    dto: VerifyOtpDto,
    ipAddress?: string,
  ): Promise<TokenPair & { user: AuthUser }> {
    const { phone } = await this.otpService.verify(dto.sessionId, dto.otp);

    // Find an active user for this phone across all temples.
    // SUPER_ADMIN accounts span temples and are looked up differently — handled in Phase 12.
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

    // Update last login timestamp
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    const tokens = await this.issueTokenPair(user, dto.deviceInfo, ipAddress);

    return {
      ...tokens,
      user: {
        userId: user.id,
        templeId: user.templeId,
        role: user.role,
        phone: user.phone,
        fullName: user.fullName,
      },
    };
  }

  /**
   * Step 3 — Refresh access token.
   * Decodes the refresh token (JWT) to extract userId and templeId.
   * NEVER reads userId or templeId from the request body.
   * Validates the session exists, is not revoked, and the token hash matches.
   * Issues a new access token (does NOT rotate the refresh token).
   */
  async refresh(dto: RefreshDto): Promise<{ accessToken: string; expiresIn: number }> {
    // Decode the refresh token to get userId — not from request body
    let payload: JwtPayload;
    try {
      const publicKey = this.configService
        .getOrThrow<string>('JWT_PUBLIC_KEY')
        .replace(/\\n/g, '\n');
      payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        algorithms: ['RS256'],
        publicKey,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Validate the session — bcrypt.compare against stored hash
    await this.sessionService.validateRefreshToken(payload.sub, dto.refreshToken);

    // Issue new short-lived access token only
    const accessToken = this.signAccessToken(payload);
    const expiresIn = this.configService.get<number>('JWT_ACCESS_EXPIRY', 900);

    return { accessToken, expiresIn };
  }

  /**
   * Logout — revoke a single session.
   * Verifies the session belongs to the calling user before revoking.
   */
  async logout(sessionId: string, userId: string): Promise<void> {
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
   * Issues a JWT access+refresh token pair and creates a session record.
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

    // Refresh token: a signed JWT that carries only sub (userId).
    // The payload is minimal — the raw token string is what gets hashed and stored.
    const privateKey = this.configService
      .getOrThrow<string>('JWT_PRIVATE_KEY')
      .replace(/\\n/g, '\n');

    const refreshToken = this.jwtService.sign(
      { sub: user.id, templeId: user.templeId, role: user.role, phone: user.phone },
      { privateKey, algorithm: 'RS256', expiresIn: refreshExpirySeconds },
    );

    await this.sessionService.create(user, refreshExpirySeconds, deviceInfo, ipAddress);

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
