import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '../constants';
import { PaginatedResult } from '@devaseva/types';

/**
 * Clamps a requested page size to the allowed range [1, MAX_PAGE_LIMIT].
 */
export function safeLimit(requested?: number): number {
  const limit = requested ?? DEFAULT_PAGE_LIMIT;
  return Math.min(Math.max(1, limit), MAX_PAGE_LIMIT);
}

/**
 * Calculates the SQL OFFSET for a given 1-indexed page and limit.
 */
export function pageOffset(page: number, limit: number): number {
  return (Math.max(1, page) - 1) * limit;
}

/**
 * Wraps raw TypeORM getManyAndCount results into the standard paginated envelope.
 */
export function toPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
