import {
  Entity,
  Column,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Session represents an active login session (refresh token slot).
 * One user can have multiple active sessions (multiple devices).
 *
 * Security rules:
 *  - refresh_token_hash stores bcrypt(refreshToken). NEVER the raw token.
 *  - templeId is denormalised here for fast lookup without joining users.
 *    Source of truth is user.templeId — kept in sync on creation.
 *  - is_revoked is set to true on logout or /logout-all.
 *  - expires_at enforces the 30-day sliding window.
 *
 * The refresh token itself is NEVER stored — only its hash.
 * On /auth/refresh, the server:
 *   1. Decodes the refresh token (JWT) to get userId and templeId.
 *   2. Finds all non-revoked, non-expired sessions for that userId.
 *   3. bcrypt.compares the incoming token against each session's hash.
 *   4. Issues a new access token only if a matching session is found.
 *
 * CRITICAL: templeId must NEVER be read from the request body on /auth/refresh.
 *           It must come from the decoded JWT payload.
 */
@Entity('sessions')
@Index(['userId', 'isRevoked'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Denormalised from user.templeId for fast token validation lookups.
   * Never trust this value from the client — always decode from the JWT.
   */
  @Index()
  @Column({ name: 'temple_id', type: 'uuid' })
  templeId: string;

  /** bcrypt hash of the refresh token. NEVER store the raw token. */
  @Column({ name: 'refresh_token_hash', type: 'varchar' })
  refreshTokenHash: string;

  @Column({ name: 'device_info', type: 'varchar', nullable: true })
  deviceInfo?: string;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress?: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'is_revoked', type: 'boolean', default: false })
  isRevoked: boolean;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
