import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionUtil } from '../encryption.util';

const MOCK_KEY = 'a'.repeat(64); // 64 hex chars = 32 bytes

describe('EncryptionUtil', () => {
  let util: EncryptionUtil;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EncryptionUtil,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'ENCRYPTION_KEY') return MOCK_KEY;
              throw new Error(`Unknown config key: ${key}`);
            },
          },
        },
      ],
    }).compile();

    util = module.get(EncryptionUtil);
  });

  it('encrypts and decrypts a PAN number successfully', () => {
    const pan = 'ABCDE1234F';
    const encrypted = util.encrypt(pan);
    expect(encrypted).not.toBe(pan);
    expect(util.decrypt(encrypted)).toBe(pan);
  });

  it('produces different ciphertext on each encryption (random IV)', () => {
    const pan = 'ABCDE1234F';
    const first = util.encrypt(pan);
    const second = util.encrypt(pan);
    expect(first).not.toBe(second);
  });

  it('throws on tampered ciphertext (GCM authTag fails)', () => {
    const encrypted = util.encrypt('ABCDE1234F');
    const parts = encrypted.split(':');
    // Corrupt the ciphertext portion (index 2)
    const original = parts[2] ?? '';
    parts[2] = original.length > 8 ? 'deadbeef' + original.slice(8) : 'deadbeef';
    expect(() => util.decrypt(parts.join(':'))).toThrow();
  });

  it('uses a 12-byte (24 hex char) IV per NIST SP 800-38D', () => {
    const encrypted = util.encrypt('ABCDE1234F');
    const ivHex = encrypted.split(':')[0] ?? '';
    expect(ivHex.length).toBe(24); // 12 bytes * 2 hex chars per byte
  });

  it('throws at startup if ENCRYPTION_KEY is not 64 hex characters', async () => {
    // NestJS instantiates providers during compile() — the error surfaces there,
    // not at module.get() time.
    await expect(
      Test.createTestingModule({
        providers: [
          EncryptionUtil,
          {
            provide: ConfigService,
            useValue: { getOrThrow: () => 'tooshort' },
          },
        ],
      }).compile(),
    ).rejects.toThrow('ENCRYPTION_KEY must be a 64-character hex string');
  });
});
