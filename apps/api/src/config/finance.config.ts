import { registerAs } from '@nestjs/config';

/** Finance-related configuration. */
export const financeConfig = registerAs('finance', () => ({
  /** Expenses above this amount (in ₹) require trustee approval. */
  expenseApprovalThreshold: parseInt(
    process.env['EXPENSE_APPROVAL_THRESHOLD'] ?? '5000',
    10,
  ),
}));
