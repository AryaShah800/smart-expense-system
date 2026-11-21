import type { Transaction } from "../types/models";

export interface CashFlowPoint {
  date: string;
  balance: number;
}

// Running balance, one point per calendar day. Days are keyed by the full date (not the display
// label) so the same month/day in different years never collapses into one point, which would
// move or detach the final point of the line.
export function buildCashFlowSeries(transactions: Transaction[]): CashFlowPoint[] {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const multiYear =
    sorted.length > 1 &&
    new Date(sorted[0]!.date).getFullYear() !== new Date(sorted[sorted.length - 1]!.date).getFullYear();

  let balance = 0;
  const byDay = new Map<string, CashFlowPoint>();
  sorted.forEach((t) => {
    balance += t.type === "income" ? t.amount : -t.amount;
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: multiYear ? "2-digit" : undefined,
    });
    byDay.set(key, { date: label, balance });
  });
  return Array.from(byDay.values());
}
