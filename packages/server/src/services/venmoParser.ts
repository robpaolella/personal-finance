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

    let description: string;
    let finalAmount: number;

    // Build description: combine sender/recipient with note
    const fmtDesc = (name: string, prefix?: string): string => {
      const p = prefix ? `${prefix} ${name}` : name;
      return note ? `${p}: "${note}"` : p;
    };

    if (type.toLowerCase() === 'payment') {
      if (from.toLowerCase() === ownerName.toLowerCase()) {
        description = fmtDesc(to, 'To');
        finalAmount = Math.abs(amount);
      } else {
        description = fmtDesc(from);
        finalAmount = -Math.abs(amount);
      }
    } else if (type.toLowerCase() === 'charge') {
      if (to.toLowerCase() === ownerName.toLowerCase()) {
        description = fmtDesc(from, 'Charge from');
        finalAmount = Math.abs(amount);
      } else {
        description = fmtDesc(to, 'Charge to');
        finalAmount = -Math.abs(amount);
      }
    } else {
      description = note || `${from || to || 'Venmo'} transaction`;
      finalAmount = -amount;
    }

    transactions.push({ date, description, amount: finalAmount, note: note || undefined });
  }

  return transactions;
}
