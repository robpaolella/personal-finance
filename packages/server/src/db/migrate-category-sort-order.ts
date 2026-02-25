import Database from 'better-sqlite3';

export function migrateCategorySortOrder(sqlite: Database.Database): void {
  // sort_order column already exists in schema — ensure all rows have meaningful values
  // Assign sequential sort_order within each (type, group_name) group, ordered alphabetically by sub_name
  const groups = sqlite.prepare(
    `SELECT DISTINCT type, group_name FROM categories ORDER BY type, group_name`
  ).all() as { type: string; group_name: string }[];

  const update = sqlite.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
  const selectSubs = sqlite.prepare(
    `SELECT id, sub_name FROM categories WHERE type = ? AND group_name = ? ORDER BY sub_name COLLATE NOCASE ASC`
  );

  const runAll = sqlite.transaction(() => {
    for (const g of groups) {
      const subs = selectSubs.all(g.type, g.group_name) as { id: number; sub_name: string }[];
      for (let i = 0; i < subs.length; i++) {
        update.run(i, subs[i].id);
      }
    }
  });
  runAll();
}
