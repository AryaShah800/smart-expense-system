export type BudgetState = "ok" | "warn" | "over";

/** Progress state for a budget: warn from 80% used, over once spending passes the limit. */
export function budgetState(spent: number, limit: number): BudgetState {
  if (limit <= 0) return "ok";
  if (spent > limit) return "over";
  return spent / limit >= 0.8 ? "warn" : "ok";
}
