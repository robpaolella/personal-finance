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
 *
 * 1. Positive + expense (regular expense): black, no prefix → "$50.00"
 * 2. Negative + income (regular income): green, "+" prefix → "+$3,618.21"
 * 3. Negative + expense (refund/credit): green, "-" prefix → "-$50.00"
 * 4. Positive + income (income reversal): red, "-" prefix → "-$500.00"
 */
export function fmtTransaction(amount: number, categoryType: string): { text: string; className: string } {
  const abs = Math.abs(amount);
  const formatted = fmt(abs);

  if (amount >= 0 && categoryType === 'expense') {
    // Case 1: regular expense — black, no prefix
    return { text: formatted, className: 'text-[var(--text-primary)]' };
  }
  if (amount < 0 && categoryType === 'income') {
    // Case 2: regular income — green, "+"
    return { text: `+${formatted}`, className: 'text-[#10b981]' };
  }
  if (amount < 0 && categoryType === 'expense') {
    // Case 3: refund/credit — green, "-"
    return { text: `-${formatted}`, className: 'text-[#10b981]' };
  }
  // Case 4: positive + income (income reversal) — red, "-"
  return { text: `-${formatted}`, className: 'text-[#ef4444]' };
}
