// Canonical filter model shared across the app (Transactions is the reference UI).
export interface FilterDraft {
  account: string;      // 'All' or an account id (single-select)
  type: string;         // 'All' | 'Expense' | 'Income'  (rendered as Debits/Credits)
  category: string[];   // tokens: 'sub:<id>' (group toggles add all its subs)
  merchant: string[];   // merchant id strings
  op: string;           // '' | 'gt' | 'lt' | 'eq' | 'bt'
  val: string; min: string; max: string;
  needsReview?: boolean; // only surfaced where the host opts in (Transactions)
}

export const EMPTY_FILTER: FilterDraft = { account: 'All', type: 'All', category: [], merchant: [], op: '', val: '', min: '', max: '', needsReview: false };

export const filterDraftCount = (d: FilterDraft) =>
  d.category.filter((c) => c.startsWith('sub:')).length + d.merchant.length + (d.account !== 'All' ? 1 : 0) + (d.op ? 1 : 0) + (d.type !== 'All' ? 1 : 0) + (d.needsReview ? 1 : 0);
