/**
 * Canonical category identity — the single source of truth for a category's
 * emoji + categorical hue, used everywhere a category appears (transaction rows,
 * pills, chart series, legends, breakdowns).
 *
 * Hues are the 9 semantic `--c-*` tokens from the Retheme v2 theme (index.css),
 * so they stay balanced and respond to light/dark automatically. Keyed by the
 * category (`group_name`) level, normalized case-insensitively; covers both the
 * app's current seed names AND the design's canonical names so it works before
 * and after the category restructure (Wave 1b). Unknown names get a
 * deterministic hue + neutral emoji fallback.
 *
 * NOTE: once categories carry stored emoji/color columns (migration Wave 1b A),
 * server values take precedence and this becomes the fallback/seed source.
 */

export type CategoryToken =
  | 'c-teal' | 'c-green' | 'c-blue' | 'c-indigo' | 'c-violet'
  | 'c-fuchsia' | 'c-rose' | 'c-orange' | 'c-amber';

export interface CategoryMeta {
  emoji: string;
  /** Categorical token name, e.g. 'c-blue' → utilities bg-c-blue / text-c-blue and var(--c-blue). */
  token: CategoryToken;
}

const ALL_TOKENS: CategoryToken[] = [
  'c-teal', 'c-green', 'c-blue', 'c-indigo', 'c-violet',
  'c-fuchsia', 'c-rose', 'c-orange', 'c-amber',
];

/** Normalize a category name for lookup: lowercase, collapse separators/whitespace. */
function norm(name: string): string {
  return name.toLowerCase().replace(/[\s/&_-]+/g, ' ').trim();
}

// Canonical map. Keys are normalized names; multiple aliases point to one meta so
// current seed names ("Auto/Transportation", "Health") and design names
// ("Auto & Transport", "Health & Wellness") resolve identically.
const RAW: Array<{ names: string[]; meta: CategoryMeta }> = [
  // ── Income ──
  { names: ['income', 'paychecks', 'take home pay', 'paycheck'], meta: { emoji: '🥇', token: 'c-green' } },
  { names: ['interest', 'interest income'], meta: { emoji: '💵', token: 'c-teal' } },
  { names: ['dividends', 'dividend income'], meta: { emoji: '📈', token: 'c-indigo' } },
  { names: ['business income'], meta: { emoji: '💼', token: 'c-amber' } },
  { names: ['rental income', 'rent income'], meta: { emoji: '🏠', token: 'c-orange' } },
  { names: ['other income'], meta: { emoji: '💵', token: 'c-blue' } },

  // ── Expenses ──
  { names: ['daily living'], meta: { emoji: '🛒', token: 'c-blue' } },
  { names: ['household'], meta: { emoji: '🏠', token: 'c-teal' } },
  { names: ['auto transportation', 'auto transport', 'auto & transport', 'transportation'], meta: { emoji: '🚗', token: 'c-orange' } },
  { names: ['utilities'], meta: { emoji: '⚡', token: 'c-amber' } },
  { names: ['health', 'health wellness', 'health & wellness'], meta: { emoji: '❤️‍🩹', token: 'c-rose' } },
  { names: ['entertainment'], meta: { emoji: '🎬', token: 'c-fuchsia' } },
  { names: ['insurance'], meta: { emoji: '🛡️', token: 'c-indigo' } },
  { names: ['business'], meta: { emoji: '💼', token: 'c-violet' } },
  { names: ['dues subscriptions', 'dues & subscriptions', 'subscriptions'], meta: { emoji: '🔁', token: 'c-violet' } },
  { names: ['clothing'], meta: { emoji: '👕', token: 'c-green' } },
  { names: ['loan', 'loans'], meta: { emoji: '🏦', token: 'c-rose' } },
  { names: ['tax not withheld', 'taxes', 'tax'], meta: { emoji: '🧾', token: 'c-amber' } },

  // ── Savings ──
  { names: ['retirement'], meta: { emoji: '📈', token: 'c-indigo' } },
  { names: ['brokerage'], meta: { emoji: '📊', token: 'c-blue' } },
  { names: ['savings'], meta: { emoji: '💰', token: 'c-green' } },
  { names: ['education'], meta: { emoji: '🎓', token: 'c-teal' } },
  { names: ['emergency fund', 'emergency'], meta: { emoji: '🚨', token: 'c-rose' } },
];

const MAP = new Map<string, CategoryMeta>();
for (const { names, meta } of RAW) {
  for (const n of names) MAP.set(norm(n), meta);
}

/** Deterministic hue for names not in the canonical map (stable across sessions). */
function fallbackToken(name: string): CategoryToken {
  let h = 0;
  const s = norm(name);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return ALL_TOKENS[h % ALL_TOKENS.length];
}

export function getCategoryMeta(name: string | null | undefined): CategoryMeta {
  if (!name) return { emoji: '🏷️', token: 'c-blue' };
  return MAP.get(norm(name)) ?? { emoji: '🏷️', token: fallbackToken(name) };
}

export function getCategoryEmoji(name: string | null | undefined): string {
  return getCategoryMeta(name).emoji;
}

export function getCategoryToken(name: string | null | undefined): CategoryToken {
  return getCategoryMeta(name).token;
}

/** CSS value reference, e.g. 'var(--c-blue)' — for style props and color-mix. */
export function getCategoryColorVar(name: string | null | undefined): string {
  return `var(--${getCategoryMeta(name).token})`;
}

/**
 * Resolve a `--c-*` token (or any CSS custom property) to its current computed
 * hex, mode-aware. For consumers that need a concrete color string (e.g.
 * inline-SVG chart fills/strokes) rather than a `var()` reference. Cached per
 * (token, light/dark); the cache clears when the `.dark` class flips.
 */
let cachedDark: boolean | null = null;
const hexCache = new Map<string, string>();
function currentDark(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}
export function resolveTokenColor(token: CategoryToken | string): string {
  if (typeof document === 'undefined') return '#2563eb';
  const dark = currentDark();
  if (dark !== cachedDark) { hexCache.clear(); cachedDark = dark; }
  const varName = token.startsWith('--') ? token : `--${token}`;
  const cached = hexCache.get(varName);
  if (cached) return cached;
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#2563eb';
  hexCache.set(varName, val);
  return val;
}

/** Concrete hex for a category (mode-aware) — for charts and hex-only consumers. */
export function getCategoryColorHex(name: string | null | undefined): string {
  return resolveTokenColor(getCategoryMeta(name).token);
}
