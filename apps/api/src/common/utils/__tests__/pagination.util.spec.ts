import { safeLimit, pageOffset, toPaginatedResult } from '../pagination.util';
import { MAX_PAGE_LIMIT } from '../../constants';

describe('pagination utilities', () => {
  describe('safeLimit', () => {
    it('returns default limit when undefined', () => {
      expect(safeLimit(undefined)).toBe(20);
    });

    it('caps at MAX_PAGE_LIMIT', () => {
      expect(safeLimit(999)).toBe(MAX_PAGE_LIMIT);
    });

    it('floors at 1', () => {
      expect(safeLimit(0)).toBe(1);
    });

    it('accepts a value within range', () => {
      expect(safeLimit(50)).toBe(50);
    });
  });

  describe('pageOffset', () => {
    it('returns 0 for page 1', () => {
      expect(pageOffset(1, 20)).toBe(0);
    });

    it('returns 20 for page 2 with limit 20', () => {
      expect(pageOffset(2, 20)).toBe(20);
    });

    it('clamps page to 1 if 0 or negative', () => {
      expect(pageOffset(0, 20)).toBe(0);
    });
  });

  describe('toPaginatedResult', () => {
    it('calculates totalPages correctly', () => {
      const result = toPaginatedResult(['a', 'b', 'c'], 55, 3, 20);
      expect(result.meta.totalPages).toBe(3);
    });

    it('includes all meta fields', () => {
      const result = toPaginatedResult([], 0, 1, 20);
      expect(result.meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
    });
  });
});
