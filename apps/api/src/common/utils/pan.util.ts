/**
 * PAN (Permanent Account Number) utilities.
 * Format: AAAAA9999A (5 letters, 4 digits, 1 letter) — Indian tax ID.
 */

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/**
 * Returns true if the given string is a structurally valid PAN.
 * Does NOT validate against the Income Tax database.
 */
export function isValidPan(pan: string): boolean {
  return PAN_REGEX.test(pan.toUpperCase());
}

/**
 * Returns a masked PAN safe for display: ABCXX1234X.
 * Positions 3 and 4 (0-indexed, 4th and 5th characters) are replaced with 'X'.
 * Throws if the input is not a structurally valid PAN — callers must validate
 * with isValidPan first to avoid silently producing a malformed masked value
 * on a legal 80G receipt.
 */
export function maskPan(pan: string): string {
  if (!isValidPan(pan)) {
    throw new Error(`Cannot mask invalid PAN: '${pan}'`);
  }
  const upper = pan.toUpperCase();
  return upper.slice(0, 3) + 'XX' + upper.slice(5);
}
