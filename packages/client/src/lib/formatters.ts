/**
 * Format a number as full currency: $1,234.56
 * Returns "—" for zero values.
 */
export function fmt(n: number): string {
  if (n === 0) return '—';
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? '-' : ''}$${formatted}`;
}

/**
 * Format a number abbreviated: $1.2k for values >= 1000
 * Returns "—" for zero values.
 */
export function fmtShort(n: number): string {
  if (n === 0) return '—';
  const abs = Math.abs(n);
  if (abs >= 1000) {
    return `${n < 0 ? '-' : ''}$${(abs / 1000).toFixed(1)}k`;
  }
  return fmt(n);
}

/**
 * Format a number as whole currency: $1,235
 * Returns "—" for zero values.
 */
export function fmtWhole(n: number): string {
  if (n === 0) return '—';
  const abs = Math.abs(Math.round(n));
  return `${n < 0 ? '-' : ''}$${abs.toLocaleString()}`;
}

/**
 * Display logic for transaction amounts considering both sign and category type.
 * Savings contributions are outflows and behave like expenses (positive = money
 * out to savings), so they share the expense treatment.
 *
 * 1. Positive + expense/savings (regular outflow): neutral, no prefix → "$50.00"
 * 2. Negative + income (regular income): green, "+" prefix → "+$3,618.21"
 * 3. Negative + expense/savings (refund/credit): green, "-" prefix → "-$50.00"
 * 4. Positive + income (income reversal): red, "-" prefix → "-$500.00"
 */
export function fmtTransaction(amount: number, categoryType: string): { text: string; className: string } {
  const abs = Math.abs(amount);
  const formatted = fmt(abs);
  const isOutflow = categoryType === 'expense' || categoryType === 'savings';

  if (amount >= 0 && isOutflow) {
    // Case 1: regular expense / savings contribution — neutral, no prefix
    return { text: formatted, className: 'text-content' };
  }
  if (amount < 0 && categoryType === 'income') {
    // Case 2: regular income — green, "+"
    return { text: `+${formatted}`, className: 'text-positive' };
  }
  if (amount < 0 && isOutflow) {
    // Case 3: refund/credit against an expense or savings — green, "-"
    return { text: `-${formatted}`, className: 'text-positive' };
  }
  // Case 4: positive + income (income reversal) — red, "-"
  return { text: `-${formatted}`, className: 'text-negative' };
}
