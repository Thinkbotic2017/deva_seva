import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { Session } from '../../database/entities/session.entity';
import { User } from '../../database/entities/user.entity';

const BCRYPT_ROUNDS = 10;
/** Byte length of the secret portion of the refresh token (before base64url). */
const REFRESH_TOKEN_BYTES = 48;
/** Maximum active sessions per user (oldest is evicted when exceeded). */
const MAX_SESSIONS_PER_USER = 10;

export interface CreateSessionResult {
  session: Session;
  /** Plain refresh token — return to client once, then discard. Never retrievable again. */
  refreshToken: string;
}

/**
 * SessionService manages refresh token slots.
 * One user may have multiple active sessions (multiple devices), capped at 10.
 *
 * Refresh token format: {sessionId}.{base64url-secret}
 * - sessionId (UUID) is the lookup key — allows O(1) validation without userId.
 * - secret (48 random bytes, base64url) is the unforgeable authenticator.
 * - The full token string is bcrypt-hashed and stored — the raw token is never
 *   persisted and is only returned once at creation time.
 *
 * Security invariants:
 * - Raw refresh token is never persisted. Only bcrypt(fullToken, 10) is stored.
 * - Expired and revoked sessions are rejected.
 * - HMAC mismatch is logged as a security event (possible token theft).
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
  ) {}

  /**
   * Creates a new session for a user and returns the plain refresh token.
   *
   * Enforces a per-user session cap of 10 — the oldest session is evicted if
   * the cap is reached before inserting the new one.
   *
   * The session UUID is pre-generated so the full token string
   * ({sessionId}.{secret}) can be hashed before the DB insert — no 2-step update.
   */
  async create(
    user: User,
    refreshExpirySeconds: number,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<CreateSessionResult> {
    // Evict oldest session if user is at the cap
    await this.enforceSessionCap(user.id);

    // Pre-generate the UUID so the full token can be constructed and hashed
    // before the INSERT — avoids a placeholder hash or a 2-step update.
    const sessionId = randomUUID();
    const secret = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const rawToken = `${sessionId}.${secret}`;
    const refreshTokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + refreshExpirySeconds * 1000);

    const session = this.sessionRepo.create({
      id: sessionId,
      userId: user.id,
      templeId: user.templeId, // Denormalised — never read from client
      refreshTokenHash,
      deviceInfo,
      ipAddress,
      expiresAt,
      isRevoked: false,
    });

    const saved = await this.sessionRepo.save(session);
    this.logger.log(`Session ${sessionId} created for user ${user.id}`);

    return { session: saved, refreshToken: rawToken };
  }

  /**
   * Validates a raw opaque refresh token.
   *
   * Parses the session UUID prefix for an O(1) DB lookup, then bcrypt-compares
   * the full token against the stored hash. Does NOT require userId — the session
   * UUID is the lookup key, and the bcrypt comparison prevents forgery.
   *
   * Throws UnauthorizedException on any validation failure (no distinguishing
   * detail is returned to prevent oracle attacks).
   */
  async validateRefreshToken(rawToken: string): Promise<Session> {
    const dotIndex = rawToken.indexOf('.');
    if (dotIndex === -1) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const sessionId = rawToken.substring(0, dotIndex);

    const session = await this.sessionRepo.findOne({
      where: {
        id: sessionId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!session) {
      this.logger.warn(`Refresh validation failed — session ${sessionId} not found or expired`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const isMatch = await bcrypt.compare(rawToken, session.refreshTokenHash);
    if (!isMatch) {
      // HMAC mismatch with a valid session ID is a strong signal of token theft.
      this.logger.warn(
        `Refresh token HMAC mismatch for session ${sessionId} (user ${session.userId}) — possible token theft`,
      );
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.sessionRepo.update(session.id, { lastUsedAt: new Date() });
    return session;
  }

  /**
   * Revokes a single session by ID.
   * Verifies ownership (userId match) before revoking to prevent cross-user revocation.
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

  /**
   * Enforces the per-user session cap (MAX_SESSIONS_PER_USER = 10).
   * Deletes the oldest active session if the user is at the limit.
   * Called before every session creation.
   */
  private async enforceSessionCap(userId: string): Promise<void> {
    const activeSessions = await this.sessionRepo.find({
      where: {
        userId,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'ASC' }, // oldest first for eviction
    });

    if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
      const oldest = activeSessions[0];
      if (oldest) {
        await this.sessionRepo.delete(oldest.id);
        this.logger.log(
          `Session cap (${MAX_SESSIONS_PER_USER}) reached for user ${userId} — evicted oldest session ${oldest.id}`,
        );
      }
    }
  }
}
