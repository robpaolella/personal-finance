export interface DepreciationParams {
  cost: number;
  salvageValue: number;
  lifespanYears: number;
  purchaseDate: string;
  depreciationMethod: 'straight_line' | 'declining_balance';
  decliningRate: number | null;
}

export function calculateCurrentValue(params: DepreciationParams): number {
  const { cost, salvageValue, purchaseDate, depreciationMethod, decliningRate } = params;
  const now = new Date();
  const purchased = new Date(purchaseDate);
  const yearsOwned = (now.getTime() - purchased.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  if (depreciationMethod === 'declining_balance' && decliningRate != null) {
    const currentValue = cost * Math.pow(1 - decliningRate / 100, yearsOwned);
    return Math.max(salvageValue, currentValue);
  }

  // Straight line (default)
  const { lifespanYears } = params;
  const annualDepreciation = (cost - salvageValue) / lifespanYears;
  return Math.max(salvageValue, cost - (annualDepreciation * Math.min(yearsOwned, lifespanYears)));
}
