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
