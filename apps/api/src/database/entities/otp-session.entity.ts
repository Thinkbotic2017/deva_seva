import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { OtpPurpose } from '@devaseva/types';

/**
 * OtpSession stores a single OTP request.
 * NOT tenant-scoped — OTP sessions exist before the user is authenticated
 * and before a templeId is known (login flow starts with just a phone number).
 *
 * Security rules:
 *  - otp_hash stores bcrypt(otp, 10). NEVER the raw OTP.
 *  - attempts is incremented on every failed verify. Locked at MAX_OTP_ATTEMPTS (3).
 *  - is_used is set to true after the first successful verification.
 *  - Expired sessions (expires_at < NOW()) are ignored.
 *
 * No updated_at column — the only mutation allowed is:
 *   - incrementing attempts
 *   - setting is_used = true
 * All other fields are set on creation and never changed.
 */
@Entity('otp_sessions')
@Index(['phone', 'isUsed', 'expiresAt'])
export class OtpSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 15 })
  phone: string;

  /** bcrypt(otp, 10). NEVER store the raw OTP code. */
  @Column({ name: 'otp_hash', type: 'varchar' })
  otpHash: string;

  @Column({
    type: 'enum',
    enum: OtpPurpose,
    default: OtpPurpose.LOGIN,
  })
  purpose: OtpPurpose;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  /** Incremented on every failed attempt. Session is locked when attempts >= MAX_OTP_ATTEMPTS. */
  @Column({ type: 'integer', default: 0 })
  attempts: number;

  /** Set to true after the first successful OTP verification. Prevents reuse. */
  @Column({ name: 'is_used', type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
