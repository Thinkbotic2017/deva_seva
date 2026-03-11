import { isValidPan, maskPan } from '../pan.util';

describe('PAN utilities', () => {
  describe('isValidPan', () => {
    it('accepts a valid PAN in uppercase', () => {
      expect(isValidPan('ABCDE1234F')).toBe(true);
    });

    it('accepts a valid PAN in lowercase (normalises internally)', () => {
      expect(isValidPan('abcde1234f')).toBe(true);
    });

    it('rejects a PAN shorter than 10 characters', () => {
      expect(isValidPan('ABCDE123')).toBe(false);
    });

    it('rejects a PAN with digits in first 5 positions', () => {
      expect(isValidPan('12345ABCDE')).toBe(false);
    });

    it('rejects a PAN with letters in digit positions', () => {
      expect(isValidPan('ABCDEABCDF')).toBe(false);
    });

    it('rejects an empty string', () => {
      expect(isValidPan('')).toBe(false);
    });
  });

  describe('maskPan', () => {
    it('masks characters 4 and 5 with XX', () => {
      expect(maskPan('ABCDE1234F')).toBe('ABCXX1234F');
    });

    it('lowercases input before masking', () => {
      expect(maskPan('abcde1234f')).toBe('ABCXX1234F');
    });

    it('throws on invalid PAN to prevent silent wrong output on receipts', () => {
      expect(() => maskPan('INVALID')).toThrow('Cannot mask invalid PAN');
      expect(() => maskPan('')).toThrow('Cannot mask invalid PAN');
    });
  });
});
