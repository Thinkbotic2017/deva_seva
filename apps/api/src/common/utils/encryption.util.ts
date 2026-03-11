import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * EncryptionUtil handles AES-256-GCM encryption for PAN numbers.
 * The encryption key is a 32-byte hex string from ENCRYPTION_KEY env var.
 *
 * Threat model: If the database is compromised, PAN numbers remain safe
 * because the key lives only in the environment. Authenticated encryption
 * (GCM) also detects tampering.
 *
 * NEVER log the output of decrypt(). NEVER store plaintext PAN anywhere.
 */
@Injectable()
export class EncryptionUtil {
  private readonly key: Buffer;
  private readonly ALGORITHM = 'aes-256-gcm';
  /** 96-bit IV as recommended by NIST SP 800-38D for GCM. */
  private readonly IV_LENGTH = 12;

  constructor(private readonly config: ConfigService) {
    const keyHex = this.config.getOrThrow<string>('ENCRYPTION_KEY');
    if (keyHex.length !== 64) {
      throw new Error(
        'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)',
      );
    }
    this.key = Buffer.from(keyHex, 'hex');
  }

  /**
   * Encrypts a plaintext string (e.g. PAN) for database storage.
   * Returns: `iv:authTag:ciphertext` — all hex, colon-separated.
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypts a value produced by encrypt().
   * Use only when the raw value is needed (e.g. 80G receipt generation).
   * NEVER log the result of this method.
   */
  decrypt(stored: string): string {
    const parts = stored.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format');
    }
    const [ivHex, authTagHex, ciphertextHex] = parts as [
      string,
      string,
      string,
    ];
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');

    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return (
      decipher.update(ciphertext).toString('utf8') +
      decipher.final('utf8')
    );
  }
}
