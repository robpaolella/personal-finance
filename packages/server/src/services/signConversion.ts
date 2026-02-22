import type { AccountClassification } from '@ledger/shared/src/types.js';

/**
 * Convert a SimpleFIN amount to Ledger's internal sign convention.
 *
 * Ledger convention: positive = money out, negative = money in.
 *
 * SimpleFIN convention varies by account type:
 *   - Checking/savings (liquid): positive = deposit (money in), negative = withdrawal (money out)
 *   - Credit cards (liability): negative = charge (money out), positive = payment/refund (money in)
 *   - Investment/retirement: positive = contribution (money in), negative = withdrawal (money out)
 *
 * All types require a sign flip to match Ledger's convention.
 */
export function convertToLedgerSign(simplefinAmount: number, classification: AccountClassification): number {
  // All classifications: flip the sign
  // Liquid:      SF positive (deposit/in) → Ledger negative (money in) ✓
  // Liquid:      SF negative (withdrawal/out) → Ledger positive (money out) ✓
  // Liability:   SF negative (charge/out) → Ledger positive (money out) ✓
  // Liability:   SF positive (payment/in) → Ledger negative (money in) ✓
  // Investment:  Same as liquid
  return -simplefinAmount;
}

/**
 * Convert a SimpleFIN balance to Ledger display convention.
 * Balances are stored as-is (not sign-flipped) since they represent account state, not transaction direction.
 */
export function convertBalanceForDisplay(simplefinBalance: number, _classification: AccountClassification): number {
  return simplefinBalance;
}
