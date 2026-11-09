import formatCurrency from "./currencyFormatter";
import type { GroupSplits } from "../types";

/** Balances within a cent of zero count as settled (the API rounds to 2 decimals). */
export const SETTLED_EPSILON = 0.01;

/** One-line status of the signed-in user's position in a group. */
export function summarizeBalance(
  splits: GroupSplits | null | undefined,
  userId: string | undefined,
  currency?: string
): string {
  if (!splits || !userId) return "Loading...";

  const mine = splits.balances?.find((b) => b.userId === userId);
  if (!mine) return "Loading...";

  if (mine.balance < -SETTLED_EPSILON) return `You owe ${formatCurrency(Math.abs(mine.balance), currency)}`;
  if (mine.balance > SETTLED_EPSILON) return `You are owed ${formatCurrency(mine.balance, currency)}`;

  return splits.settlements?.length ? "You are all settled up" : "All settled up ✨";
}
