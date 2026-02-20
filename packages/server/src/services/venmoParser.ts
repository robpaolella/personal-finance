export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  note?: string;
}

/**
 * Parse Venmo CSV format.
 * Columns: (blank ID), Datetime, Type, Status, Note, From, To, Amount (total), ...
 * We parse based on column positions.
 */
export function parseVenmoCSV(headers: string[], rows: string[][], ownerName: string): ParsedTransaction[] {
  // Find column indices
  const dateIdx = headers.findIndex((h) => /datetime|date/i.test(h));
  const typeIdx = headers.findIndex((h) => /^type$/i.test(h));
  const statusIdx = headers.findIndex((h) => /status/i.test(h));
  const noteIdx = headers.findIndex((h) => /note/i.test(h));
  const fromIdx = headers.findIndex((h) => /from/i.test(h));
  const toIdx = headers.findIndex((h) => /^to$/i.test(h));
  const amountIdx = headers.findIndex((h) => /amount.*total|^amount$/i.test(h));

  if (dateIdx < 0 || amountIdx < 0) return [];

  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    // Skip incomplete/declined
    const status = statusIdx >= 0 ? row[statusIdx]?.trim() : '';
    if (status && /incomplete|declined|expired|cancelled/i.test(status)) continue;

    const dateStr = row[dateIdx]?.trim();
    if (!dateStr) continue;

    // Parse date (Venmo uses various formats)
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) continue;
    const date = parsedDate.toISOString().slice(0, 10);

    const rawAmount = row[amountIdx]?.trim().replace(/[$,+\s]/g, '');
    const amount = parseFloat(rawAmount);
    if (isNaN(amount)) continue;

    const note = noteIdx >= 0 ? row[noteIdx]?.trim() : '';
    const from = fromIdx >= 0 ? row[fromIdx]?.trim() : '';
    const to = toIdx >= 0 ? row[toIdx]?.trim() : '';
    const type = typeIdx >= 0 ? row[typeIdx]?.trim() : '';

    let description = '';
    let finalAmount = amount;

    if (type.toLowerCase() === 'payment') {
      if (from.toLowerCase() === ownerName.toLowerCase()) {
        // Owner paid someone → expense
        description = `To ${to}: "${note}"`;
        finalAmount = Math.abs(amount);
      } else {
        // Someone paid owner → income-ish
        description = `${from}: "${note}"`;
        finalAmount = -Math.abs(amount);
      }
    } else if (type.toLowerCase() === 'charge') {
      if (to.toLowerCase() === ownerName.toLowerCase()) {
        // Owner was charged → expense
        description = `Charge from ${from}: "${note}"`;
        finalAmount = Math.abs(amount);
      } else {
        // Owner charged someone → incoming
        description = `Charge to ${to}: "${note}"`;
        finalAmount = -Math.abs(amount);
      }
    } else {
      // Generic: use the amount sign as-is
      description = note || `${from || to || 'Venmo'} transaction`;
      // Negative amounts in Venmo = money out = expense (positive in our system)
      // Positive amounts = money in = income (negative in our system)
      finalAmount = -amount;
    }

    transactions.push({ date, description, amount: finalAmount, note: note || undefined });
  }

  return transactions;
}
