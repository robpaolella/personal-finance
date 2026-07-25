import type Database from 'better-sqlite3';

/**
 * Review-task lifecycle helpers. Single source of the invariant:
 *   transactions.needs_review = 1  ⟺  an OPEN transaction_reviews row exists.
 *
 * Every fn takes the `sqlite` handle so callers can compose inside their own
 * `sqlite.transaction(...)` (e.g. the SimpleFIN commit block). Assignment writes a
 * row into the `notifications` table (this feature is its first real driver).
 */

export type ReviewReason = 'auto_uncategorized' | 'auto_low_confidence' | 'manual';

export const reviewDedupeKey = (txnId: number) => `review:txn:${txnId}`;

/**
 * Default assignee for a SYSTEM-created review: the transaction's account owner.
 * If the account is shared (multiple owners), the most-privileged owner
 * (owner > admin > member). Falls back to the most-privileged active household
 * user if the account has no explicit owners. Returns null only if there are no
 * active users at all.
 */
export function defaultAssigneeForTxn(sqlite: Database.Database, txnId: number): number | null {
  const rank = (r: string) => (r === 'owner' ? 0 : r === 'admin' ? 1 : 2);
  const pick = (list: { id: number; role: string }[]) =>
    list.length ? [...list].sort((a, b) => rank(a.role) - rank(b.role) || a.id - b.id)[0].id : null;
  const owners = sqlite.prepare(`
    SELECT u.id AS id, u.role AS role
    FROM transactions t
    JOIN account_owners ao ON ao.account_id = t.account_id
    JOIN users u ON ao.user_id = u.id
    WHERE t.id = ? AND u.is_active = 1
  `).all(txnId) as { id: number; role: string }[];
  if (owners.length) return pick(owners);
  const anyUser = sqlite.prepare('SELECT id, role FROM users WHERE is_active = 1').all() as { id: number; role: string }[];
  return pick(anyUser);
}

/** Flag (or reopen) a transaction for review + set needs_review=1. Upsert by txn. */
export function flagReview(
  sqlite: Database.Database,
  opts: { txnId: number; reason: ReviewReason; flaggedBy?: number | null; assigneeId?: number | null; note?: string | null },
): void {
  const { txnId, reason, flaggedBy = null, assigneeId = null, note = null } = opts;
  sqlite.prepare(`
    INSERT INTO transaction_reviews (transaction_id, status, reason, assignee_id, note, flagged_by, resolved_by, resolved_at)
    VALUES (?, 'open', ?, ?, ?, ?, NULL, NULL)
    ON CONFLICT(transaction_id) DO UPDATE SET
      status = 'open',
      reason = excluded.reason,
      assignee_id = excluded.assignee_id,
      note = COALESCE(excluded.note, transaction_reviews.note),
      flagged_by = excluded.flagged_by,
      resolved_by = NULL,
      resolved_at = NULL
  `).run(txnId, reason, assigneeId, note, flaggedBy);
  sqlite.prepare('UPDATE transactions SET needs_review = 1 WHERE id = ?').run(txnId);
  // Clear any prior assignee's notification before (re)notifying — a re-flag can
  // change or drop the assignee (mirrors assignReview's clear-before-notify).
  clearReviewNotification(sqlite, txnId);
  if (assigneeId != null) upsertReviewNotification(sqlite, txnId, assigneeId);
}

/** Resolve an open review (mark reviewed / unflag) + set needs_review=0. No-op if none open. */
export function resolveReview(
  sqlite: Database.Database,
  opts: { txnId: number; resolvedBy?: number | null },
): void {
  const { txnId, resolvedBy = null } = opts;
  const res = sqlite.prepare(`
    UPDATE transaction_reviews
    SET status = 'resolved', resolved_by = ?, resolved_at = ?
    WHERE transaction_id = ? AND status = 'open'
  `).run(resolvedBy, new Date().toISOString(), txnId);
  // Always clear the cache flag + notification (cheap, keeps state consistent even
  // if the row was already resolved).
  sqlite.prepare('UPDATE transactions SET needs_review = 0 WHERE id = ?').run(txnId);
  if (res.changes > 0) clearReviewNotification(sqlite, txnId);
}

/** Reopen a resolved review (status back to open) + needs_review=1. */
export function reopenReview(sqlite: Database.Database, txnId: number): void {
  const res = sqlite.prepare(`
    UPDATE transaction_reviews SET status = 'open', resolved_by = NULL, resolved_at = NULL
    WHERE transaction_id = ? AND status = 'resolved'
  `).run(txnId);
  if (res.changes > 0) {
    sqlite.prepare('UPDATE transactions SET needs_review = 1 WHERE id = ?').run(txnId);
    const r = sqlite.prepare('SELECT assignee_id FROM transaction_reviews WHERE transaction_id = ?').get(txnId) as { assignee_id: number | null } | undefined;
    if (r?.assignee_id != null) upsertReviewNotification(sqlite, txnId, r.assignee_id);
  }
}

/** Set (or clear, with null) the assignee on an existing review + move the notification. */
export function assignReview(sqlite: Database.Database, txnId: number, assigneeId: number | null): void {
  sqlite.prepare('UPDATE transaction_reviews SET assignee_id = ? WHERE transaction_id = ?').run(assigneeId, txnId);
  clearReviewNotification(sqlite, txnId); // drop any prior assignee's notification
  // Only (re)notify while the review is still open.
  if (assigneeId != null) {
    const r = sqlite.prepare("SELECT status FROM transaction_reviews WHERE transaction_id = ?").get(txnId) as { status: string } | undefined;
    if (r?.status === 'open') upsertReviewNotification(sqlite, txnId, assigneeId);
  }
}

export function setReviewNote(sqlite: Database.Database, txnId: number, note: string | null): void {
  sqlite.prepare('UPDATE transaction_reviews SET note = ? WHERE transaction_id = ?').run(note, txnId);
}

/** Upsert the assignee's notification for a review (dedupe by user + review key). */
export function upsertReviewNotification(sqlite: Database.Database, txnId: number, assigneeId: number): void {
  const t = sqlite.prepare(`
    SELECT t.description, t.amount, t.date, m.name AS merchant_name
    FROM transactions t LEFT JOIN merchants m ON t.merchant_id = m.id WHERE t.id = ?
  `).get(txnId) as { description: string; amount: number; date: string; merchant_name: string | null } | undefined;
  if (!t) return;
  const label = t.merchant_name || t.description;
  const title = `Review: ${label}`;
  const body = `$${Math.abs(t.amount).toFixed(2)} on ${t.date} needs review`;
  sqlite.prepare(`
    INSERT INTO notifications (user_id, type, severity, title, body, action_label, action_target, dedupe_key, is_read)
    VALUES (?, 'needs_review', 'info', ?, ?, 'Review', ?, ?, 0)
    ON CONFLICT(user_id, dedupe_key) DO UPDATE SET
      title = excluded.title, body = excluded.body, action_target = excluded.action_target, is_read = 0
  `).run(assigneeId, title, body, `/reviews?txn=${txnId}`, reviewDedupeKey(txnId));
}

/** Remove the review notification for a txn (all users — covers reassign/resolve/delete). */
export function clearReviewNotification(sqlite: Database.Database, txnId: number): void {
  sqlite.prepare('DELETE FROM notifications WHERE dedupe_key = ?').run(reviewDedupeKey(txnId));
}
