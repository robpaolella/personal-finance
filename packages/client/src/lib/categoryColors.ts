const CATEGORY_PALETTE = [
  '#ef4444', '#ec4899', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6',
  '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#f59e0b',
  '#f97316', '#e11d48', '#0ea5e9', '#d946ef',
];

// Cache so colors stay consistent during a session
let colorMap: Map<string, string> | null = null;
let cachedKey = '';

export function getCategoryColor(groupName: string, allGroupNames: string[]): string {
  const key = allGroupNames.join('|');
  if (key !== cachedKey) {
    colorMap = new Map();
    const sorted = [...new Set(allGroupNames)].sort();
    sorted.forEach((name, i) => {
      colorMap!.set(name, CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]);
    });
    cachedKey = key;
  }
  return colorMap!.get(groupName) ?? CATEGORY_PALETTE[0];
}
