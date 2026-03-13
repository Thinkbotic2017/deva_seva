/** Format a number or numeric string as Indian Rupee locale string. */
export function fmtINR(amount: string | number): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '0';
  return n.toLocaleString('en-IN');
}

/** Format with ₹ prefix. */
export function fmtINRWithSymbol(amount: string | number): string {
  return `₹${fmtINR(amount)}`;
}
