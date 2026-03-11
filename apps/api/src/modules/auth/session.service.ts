import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Session } from '../../database/entities/session.entity';
import { User } from '../../database/entities/user.entity';

const BCRYPT_ROUNDS = 10;
/** Refresh token byte length before base64url encoding. */
const REFRESH_TOKEN_BYTES = 48;

export interface CreateSessionResult {
  session: Session;
  /** Plain refresh token — return to client once, then discard. */
  refreshToken: string;
}

/**
 * SessionService manages refresh token slots.
 * One user may have multiple active sessions (multiple devices).
 *
 * Security invariants enforced here:
 * - Raw refresh token is never persisted. Only bcrypt(token, 10) is stored.
 * - Expired sessions are treated as revoked.
 * - validateRefreshToken does a linear scan of non-revoked sessions for the
 *   user and bcrypt.compare against each — safe because a user will rarely
 *   have more than 5 active sessions.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {}

  /**
   * Creates a new session (refresh token slot) for a user.
   * Returns the plain refresh token — pass to client, then discard.
   * The token is never retrievable again after this call.
   */
  async create(
    user: User,
    refreshExpirySeconds: number,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<CreateSessionResult> {
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + refreshExpirySeconds * 1000);

    const session = this.sessionRepo.create({
      userId: user.id,
      templeId: user.templeId, // Denormalised — never read from client
      refreshTokenHash,
      deviceInfo,
      ipAddress,
      expiresAt,
      isRevoked: false,
    });

    const saved = await this.sessionRepo.save(session);
    this.logger.log(`Session created for user ${user.id}`);

    return { session: saved, refreshToken };
  }

  /**
   * Validates a refresh token against all active sessions for a user.
   * Returns the matching session or throws UnauthorizedException.
   *
   * CRITICAL: userId must come from the decoded JWT — never from the request body.
   */
  async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<Session> {
    const activeSessions = await this.sessionRepo.find({
      where: {
        userId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    for (const session of activeSessions) {
      const isMatch = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      if (isMatch) {
        // Touch last_used_at for audit purposes
        await this.sessionRepo.update(session.id, { lastUsedAt: new Date() });
        return session;
      }
    }

    this.logger.warn(`Refresh token validation failed for user ${userId}`);
    throw new UnauthorizedException('Invalid or expired refresh token');
  }

  /**
   * Revokes a single session by ID.
   * Verifies ownership before revoking to prevent cross-user revocation.
   */
  async revoke(sessionId: string, userId: string): Promise<void> {
    const result = await this.sessionRepo.update(
      { id: sessionId, userId },
      { isRevoked: true },
    );

    if (result.affected === 0) {
      throw new UnauthorizedException('Session not found or already revoked');
    }

    this.logger.log(`Session ${sessionId} revoked for user ${userId}`);
  }

  /**
   * Revokes all active sessions for a user (logout from all devices).
   */
  async revokeAll(userId: string): Promise<void> {
    await this.sessionRepo.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
    this.logger.log(`All sessions revoked for user ${userId}`);
  }

  /**
   * Returns all active (non-revoked, non-expired) sessions for a user.
   * Used by the admin to show active devices.
   */
  async findActiveByUser(userId: string): Promise<Session[]> {
    return this.sessionRepo.find({
      where: {
        userId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { lastUsedAt: 'DESC' },
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /** Generates a cryptographically random refresh token (base64url encoded). */
  private generateRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  }
}
