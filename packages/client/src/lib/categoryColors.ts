import { getCategoryColorHex } from './categoryMeta';

/**
 * Category color resolver — now backed by the canonical `--c-*` palette in
 * categoryMeta.ts (Retheme v2). Kept as a thin, signature-compatible shim so the
 * existing hex consumers (badges, split dots, charts) upgrade to the semantic
 * palette without call-site changes. The `allGroupNames` argument is retained for
 * compatibility but no longer needed — colors are deterministic per category.
 *
 * Returns a mode-aware hex string (respects light/dark).
 */
export function getCategoryColor(groupName: string, _allGroupNames?: string[]): string {
  return getCategoryColorHex(groupName);
}
