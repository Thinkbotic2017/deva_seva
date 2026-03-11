import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { REDIS_KEY_RECEIPT_SEQ } from '../constants';

/** 2 years in seconds — TTL for receipt sequence keys. */
const RECEIPT_SEQ_TTL_SECONDS = 60 * 60 * 24 * 730;

/**
 * ReceiptNumberUtil generates receipt numbers that are:
 * - Atomic: Redis INCR is single-operation — safe under concurrent requests.
 * - Unique per temple per fiscal year.
 * - Human-readable: RCPT-2025-26-0001.
 *
 * On first use for a temple+year combination, sets a 2-year TTL so
 * Redis keys self-clean without manual intervention.
 */
@Injectable()
export class ReceiptNumberUtil {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Returns the next receipt number for a given temple and fiscal year.
   * Format: `{prefix}-{fiscalYear}-{4-digit-sequence}` e.g. RCPT-2025-26-0001.
   */
  async next(
    templeId: string,
    fiscalYear: string,
    prefix = 'RCPT',
  ): Promise<string> {
    const key = REDIS_KEY_RECEIPT_SEQ(templeId, fiscalYear);
    const seq = await this.redis.incr(key);

    // Set expiry only on the first increment to avoid resetting TTL on every call
    if (seq === 1) {
      await this.redis.expire(key, RECEIPT_SEQ_TTL_SECONDS);
    }

    return `${prefix}-${fiscalYear}-${String(seq).padStart(4, '0')}`;
  }
}
