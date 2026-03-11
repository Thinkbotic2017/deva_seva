import { registerAs } from '@nestjs/config';

/** Redis connection configuration. Used for BullMQ queues and receipt number sequences. */
export const redisConfig = registerAs('redis', () => ({
  url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
}));
