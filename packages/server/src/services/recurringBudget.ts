import { sqlite } from '../db/index.js';
import { computePaydaysInMonth, type PayCycleForMath } from '../utils/payCycleMath.js';

export interface RecurringFloor {
  amount: number;      // summed positive magnitude of active occurrences this month
  itemCount: number;
  labels: string[];    // contributing item labels, for the notice breakdown
}

interface Row {
  id: number; label: string; category_id: number; amount: number | null; freq_kind: string;
  day: number | null; days_json: string | null; interval: number | null; anchor_date: string | null;
  months_json: string | null; start_date: string | null; effective_start: string | null; effective_end: string | null;
}

function parseIntArray(json: string | null): number[] {
  if (!json) return [];
  try { const v = JSON.parse(json); return Array.isArray(v) ? v.map(Number).filter((n) => Number.isFinite(n)) : []; }
  catch { return []; }
}

/**
 * Per-category recurring total for `month` ('YYYY-MM') — the sum of each active
 * recurring item's per-occurrence amount × its occurrences in the month. Used to
 * overlay the budget (floor in 'set' mode, added in 'add' mode). Single source of
 * truth shared by /recurring/budget-floors and /budgets/summary.
 */
export function getRecurringFloors(month: string): Map<number, RecurringFloor> {
  const [year, mon] = month.split('-').map(Number);
  const rows = sqlite.prepare(
    `SELECT id, label, category_id, amount, freq_kind, day, days_json, interval, anchor_date,
            months_json, start_date, effective_start, effective_end
       FROM recurring_items WHERE status = 'active'`
  ).all() as Row[];

  const map = new Map<number, RecurringFloor>();
  for (const r of rows) {
    const days = parseIntArray(r.days_json);
    const math: PayCycleForMath = {
      id: r.id, label: r.label, user_id: null, ownerName: null, category_id: r.category_id,
      sub_name: '', group_name: '', frequency: r.freq_kind as PayCycleForMath['frequency'],
      amount: r.amount ?? 0, anchor_date: r.anchor_date ?? r.start_date,
      day_of_month_1: days[0] ?? null, day_of_month_2: days[1] ?? null, day_of_month: r.day,
      interval: r.interval, months: parseIntArray(r.months_json),
      effective_start: r.effective_start ?? r.start_date, effective_end: r.effective_end, is_active: 1,
    };
    const count = computePaydaysInMonth(math, year, mon).length;
    if (count === 0) continue;
    const add = (r.amount ?? 0) * count;
    const cur = map.get(r.category_id) ?? { amount: 0, itemCount: 0, labels: [] };
    cur.amount = +(cur.amount + add).toFixed(2);
    cur.itemCount += 1;
    cur.labels.push(r.label);
    map.set(r.category_id, cur);
  }
  return map;
}
