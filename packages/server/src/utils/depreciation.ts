export interface DepreciationParams {
  cost: number;
  salvageValue: number;
  lifespanYears: number;
  purchaseDate: string;
  depreciationMethod: 'straight_line' | 'declining_balance';
  decliningRate: number | null;
  /** Value the asset as of this date instead of today — used for historical net-worth points. */
  asOf?: string | Date;
}

export function calculateCurrentValue(params: DepreciationParams): number {
  const { cost, salvageValue, purchaseDate, depreciationMethod, decliningRate, asOf } = params;
  const now = asOf ? new Date(asOf) : new Date();
  const purchased = new Date(purchaseDate);
  // Clamp so a date before acquisition yields full cost (callers exclude not-yet-owned assets).
  const yearsOwned = Math.max(0, (now.getTime() - purchased.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  if (depreciationMethod === 'declining_balance' && decliningRate != null) {
    const currentValue = cost * Math.pow(1 - decliningRate / 100, yearsOwned);
    return Math.max(salvageValue, currentValue);
  }

  // Straight line (default)
  const { lifespanYears } = params;
  const annualDepreciation = (cost - salvageValue) / lifespanYears;
  return Math.max(salvageValue, cost - (annualDepreciation * Math.min(yearsOwned, lifespanYears)));
}
